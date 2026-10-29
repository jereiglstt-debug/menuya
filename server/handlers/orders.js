// Pedidos nativos, mesas y estadísticas del PROPIETARIO (Plan Premium).
// Igual que el resto: todo se filtra por el restaurante de la SESIÓN.
import { HttpError, readJson, json } from '../lib/http.js';
import { requireOwner } from '../lib/auth.js';
import { requireFeature } from '../lib/plans.js';
import { isUuid } from '../lib/validate.js';
import { STATES, METHODS, STATUSES, ACTIVE_STATUSES, canMove, LIMITS } from '../lib/orders.js';

async function ctx(request, db) {
  const c = await requireOwner(request, db);
  requireFeature(c.restaurant, 'pedidos_nativos');
  return c;
}
const own = (rid, id) => ({ id: `eq.${id}`, restaurant_id: `eq.${rid}` });
const needId = (id) => { if (!isUuid(id)) throw new HttpError(400, 'Identificador inválido.'); };

async function ensureOrdering(db, rid) {
  const [row] = await db.rest('restaurant_ordering', { query: { select: '*', restaurant_id: `eq.${rid}` } });
  if (row) return row;
  const [created] = await db.rest('restaurant_ordering', { method: 'POST', returning: true, body: { restaurant_id: rid } });
  return created;
}
const orderingOut = (o) => ({
  state: o.state, accept_mesa: o.accept_mesa, accept_take_away: o.accept_take_away, accept_delivery: o.accept_delivery,
  delivery_fee: Number(o.delivery_fee), payment_methods: o.payment_methods,
});
const listTables = (db, rid) => db.rest('restaurant_tables', { query: { select: 'id,label,active,position', restaurant_id: `eq.${rid}`, order: 'position.asc,created_at.asc' } });

export async function getOrdering({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const [o, tables] = await Promise.all([ensureOrdering(db, r.id), listTables(db, r.id)]);
  return json({ ordering: orderingOut(o), tables });
}

export async function updateOrdering({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const b = await readJson(request); const errors = {}; const out = {};
  if (b.state !== undefined) STATES.includes(b.state) ? (out.state = b.state) : (errors.state = 'Estado inválido.');
  for (const [k, feat] of [['accept_mesa', 'mesas_y_qr_mesa'], ['accept_take_away', 'take_away'], ['accept_delivery', 'delivery']]) {
    if (b[k] === undefined) continue;
    if (typeof b[k] !== 'boolean') { errors[k] = 'Valor inválido.'; continue; }
    if (b[k]) requireFeature(r, feat);
    out[k] = b[k];
  }
  if (b.delivery_fee !== undefined) {
    const n = typeof b.delivery_fee === 'number' ? b.delivery_fee : Number(String(b.delivery_fee).replace(',', '.'));
    Number.isFinite(n) && n >= 0 && n <= 1_000_000 && String(b.delivery_fee).trim() !== '' ? (out.delivery_fee = Math.round(n * 100) / 100) : (errors.delivery_fee = 'Ingresá un costo de envío válido (0 o más).');
  }
  if (b.payment_methods !== undefined) {
    const m = b.payment_methods;
    Array.isArray(m) && m.length >= 1 && new Set(m).size === m.length && m.every((x) => METHODS.includes(x))
      ? (out.payment_methods = m) : (errors.payment_methods = 'Elegí al menos un medio de pago válido.');
  }
  if (Object.keys(errors).length) throw new HttpError(400, 'Revisá los datos.', errors);
  if (!Object.keys(out).length) throw new HttpError(400, 'No hay cambios para guardar.');
  await ensureOrdering(db, r.id);
  const rows = await db.rest('restaurant_ordering', { method: 'PATCH', query: { restaurant_id: `eq.${r.id}` }, body: out, returning: true });
  return json({ ordering: orderingOut(rows[0]) });
}

// ---------------- mesas ----------------
const labelOf = (v) => (typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 30 ? v.trim() : null);

export async function createTables({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  requireFeature(r, 'mesas_y_qr_mesa');
  const b = await readJson(request);
  const existing = await listTables(db, r.id);
  const labels = new Set(existing.map((t) => t.label.toLowerCase()));
  let wanted;
  if (b.count !== undefined) { // "Mesa 1 … Mesa N"
    const n = b.count; const prefix = b.prefix === undefined ? 'Mesa ' : b.prefix;
    if (!Number.isInteger(n) || n < 1 || n > 50 || typeof prefix !== 'string' || prefix.length > 20) throw new HttpError(400, 'Indicá una cantidad de mesas entre 1 y 50.');
    wanted = []; let i = 1;
    while (wanted.length < n && i < 1000) { const l = `${prefix}${i}`.trim(); if (l.length <= 30 && !labels.has(l.toLowerCase())) wanted.push(l); i += 1; }
  } else {
    const l = labelOf(b.label);
    if (!l) throw new HttpError(400, 'Revisá los datos.', { label: 'El nombre de la mesa debe tener entre 1 y 30 caracteres.' });
    if (labels.has(l.toLowerCase())) throw new HttpError(400, 'Revisá los datos.', { label: 'Ya existe una mesa con ese nombre.' });
    wanted = [l];
  }
  if (existing.length + wanted.length > LIMITS.maxTables) throw new HttpError(400, `Podés tener hasta ${LIMITS.maxTables} mesas.`);
  let pos = (existing.at(-1)?.position ?? 0);
  const created = [];
  for (const label of wanted) {
    pos += 1;
    const [t] = await db.rest('restaurant_tables', { method: 'POST', returning: true, body: { restaurant_id: r.id, label, position: pos } });
    created.push({ id: t.id, label: t.label, active: t.active, position: t.position });
  }
  return json({ tables: created }, 201);
}

export async function updateTable({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db); needId(params.id);
  const b = await readJson(request); const out = {};
  if (b.label !== undefined) {
    const l = labelOf(b.label);
    if (!l) throw new HttpError(400, 'Revisá los datos.', { label: 'El nombre de la mesa debe tener entre 1 y 30 caracteres.' });
    const dup = (await listTables(db, r.id)).some((t) => t.id !== params.id && t.label.toLowerCase() === l.toLowerCase());
    if (dup) throw new HttpError(400, 'Revisá los datos.', { label: 'Ya existe una mesa con ese nombre.' });
    out.label = l;
  }
  if (b.active !== undefined) { if (typeof b.active !== 'boolean') throw new HttpError(400, 'Valor inválido.'); out.active = b.active; }
  if (!Object.keys(out).length) throw new HttpError(400, 'No hay cambios para guardar.');
  const rows = await db.rest('restaurant_tables', { method: 'PATCH', query: own(r.id, params.id), body: out, returning: true });
  if (!rows.length) throw new HttpError(404, 'Mesa no encontrada.');
  return json({ table: { id: rows[0].id, label: rows[0].label, active: rows[0].active } });
}

// Si la mesa ya tuvo pedidos no se borra (se conserva el historial): se desactiva.
export async function deleteTable({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db); needId(params.id);
  const [t] = await db.rest('restaurant_tables', { query: { select: 'id', ...own(r.id, params.id) } });
  if (!t) throw new HttpError(404, 'Mesa no encontrada.');
  const used = await db.rest('orders', { query: { select: 'id', table_id: `eq.${t.id}`, restaurant_id: `eq.${r.id}`, limit: '1' } });
  if (used.length) {
    await db.rest('restaurant_tables', { method: 'PATCH', query: own(r.id, t.id), body: { active: false } });
    return json({ ok: true, archived: true });
  }
  await db.rest('restaurant_tables', { method: 'DELETE', query: own(r.id, t.id) });
  return json({ ok: true, archived: false });
}

// ---------------- pedidos ----------------
const orderOut = (o, items, history) => ({
  id: o.id, number: o.number, type: o.type, status: o.status, table_label: o.table_label,
  customer_name: o.customer_name, customer_phone: o.customer_phone, address: o.address, note: o.note,
  payment_method: o.payment_method, subtotal: Number(o.subtotal), delivery_fee: Number(o.delivery_fee), total: Number(o.total),
  created_at: o.created_at,
  items: items.filter((i) => i.order_id === o.id).map((i) => ({ name: i.name, unit_price: Number(i.unit_price), qty: i.qty })),
  history: history.filter((h) => h.order_id === o.id).map((h) => ({ status: h.status, at: h.created_at })),
});

export async function listOrders({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const scope = new URL(request.url).searchParams.get('scope') === 'history' ? 'history' : 'active';
  let rows = await db.rest('orders', { query: { select: '*', restaurant_id: `eq.${r.id}`, order: 'created_at.desc', limit: '300' } });
  rows = rows.filter((o) => ACTIVE_STATUSES.includes(o.status) === (scope === 'active'));
  if (scope === 'history') rows = rows.slice(0, 60);
  if (scope === 'active') rows.reverse(); // más viejo primero: es el que hay que atender antes
  const ids = rows.map((o) => o.id);
  let items = []; let history = [];
  if (ids.length) {
    const inList = `in.(${ids.join(',')})`;
    [items, history] = await Promise.all([
      db.rest('order_items', { query: { select: 'order_id,name,unit_price,qty', restaurant_id: `eq.${r.id}`, order_id: inList } }),
      db.rest('order_status_history', { query: { select: 'order_id,status,created_at', restaurant_id: `eq.${r.id}`, order_id: inList, order: 'id.asc' } }),
    ]);
  }
  return json({ orders: rows.map((o) => orderOut(o, items, history)) }, 200, { 'cache-control': 'no-store' });
}

export async function setOrderStatus({ request, db, params }) {
  const { user, restaurant: r } = await ctx(request, db); needId(params.id);
  const { status } = await readJson(request);
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Estado inválido.');
  const [o] = await db.rest('orders', { query: { select: 'id,status', ...own(r.id, params.id) } });
  if (!o) throw new HttpError(404, 'Pedido no encontrado.');
  if (!canMove(o.status, status)) throw new HttpError(409, 'Ese cambio de estado no es válido para este pedido.');
  await db.rpc('set_order_status', { p_restaurant: r.id, p_order: o.id, p_to: status, p_actor: user.id });
  return json({ ok: true });
}

// ---------------- estadísticas básicas ----------------
const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(d);

export async function stats({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  requireFeature(r, 'estadisticas');
  const days = [7, 30, 90].includes(Number(new URL(request.url).searchParams.get('days'))) ? Number(new URL(request.url).searchParams.get('days')) : 7;
  const since = new Date(Date.now() - days * 86400000);
  const orders = (await db.rest('orders', { query: { select: 'id,status,type,total,created_at', restaurant_id: `eq.${r.id}`, created_at: `gte.${since.toISOString()}`, order: 'created_at.desc', limit: '5000' } }))
    .filter((o) => new Date(o.created_at) >= since);
  const items = (await db.rest('order_items', { query: { select: 'order_id,name,qty', restaurant_id: `eq.${r.id}`, created_at: `gte.${since.toISOString()}`, limit: '20000' } }));
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  const byType = { mesa: 0, take_away: 0, delivery: 0 };
  const perDay = new Map();
  let revenue = 0; let delivered = 0;
  for (const o of orders) {
    byStatus[o.status] += 1;
    if (o.status === 'cancelado') continue;
    byType[o.type] += 1;
    const k = dayKey(new Date(o.created_at)); perDay.set(k, (perDay.get(k) || 0) + 1);
    if (o.status === 'entregado') { revenue += Number(o.total); delivered += 1; }
  }
  const valid = new Set(orders.filter((o) => o.status !== 'cancelado').map((o) => o.id));
  const top = new Map();
  for (const i of items) if (valid.has(i.order_id)) top.set(i.name, (top.get(i.name) || 0) + i.qty);
  return json({
    days, total_orders: orders.length, by_status: byStatus, by_type: byType,
    revenue_delivered: Math.round(revenue * 100) / 100, delivered,
    avg_ticket: delivered ? Math.round((revenue / delivered) * 100) / 100 : 0,
    per_day: [...perDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, orders]) => ({ day, orders })),
    top_products: [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, qty]) => ({ name, qty })),
  }, 200, { 'cache-control': 'no-store' });
}
