// Pedidos del cliente (sin sesión). Defensas: plan Premium y estado del local
// verificados acá, precios tomados del menú PUBLICADO, límites por contacto y
// por local, y campo trampa. Es anti-abuso básico, NO un sistema antifraude:
// conviene sumar reglas de rate-limit de Cloudflare (ver README).
import { json, HttpError, readJson } from '../lib/http.js';
import { isSlugFormat, isUuid } from '../lib/validate.js';
import { hasFeature } from '../lib/plans.js';
import { paymentsView } from '../lib/payments.js';
import {
  orderingView, validateOrderInput, normalizeItems, priceItems, newToken, LIMITS, ACTIVE_STATUSES,
} from '../lib/orders.js';

async function loadRestaurant(db, slug) {
  if (!isSlugFormat(slug)) throw new HttpError(404, 'Local no disponible.');
  const [r] = await db.rest('restaurants', { query: { select: 'id,status,plan,name', slug: `eq.${slug}` } });
  if (!r || r.status !== 'activo') throw new HttpError(404, 'Local no disponible.');
  return r;
}
export async function findTable(db, rid, id) {
  if (!isUuid(id)) return null;
  const [t] = await db.rest('restaurant_tables', { query: { select: 'id,label,active', id: `eq.${id}`, restaurant_id: `eq.${rid}` } });
  return t && t.active ? t : null;
}

export async function createOrder({ request, db, params }) {
  const r = await loadRestaurant(db, params.id);
  if (!hasFeature(r.plan, 'pedidos_nativos')) throw new HttpError(403, 'Este local no recibe pedidos por acá.');
  const [row] = await db.rest('restaurant_ordering', { query: { select: '*', restaurant_id: `eq.${r.id}` } });
  const body = await readJson(request);
  if (body && body.website) throw new HttpError(400, 'Pedido inválido.'); // campo trampa para bots
  const [payRow] = await db.rest('restaurant_payment_settings', { query: { select: 'methods,combo_options', restaurant_id: `eq.${r.id}` } });
  const table = await findTable(db, r.id, body?.table_id);
  const view = orderingView(row, r.plan, table, paymentsView(payRow));
  if (!view) throw new HttpError(403, 'Este local no recibe pedidos por acá.');
  if (view.state === 'pausado') throw new HttpError(409, 'El local pausó los pedidos por un momento. Probá de nuevo en un rato.');
  if (view.state !== 'abierto') throw new HttpError(409, 'El local no está recibiendo pedidos ahora.');

  const v = validateOrderInput(body, view);
  if (!v.ok) throw new HttpError(400, 'Revisá los datos del pedido.', v.errors);
  const n = normalizeItems(body.items);
  if (n.error) throw new HttpError(400, n.error);

  const [ver] = await db.rest('menu_versions', { query: { select: 'snapshot', restaurant_id: `eq.${r.id}`, order: 'version.desc', limit: '1' } });
  if (!ver) throw new HttpError(409, 'El menú todavía no está publicado.');
  const priced = priceItems(n.lines, ver.snapshot);
  if (priced.error) throw new HttpError(409, priced.error);
  const subtotal = priced.items.reduce((s, i) => s + i.price * i.qty, 0);
  if (subtotal + view.fee > LIMITS.maxTotal) throw new HttpError(400, 'El total del pedido es demasiado alto.');

  // Anti-abuso: pedidos pendientes por contacto/mesa y por local.
  const pending = (await db.rest('orders', { query: { select: 'customer_phone,table_id', restaurant_id: `eq.${r.id}`, status: 'eq.nuevo', limit: '500' } }));
  if (pending.length >= LIMITS.pendingPerRestaurant) throw new HttpError(429, 'El local tiene muchos pedidos sin atender. Probá más tarde.');
  const same = pending.filter((o) => (v.value.customer_phone && o.customer_phone === v.value.customer_phone) || (v.value.table_id && o.table_id === v.value.table_id)).length;
  if (same >= LIMITS.pendingPerContact) throw new HttpError(429, 'Ya tenés pedidos esperando respuesta del local. Esperá a que los atiendan.');

  const token = newToken();
  const created = await db.rpc('create_order', {
    p_restaurant: r.id, p_type: v.value.type, p_table: v.value.table_id ?? null,
    p_name: v.value.customer_name, p_phone: v.value.customer_phone, p_address: v.value.address,
    p_note: v.value.note, p_payment: v.value.payment_method, p_combo: v.value.payment_combo, p_fee: view.fee, p_items: priced.items, p_token: token,
  });
  const total = subtotal + (v.value.type === 'delivery' ? view.fee : 0);
  return json({ order: { number: created.number, tracking_token: token, total, status: 'nuevo' } }, 201, { 'cache-control': 'no-store' });
}

export async function trackOrder({ db, params }) {
  const r = await loadRestaurant(db, params.id);
  const token = params.id2;
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token || '')) throw new HttpError(404, 'Pedido no encontrado.');
  const [o] = await db.rest('orders', { query: { select: 'id,number,status,type,table_label,subtotal,delivery_fee,total,created_at', tracking_token: `eq.${token}`, restaurant_id: `eq.${r.id}` } });
  if (!o) throw new HttpError(404, 'Pedido no encontrado.');
  const [items, history] = await Promise.all([
    db.rest('order_items', { query: { select: 'name,unit_price,qty', order_id: `eq.${o.id}`, restaurant_id: `eq.${r.id}` } }),
    db.rest('order_status_history', { query: { select: 'status,created_at', order_id: `eq.${o.id}`, restaurant_id: `eq.${r.id}`, order: 'id.asc' } }),
  ]);
  // Lista blanca explícita: nunca se devuelven nombre, teléfono, dirección ni ids internos.
  return json({ order: {
    number: o.number, status: o.status, type: o.type, table_label: o.table_label,
    subtotal: Number(o.subtotal), delivery_fee: Number(o.delivery_fee), total: Number(o.total), created_at: o.created_at,
    items: items.map((i) => ({ name: i.name, unit_price: Number(i.unit_price), qty: i.qty })),
    history: history.map((h) => ({ status: h.status, created_at: h.created_at })),
    active: ACTIVE_STATUSES.includes(o.status), restaurant: r.name,
  } }, 200, { 'cache-control': 'no-store' });
}
