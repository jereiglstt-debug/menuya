import { HttpError, readJson, json } from '../lib/http.js';
import { requireAdmin } from '../lib/auth.js';
import { isUuid, EMAIL_RE, validateRestaurantInput, validatePaymentInput } from '../lib/validate.js';

const RESTAURANT_SELECT =
  'id,slug,name,description,plan,status,created_at,restaurant_owners(email),' +
  'subscriptions(plan,starts_on,expires_on)';

function today() {
  // Fecha local de Argentina (UTC-3), para que "vencido" coincida con la realidad.
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export function accountState(r, now = today()) {
  if (r.status === 'suspendido') return 'suspendido';
  const subs = r.subscriptions || [];
  if (!subs.length) return 'sin_suscripcion';
  const latest = subs.map((s) => s.expires_on).sort().at(-1);
  return latest < now ? 'vencido' : 'activo';
}

function shape(r) {
  const subs = [...(r.subscriptions || [])].sort((a, b) => (a.expires_on < b.expires_on ? 1 : -1));
  return {
    id: r.id, slug: r.slug, name: r.name, description: r.description,
    plan: r.plan, status: r.status, created_at: r.created_at,
    owner_email: r.restaurant_owners?.email ?? r.restaurant_owners?.[0]?.email ?? null,
    estado_cuenta: accountState(r),
    suscripcion: subs[0] ?? null,
  };
}

async function audit(db, actor, action, restaurantId, details = {}) {
  // Nunca registrar enlaces, tokens ni contraseñas.
  await db.rest('audit_log', {
    method: 'POST',
    body: { actor_id: actor.id, action, restaurant_id: restaurantId, details },
  });
}

async function getRestaurant(db, id) {
  if (!isUuid(id)) throw new HttpError(400, 'Identificador inválido.');
  const rows = await db.rest('restaurants', { query: { select: RESTAURANT_SELECT, id: `eq.${id}` } });
  if (!rows?.length) throw new HttpError(404, 'Restaurante no encontrado.');
  return rows[0];
}

export async function listRestaurants({ request, db }) {
  await requireAdmin(request, db);
  const rows = await db.rest('restaurants', {
    query: { select: RESTAURANT_SELECT, order: 'created_at.desc', limit: '500' },
  });
  return json({ restaurants: rows.map(shape) });
}

export async function getRestaurantDetail({ request, db, params }) {
  await requireAdmin(request, db);
  const r = await getRestaurant(db, params.id);
  const payments = await db.rest('payments', {
    query: { select: '*', restaurant_id: `eq.${r.id}`, order: 'paid_on.desc,created_at.desc', limit: '100' },
  });
  return json({ restaurant: shape(r), payments });
}

// Crear restaurante + invitar propietario. Si algún paso falla se deshace
// lo anterior para no dejar cuentas a medias.
export async function createRestaurant({ request, db, env }) {
  const admin = await requireAdmin(request, db);
  const v = validateRestaurantInput(await readJson(request));
  if (!v.ok) throw new HttpError(400, 'Revisá los datos ingresados.', v.errors);
  const { owner_email, ...fields } = v.value;

  const [restaurant] = await db.rest('restaurants', { method: 'POST', body: fields, returning: true })
    .catch((e) => {
      if (e.status === 409) throw new HttpError(409, 'Esa dirección ya está en uso.', { slug: 'Ya existe un restaurante con esa dirección.' });
      throw e;
    });

  let userId;
  try {
    const redirect = `${env.SITE_URL}/establecer-contrasena.html`;
    const out = await db.generateLink('invite', owner_email, redirect);
    userId = out.userId;
    await db.rest('restaurant_owners', {
      method: 'POST', body: { restaurant_id: restaurant.id, user_id: userId, email: owner_email },
    });
    await audit(db, admin, 'restaurante_creado', restaurant.id, { slug: restaurant.slug, plan: restaurant.plan });
    return json({ restaurant: shape({ ...restaurant, restaurant_owners: [{ email: owner_email }], subscriptions: [] }), invite_link: out.link }, 201);
  } catch (err) {
    if (userId) await db.deleteUser(userId).catch(() => {});
    await db.rest('restaurants', { method: 'DELETE', query: { id: `eq.${restaurant.id}` } }).catch(() => {});
    throw err;
  }
}

export async function updateRestaurant({ request, db, params }) {
  const admin = await requireAdmin(request, db);
  const before = await getRestaurant(db, params.id);
  const body = await readJson(request);
  if ('slug' in body) throw new HttpError(400, 'La dirección URL no se puede cambiar: rompería los QR ya impresos.');
  const v = validateRestaurantInput(body, { partial: true });
  if (!v.ok) throw new HttpError(400, 'Revisá los datos ingresados.', v.errors);
  const changes = v.value;
  if (!Object.keys(changes).length) throw new HttpError(400, 'No hay cambios para guardar.');

  const [updated] = await db.rest('restaurants', {
    method: 'PATCH', query: { id: `eq.${before.id}` }, body: changes, returning: true,
  });
  if ('plan' in changes && changes.plan !== before.plan) {
    await audit(db, admin, 'plan_cambiado', before.id, { de: before.plan, a: changes.plan });
  }
  if ('status' in changes && changes.status !== before.status) {
    await audit(db, admin, changes.status === 'suspendido' ? 'cuenta_suspendida' : 'cuenta_reactivada', before.id);
  }
  if ('name' in changes || 'description' in changes) {
    await audit(db, admin, 'datos_editados', before.id, { campos: Object.keys(changes).filter((k) => k === 'name' || k === 'description') });
  }
  const fresh = await getRestaurant(db, updated.id);
  return json({ restaurant: shape(fresh) });
}

export async function registerPayment({ request, db, params }) {
  const admin = await requireAdmin(request, db);
  const r = await getRestaurant(db, params.id);
  const v = validatePaymentInput(await readJson(request));
  if (!v.ok) throw new HttpError(400, 'Revisá los datos del pago.', v.errors);
  const p = v.value;
  const id = await db.rpc('admin_register_payment', {
    p_actor: admin.id, p_restaurant: r.id, p_plan: p.plan, p_amount: p.amount_ars,
    p_paid_on: p.paid_on, p_method: p.method, p_note: p.note,
    p_starts_on: p.starts_on, p_expires_on: p.expires_on,
  });
  return json({ payment_id: id }, 201);
}

// Reenvío de invitación o recuperación de acceso. El enlace se muestra una
// sola vez al administrador y no se guarda en ninguna parte.
export async function accessLink({ request, db, env, params }) {
  const admin = await requireAdmin(request, db);
  const r = await getRestaurant(db, params.id);
  const body = await readJson(request);
  if (!['invite', 'recovery'].includes(body.type)) throw new HttpError(400, 'Tipo de enlace inválido.');
  const email = r.restaurant_owners?.[0]?.email ?? r.restaurant_owners?.email;
  if (!email) throw new HttpError(409, 'Este restaurante no tiene propietario asignado.');
  const redirect = `${env.SITE_URL}/establecer-contrasena.html`;
  // Si ya aceptó la invitación, 'invite' falla con 409: usar 'recovery'.
  const { link } = await db.generateLink(body.type, email, redirect);
  await audit(db, admin, body.type === 'invite' ? 'invitacion_generada' : 'recuperacion_generada', r.id);
  return json({ link, email });
}

// Cambiar el correo con el que se registró al propietario.
export async function changeOwnerEmail({ request, db, params }) {
  const admin = await requireAdmin(request, db);
  const r = await getRestaurant(db, params.id);
  const body = await readJson(request);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 254) {
    throw new HttpError(400, 'Revisá los datos ingresados.', { email: 'Ingresá un correo electrónico válido.' });
  }
  const [owner] = await db.rest('restaurant_owners', { query: { select: 'user_id,email', restaurant_id: `eq.${r.id}` } });
  if (!owner) throw new HttpError(409, 'Este restaurante no tiene propietario asignado.');
  if (owner.email === email) throw new HttpError(400, 'Ese ya es el correo del propietario.', { email: 'Es el mismo correo actual.' });
  await db.updateUserEmail(owner.user_id, email);
  await db.rest('restaurant_owners', { method: 'PATCH', query: { restaurant_id: `eq.${r.id}` }, body: { email } });
  await audit(db, admin, 'correo_propietario_cambiado', r.id, { anterior: owner.email, nuevo: email });
  return json({ email });
}

// Eliminar un restaurante y TODO lo suyo. Irreversible: exige escribir la dirección (slug).
export async function deleteRestaurant({ request, db, params }) {
  const admin = await requireAdmin(request, db);
  const r = await getRestaurant(db, params.id);
  const body = await readJson(request);
  if (body.confirm_slug !== r.slug) {
    throw new HttpError(400, 'Escribí la dirección del restaurante para confirmar.', { confirm_slug: 'No coincide con la dirección.' });
  }
  const q = { select: '*', restaurant_id: `eq.${r.id}` };
  const [products, settings, versions, pending, owners] = await Promise.all([
    db.rest('products', { query: q }), db.rest('menu_settings', { query: q }),
    db.rest('menu_versions', { query: q }), db.rest('pending_image_deletes', { query: q }),
    db.rest('restaurant_owners', { query: { select: 'user_id', restaurant_id: `eq.${r.id}` } }),
  ]);
  // Todas las imágenes del restaurante viven bajo "<id>/": las tomamos de borrador, versiones y pendientes.
  const prefix = `${r.id}/`;
  const paths = new Set();
  for (const m of JSON.stringify([products, settings, versions, pending]).matchAll(/"([^"\\]+)"/g)) {
    if (m[1].startsWith(prefix)) paths.add(m[1]);
  }

  await db.rest('restaurants', { method: 'DELETE', query: { id: `eq.${r.id}` } }); // cascada: menú, pedidos, mesas, pagos…
  await audit(db, admin, 'restaurante_eliminado', null, {
    slug: r.slug, nombre: r.name, plan: r.plan, propietario: r.restaurant_owners?.[0]?.email ?? null,
  });

  const problems = [];
  for (const o of owners) {
    const isAdmin = await db.rest('platform_admins', { query: { select: 'user_id', user_id: `eq.${o.user_id}` } });
    if (isAdmin?.length) continue; // nunca borrar una cuenta de administrador
    try { await db.deleteUser(o.user_id); } catch { problems.push('cuenta del propietario'); }
  }
  try { await db.storageDelete([...paths]); } catch { problems.push('imágenes'); }
  return json({ deleted: true, imagenes: paths.size, avisos: problems });
}

export async function listAudit({ request, db }) {
  await requireAdmin(request, db);
  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 200);
  const rows = await db.rest('audit_log', {
    query: { select: 'id,action,restaurant_id,details,created_at,restaurants(name,slug)', order: 'id.desc', limit: String(limit) },
  });
  return json({ events: rows });
}
