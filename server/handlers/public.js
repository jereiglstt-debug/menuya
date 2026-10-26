import { json, HttpError } from '../lib/http.js';
import { authenticate } from '../lib/auth.js';
import { featuresFor } from '../lib/plans.js';

// Configuración PÚBLICA que necesita el navegador (la clave anon es pública
// por diseño; la service_role nunca sale del servidor).
export async function config({ env, request }) {
  // Nombra las variables que faltan (nunca sus valores).
  const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SITE_URL'].filter((k) => !String(env[k] ?? '').trim());
  let origin = null;
  try { origin = new URL(String(env.SUPABASE_URL).trim()).origin; } catch { /* inválida */ }
  // SUPABASE_URL no puede ser la dirección del propio sitio (error común al editar variables).
  if (origin && origin === new URL(request.url).origin) {
    return json({ error: 'config_incompleta', missing: ['SUPABASE_URL (apunta a este mismo sitio; debe ser la dirección de Supabase, https://xxxx.supabase.co)'] }, 500);
  }
  if (missing.length || !origin) {
    return json({ error: 'config_incompleta', missing: missing.length ? missing : ['SUPABASE_URL (no es una URL válida)'] }, 500);
  }
  return json({ supabaseUrl: origin, supabaseAnonKey: env.SUPABASE_ANON_KEY });
}

// Mantiene activo el proyecto gratuito de Supabase (evita la pausa por inactividad).
export async function health({ db }) {
  await db.rest('restaurants', { query: { select: 'id', limit: '1' } });
  return json({ ok: true });
}

// Quién soy: rol y, si es propietario, su restaurante y funciones de su plan.
export async function me({ request, db }) {
  const user = await authenticate(request, db);
  const admins = await db.rest('platform_admins', { query: { select: 'user_id', user_id: `eq.${user.id}` } });
  if (admins.length) return json({ role: 'admin', email: user.email });
  const owners = await db.rest('restaurant_owners', {
    query: { select: 'restaurants(id,slug,name,plan,status)', user_id: `eq.${user.id}` },
  });
  if (!owners.length) throw new HttpError(403, 'Tu cuenta no está asociada a ningún restaurante.');
  const r = owners[0].restaurants;
  return json({ role: 'owner', email: user.email, restaurant: r, features: featuresFor(r.plan) });
}
