// Reglas de pedidos nativos (Plan Premium). Todo lo que importa (plan, estado
// del local, precios, mesas, transiciones) se decide ACÁ, en el servidor.
import { hasFeature } from './plans.js';
import { isUuid } from './validate.js';

export const STATES = ['abierto', 'pausado', 'cerrado'];
export const TYPES = ['mesa', 'take_away', 'delivery'];
export const METHODS = ['efectivo', 'transferencia', 'tarjeta'];
export const METHOD_LABELS = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta (al recibir o en el local)' };
export const STATUSES = ['nuevo', 'en_preparacion', 'listo', 'entregado', 'cancelado'];
export const ACTIVE_STATUSES = ['nuevo', 'en_preparacion', 'listo'];
export const TRANSITIONS = {
  nuevo: ['en_preparacion', 'cancelado'],
  en_preparacion: ['listo', 'cancelado'],
  listo: ['entregado', 'cancelado'],
  entregado: [], cancelado: [],
};
export const LIMITS = { maxLines: 40, maxQty: 20, maxTotal: 10_000_000, maxTables: 100, pendingPerContact: 3, pendingPerRestaurant: 100 };

const TYPE_FEATURE = { mesa: 'mesas_y_qr_mesa', take_away: 'take_away', delivery: 'delivery' };

// Lo que ve el menú público. null = este local no ofrece pedidos por acá.
export function orderingView(row, plan, table) {
  if (!row || !hasFeature(plan, 'pedidos_nativos')) return null;
  const types = [];
  if (row.accept_mesa && table && hasFeature(plan, TYPE_FEATURE.mesa)) types.push('mesa');
  if (row.accept_take_away && hasFeature(plan, TYPE_FEATURE.take_away)) types.push('take_away');
  if (row.accept_delivery && hasFeature(plan, TYPE_FEATURE.delivery)) types.push('delivery');
  if (!types.length) return null;
  return {
    state: row.state, types, fee: Number(row.delivery_fee) || 0, methods: row.payment_methods,
    table: table ? { id: table.id, label: table.label } : null,
  };
}

const clean = (v, max) => (typeof v === 'string' ? v.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, max + 1) : null);
function text(errors, key, v, { min = 0, max, msg }) {
  const t = clean(v ?? '', max);
  if (t === null || t.length > max || t.length < min) { errors[key] = msg; return ''; }
  return t;
}

export function normalizePhone(v) {
  if (typeof v !== 'string' || !/^\+?[0-9\s().-]{6,25}$/.test(v.trim())) return null;
  const d = v.replace(/\D/g, '');
  return d.length >= 6 && d.length <= 15 ? d : null;
}

// Valida los DATOS del pedido (los ítems se validan aparte contra el menú publicado).
export function validateOrderInput(b, view) {
  const errors = {}; const out = {};
  if (!b || typeof b !== 'object') return { ok: false, errors: { _: 'Pedido inválido.' }, value: {} };
  if (!TYPES.includes(b.type) || !view.types.includes(b.type)) errors.type = 'Elegí una forma de pedido válida.';
  else out.type = b.type;

  out.customer_name = text(errors, 'customer_name', b.customer_name, { max: 60, min: out.type && out.type !== 'mesa' ? 2 : 0, msg: 'Escribí tu nombre (hasta 60 letras).' });
  out.note = text(errors, 'note', b.note, { max: 300, msg: 'Las aclaraciones pueden tener hasta 300 caracteres.' });
  out.customer_phone = ''; out.address = '';
  if (out.type === 'take_away' || out.type === 'delivery') {
    const ph = normalizePhone(b.customer_phone);
    if (!ph) errors.customer_phone = 'Ingresá un teléfono válido para avisarte.'; else out.customer_phone = ph;
  } else if (b.customer_phone) {
    out.customer_phone = normalizePhone(b.customer_phone) || '';
  }
  if (out.type === 'delivery') out.address = text(errors, 'address', b.address, { min: 5, max: 200, msg: 'Ingresá la dirección de entrega (entre 5 y 200 caracteres).' });

  if (b.payment_method === undefined || b.payment_method === null || b.payment_method === '') {
    if (out.type === 'take_away' || out.type === 'delivery') errors.payment_method = 'Elegí cómo vas a pagar.';
    out.payment_method = null;
  } else if (!view.methods.includes(b.payment_method)) errors.payment_method = 'Ese medio de pago no está disponible.';
  else out.payment_method = b.payment_method;

  if (out.type === 'mesa') {
    if (!view.table || b.table_id !== view.table.id) errors.table_id = 'Escaneá de nuevo el QR de tu mesa.';
    else out.table_id = view.table.id;
  }
  return { ok: !Object.keys(errors).length, errors, value: out };
}

// Une líneas repetidas y exige ids válidos y cantidades enteras 1..20.
export function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length) return { error: 'Agregá al menos un producto.' };
  const map = new Map();
  for (const it of items) {
    if (!it || !isUuid(it.id) || !Number.isInteger(it.qty) || it.qty < 1 || it.qty > LIMITS.maxQty) return { error: 'Hay un producto con datos inválidos.' };
    map.set(it.id, Math.min(LIMITS.maxQty, (map.get(it.id) || 0) + it.qty));
  }
  if (map.size > LIMITS.maxLines) return { error: `El pedido puede tener hasta ${LIMITS.maxLines} productos distintos.` };
  return { lines: [...map.entries()].map(([id, qty]) => ({ id, qty })) };
}

// Precios y disponibilidad: SIEMPRE del menú publicado.
export function priceItems(lines, snapshot) {
  const catalog = new Map();
  for (const c of snapshot.categories || []) for (const p of c.products || []) catalog.set(p.id, p);
  const items = [];
  for (const { id, qty } of lines) {
    const p = catalog.get(id);
    if (!p) return { error: 'Un producto ya no está en el menú. Recargá la página.' };
    if (!p.available) return { error: `“${p.name}” está agotado.` };
    items.push({ product_id: id, name: p.name, price: Number(p.price_ars), qty });
  }
  return { items };
}

export const canMove = (from, to) => (TRANSITIONS[from] || []).includes(to);

export function newToken() {
  const b = new Uint8Array(18); crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_'); // 24 caracteres URL-safe
}
