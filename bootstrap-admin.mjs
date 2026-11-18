#!/usr/bin/env node
// Crea la cuenta del administrador principal SIN contraseña predeterminada.
// El script genera un enlace de invitación de un solo uso: abrilo y elegí
// tu propia contraseña. Ninguna contraseña pasa por variables ni archivos.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SITE_URL=... \
//   ADMIN_EMAIL=vos@correo.com node scripts/bootstrap-admin.mjs
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL, ADMIN_EMAIL } = process.env;
for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL, ADMIN_EMAIL })) {
  if (!v) { console.error(`Falta la variable ${k}.`); process.exit(1); }
}
if (/TU-PROYECTO|xxxx/i.test(SITE_URL)) { console.error('SITE_URL todavía tiene el texto de ejemplo. Usá la dirección real de tu sitio (https://....pages.dev).'); process.exit(1); }
let base;
try { base = new URL(SUPABASE_URL.trim()).origin; } catch { console.error('SUPABASE_URL no es una URL válida. Debe ser como https://xxxx.supabase.co'); process.exit(1); }
if (base !== SUPABASE_URL.trim().replace(/\/$/, '')) console.error(`Aviso: SUPABASE_URL tenía una ruta extra; uso solo ${base}`);
// Claves nuevas (sb_secret_...): solo en "apikey". Claves legacy (JWT): también como Bearer.
const headers = { apikey: SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' };
if (SUPABASE_SERVICE_ROLE_KEY.split('.').length === 3) headers.authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;

const existing = await fetch(`${base}/rest/v1/platform_admins?select=user_id&limit=1`, { headers });
if (!existing.ok) {
  const d = await existing.json().catch(() => ({}));
  console.error(`No se pudo consultar la base. HTTP ${existing.status} · código: ${d.code || '-'} · ${d.message || d.msg || d.error || ''}`);
  const hint = {
    PGRST205: 'La tabla platform_admins no existe: ejecutá la migración 0001 completa en el SQL Editor de Supabase.',
    42501: 'Permiso denegado: la clave usada no es la secreta (service_role / sb_secret_...). Revisá que no sea la anon/publishable.',
  }[d.code];
  if (existing.status === 401 || existing.status === 403) console.error('Pista: revisá que SUPABASE_SERVICE_ROLE_KEY sea la clave SECRETA y esté completa, sin comillas ni espacios.');
  if (existing.status === 404 && !d.code) console.error(`Pista: revisá SUPABASE_URL (debe ser https://xxxx.supabase.co, sin /rest/v1). Valor actual: ${base}`);
  if (hint) console.error('Pista:', hint);
  process.exit(1);
}
if ((await existing.json()).length) {
  console.error('Ya existe un administrador. Este script solo sirve para el primer ingreso.');
  console.error('Si necesitás un enlace nuevo para elegir tu contraseña, ejecutá: node scripts/admin-link.mjs (mismas variables).');
  process.exit(1);
}

const gen = await fetch(`${base}/auth/v1/admin/generate_link`, {
  method: 'POST', headers,
  body: JSON.stringify({ type: 'invite', email: ADMIN_EMAIL.trim().toLowerCase(), redirect_to: `${SITE_URL}/establecer-contrasena.html` }),
});
const out = await gen.json();
if (!gen.ok) { console.error('No se pudo generar la invitación:', out.msg || out.message || gen.status); process.exit(1); }

const ins = await fetch(`${base}/rest/v1/platform_admins`, { method: 'POST', headers, body: JSON.stringify({ user_id: out.id }) });
if (!ins.ok) {
  await fetch(`${base}/auth/v1/admin/users/${out.id}`, { method: 'DELETE', headers });
  console.error('No se pudo registrar al administrador; se deshizo la operación.'); process.exit(1);
}
console.log('\nAdministrador creado. Abrí este enlace (un solo uso) para elegir tu contraseña:\n');
console.log(out.action_link, '\n');
console.log('No compartas ni guardes este enlace. Después ingresá en:', `${SITE_URL}/admin/`);
