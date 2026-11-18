import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from './world.js';
import { canMove, newToken, orderingView, normalizeItems } from '../server/lib/orders.js';

async function setup({ open = true } = {}) {
  const w = makeWorld();
  const tP = w.addUser('prem'); const tQ = w.addUser('prem2'); const tPro = w.addUser('pro');
  const P = w.addRestaurant('res-prem', 'prem', { plan: 'premium' });
  const Q = w.addRestaurant('res-prem2', 'prem2', { plan: 'premium' });
  const PRO = w.addRestaurant('res-pro', 'pro', { plan: 'profesional' });
  const cat = (await w.call(tP, 'POST', '/owner/categories', { name: 'Pizzas' })).body.category;
  const muzza = (await w.call(tP, 'POST', '/owner/products', { category_id: cat.id, name: 'Muzza', price_ars: 9500 })).body.product;
  const agotado = (await w.call(tP, 'POST', '/owner/products', { category_id: cat.id, name: 'Agotada', price_ars: 100, available: false })).body.product;
  const fuga = (await w.call(tP, 'POST', '/owner/products', { category_id: cat.id, name: 'Fugazza', price_ars: 8000 })).body.product;
  await w.call(tP, 'POST', '/owner/publish');
  if (open) {
    await w.call(tP, 'PATCH', '/owner/ordering', { state: 'abierto', accept_delivery: true, delivery_fee: 1500 });
    await w.call(tP, 'PATCH', '/owner/payments', { methods: ['efectivo', 'debito', 'combinado'], combo_options: ['efectivo', 'debito'] });
  }
  return { w, tP, tQ, tPro, P, Q, PRO, muzza, agotado, fuga };
}
const order = (w, slug, body) => w.call(null, 'POST', `/public/orders/${slug}`, body);
const take = (items, extra = {}) => ({ type: 'take_away', customer_name: 'Ana', customer_phone: '+54 9 11 2233-4455', payment_method: 'efectivo', items, ...extra });

test('reglas puras: transiciones, token, items', () => {
  assert.ok(canMove('nuevo', 'en_preparacion') && canMove('listo', 'entregado') && canMove('nuevo', 'cancelado'));
  assert.ok(!canMove('nuevo', 'listo') && !canMove('entregado', 'cancelado') && !canMove('cancelado', 'nuevo'));
  assert.match(newToken(), /^[A-Za-z0-9_-]{24}$/); assert.notEqual(newToken(), newToken());
  assert.equal(orderingView(null, 'premium', null), null);
  assert.equal(orderingView({ accept_mesa: true, accept_take_away: false, accept_delivery: false, state: 'abierto', delivery_fee: 0 }, 'premium', null), null, 'solo mesa y sin mesa → no hay pedidos');
  assert.ok(normalizeItems([{ id: 'x', qty: 1 }]).error);
  const id = crypto.randomUUID();
  assert.deepEqual(normalizeItems([{ id, qty: 2 }, { id, qty: 3 }]).lines, [{ id, qty: 5 }]);
  assert.ok(normalizeItems([{ id, qty: 21 }]).error && normalizeItems([{ id, qty: 1.5 }]).error && normalizeItems([]).error);
});

test('planes: solo Premium usa pedidos (dueño y público)', async () => {
  const { w, tPro, PRO } = await setup();
  for (const [m, p, b] of [['GET', '/owner/ordering'], ['PATCH', '/owner/ordering', { state: 'abierto' }], ['POST', '/owner/tables', { label: 'M1' }], ['GET', '/owner/orders'], ['GET', '/owner/stats']]) {
    assert.equal((await w.call(tPro, m, p, b)).status, 403, `${m} ${p}`);
  }
  w.t.restaurant_ordering.push({ restaurant_id: PRO.id, state: 'abierto', accept_mesa: true, accept_take_away: true, accept_delivery: true, delivery_fee: 0 });
  assert.equal((await order(w, 'res-pro', take([{ id: crypto.randomUUID(), qty: 1 }]))).status, 403);
});

test('configuración: validaciones y estado por defecto cerrado', async () => {
  const { w, tP, muzza } = await setup({ open: false });
  assert.equal((await w.call(tP, 'GET', '/owner/ordering')).body.ordering.state, 'cerrado');
  assert.equal((await order(w, 'res-prem', take([{ id: muzza.id, qty: 1 }]))).status, 409, 'cerrado no recibe');
  for (const bad of [{ state: 'raro' }, { delivery_fee: -1 }, { delivery_fee: 'abc' }, { accept_mesa: 'si' }, {}]) {
    assert.equal((await w.call(tP, 'PATCH', '/owner/ordering', bad)).status, 400, JSON.stringify(bad));
  }
  await w.call(tP, 'PATCH', '/owner/ordering', { state: 'pausado' });
  const r = await order(w, 'res-prem', take([{ id: muzza.id, qty: 1 }]));
  assert.equal(r.status, 409); assert.match(r.body.error, /pausó/);
});

test('pedido: el precio sale del menú PUBLICADO, no del cliente ni del borrador', async () => {
  const { w, tP, muzza, fuga } = await setup();
  await w.call(tP, 'PATCH', `/owner/products/${muzza.id}`, { price_ars: 1 }); // borrador sin publicar
  const r = await order(w, 'res-prem', take([{ id: muzza.id, qty: 2, price: 1, price_ars: 1 }, { id: fuga.id, qty: 1 }], { total: 1 }));
  assert.equal(r.status, 201);
  assert.equal(r.body.order.total, 2 * 9500 + 8000); assert.equal(r.body.order.number, 1);
  const o = w.t.orders[0];
  assert.equal(o.subtotal, 27000); assert.equal(o.customer_phone, '5491122334455');
  assert.deepEqual(w.t.order_items.map((i) => [i.name, i.unit_price, i.qty]), [['Muzza', 9500, 2], ['Fugazza', 8000, 1]]);
  assert.equal((await order(w, 'res-prem', take([{ id: muzza.id, qty: 1 }]))).body.order.number, 2, 'numeración por local');
});

test('pedido: productos agotados, inexistentes, cantidades y límites', async () => {
  const { w, muzza, agotado } = await setup();
  assert.equal((await order(w, 'res-prem', take([{ id: agotado.id, qty: 1 }]))).status, 409);
  assert.equal((await order(w, 'res-prem', take([{ id: crypto.randomUUID(), qty: 1 }]))).status, 409);
  assert.equal((await order(w, 'res-prem', take([{ id: muzza.id, qty: 0 }]))).status, 400);
  assert.equal((await order(w, 'res-prem', take([{ id: muzza.id, qty: 99 }]))).status, 400);
  assert.equal((await order(w, 'res-prem', take([]))).status, 400);
  assert.equal((await order(w, 'res-prem', take(Array.from({ length: 41 }, () => ({ id: crypto.randomUUID(), qty: 1 }))))).status, 400);
  assert.equal(w.t.orders.length, 0);
});

test('pedido: datos obligatorios según el tipo, delivery suma envío', async () => {
  const { w, muzza } = await setup();
  const it = [{ id: muzza.id, qty: 1 }];
  assert.equal((await order(w, 'res-prem', take(it, { customer_name: '' }))).status, 400);
  assert.equal((await order(w, 'res-prem', take(it, { customer_phone: '12' }))).status, 400);
  assert.equal((await order(w, 'res-prem', take(it, { payment_method: 'bitcoin' }))).status, 400);
  assert.equal((await order(w, 'res-prem', take(it, { payment_method: 'credito' }))).status, 400, 'medio no habilitado');
  assert.equal((await order(w, 'res-prem', take(it, { type: 'delivery' }))).status, 400, 'sin dirección');
  const d = await order(w, 'res-prem', take(it, { type: 'delivery', address: 'Calle Falsa 123' }));
  assert.equal(d.status, 201); assert.equal(d.body.order.total, 9500 + 1500);
  assert.equal(w.t.orders[0].delivery_fee, 1500);
  const t = await order(w, 'res-prem', take(it));
  assert.equal(t.body.order.total, 9500, 'take away sin envío');
  assert.equal((await order(w, 'res-prem', take(it, { type: 'mesa' }))).status, 400, 'mesa sin mesa');
  assert.equal((await order(w, 'res-prem', { ...take(it), type: 'comer_en_la_luna' })).status, 400);
});

test('campo trampa y límite de pedidos pendientes por contacto', async () => {
  const { w, muzza } = await setup();
  const it = [{ id: muzza.id, qty: 1 }];
  assert.equal((await order(w, 'res-prem', take(it, { website: 'http://spam' }))).status, 400);
  for (let i = 0; i < 3; i++) assert.equal((await order(w, 'res-prem', take(it))).status, 201);
  assert.equal((await order(w, 'res-prem', take(it))).status, 429);
  assert.equal((await order(w, 'res-prem', take(it, { customer_phone: '1144556677' }))).status, 201, 'otro contacto sí puede');
});

test('mesas: crear, QR por mesa en el menú público, pedido en mesa y aislamiento', async () => {
  const { w, tP, tQ, muzza, Q } = await setup();
  const created = (await w.call(tP, 'POST', '/owner/tables', { count: 3 })).body.tables;
  assert.deepEqual(created.map((x) => x.label), ['Mesa 1', 'Mesa 2', 'Mesa 3']);
  assert.equal((await w.call(tP, 'POST', '/owner/tables', { label: 'mesa 1' })).status, 400, 'duplicada (sin distinguir mayúsculas)');
  assert.equal((await w.call(tP, 'POST', '/owner/tables', { count: 200 })).status, 400);
  const mesa = created[0];
  let m = (await w.call(null, 'GET', `/public/menu/res-prem?mesa=${mesa.id}`)).body;
  assert.deepEqual(m.ordering.types.sort(), ['delivery', 'mesa', 'take_away']); assert.equal(m.ordering.table.label, 'Mesa 1');
  assert.ok(m.categories[0].products[0].id, 'ids de producto para poder pedir');
  m = (await w.call(null, 'GET', '/public/menu/res-prem')).body;
  assert.ok(!m.ordering.types.includes('mesa') && m.ordering.table === null);
  const r = await order(w, 'res-prem', { type: 'mesa', table_id: mesa.id, items: [{ id: muzza.id, qty: 1 }] });
  assert.equal(r.status, 201); assert.equal(w.t.orders[0].table_label, 'Mesa 1');
  // una mesa de OTRO local no sirve
  const ajena = (await w.call(tQ, 'POST', '/owner/tables', { label: 'X1' })).body.tables[0];
  const bad = await order(w, 'res-prem', { type: 'mesa', table_id: ajena.id, items: [{ id: muzza.id, qty: 1 }] });
  assert.equal(bad.status, 400); assert.equal(w.t.orders.length, 1);
  assert.equal((await w.call(tP, 'PATCH', `/owner/tables/${ajena.id}`, { label: 'Hack' })).status, 404);
  assert.equal((await w.call(tP, 'DELETE', `/owner/tables/${ajena.id}`)).status, 404);
  assert.equal(w.t.restaurant_tables.find((x) => x.id === ajena.id).restaurant_id, Q.id);
  // con pedidos, borrar = archivar; ya no acepta pedidos
  const del = (await w.call(tP, 'DELETE', `/owner/tables/${mesa.id}`)).body;
  assert.equal(del.archived, true);
  assert.equal((await order(w, 'res-prem', { type: 'mesa', table_id: mesa.id, items: [{ id: muzza.id, qty: 1 }] })).status, 400);
  assert.equal((await w.call(tP, 'DELETE', `/owner/tables/${created[1].id}`)).body.archived, false);
});

test('seguimiento: por token, sin datos personales, y no cruza locales', async () => {
  const { w, tP, muzza } = await setup();
  const r = (await order(w, 'res-prem', take([{ id: muzza.id, qty: 1 }]))).body.order;
  const t = await w.call(null, 'GET', `/public/orders/res-prem/${r.tracking_token}`);
  assert.equal(t.status, 200); assert.equal(t.body.order.status, 'nuevo'); assert.equal(t.body.order.number, 1);
  const txt = JSON.stringify(t.body);
  assert.ok(!txt.includes('5491122334455') && !txt.includes('Ana') && !txt.includes('tracking'));
  assert.equal((await w.call(null, 'GET', `/public/orders/res-prem2/${r.tracking_token}`)).status, 404);
  assert.equal((await w.call(null, 'GET', '/public/orders/res-prem/zzzzzzzzzzzzzzzzzzzzzzzz')).status, 404);
  assert.equal((await w.call(null, 'GET', '/public/orders/res-prem/corto')).status, 404);
  const id = (await w.call(tP, 'GET', '/owner/orders')).body.orders[0].id;
  await w.call(tP, 'PATCH', `/owner/orders/${id}/status`, { status: 'en_preparacion' });
  assert.equal((await w.call(null, 'GET', `/public/orders/res-prem/${r.tracking_token}`)).body.order.status, 'en_preparacion');
});

test('cola del dueño: transiciones válidas, historial, cancelación y aislamiento', async () => {
  const { w, tP, tQ, muzza } = await setup();
  for (let i = 0; i < 2; i++) await order(w, 'res-prem', take([{ id: muzza.id, qty: 1 }], { customer_phone: `11223344${i}0` }));
  let q = (await w.call(tP, 'GET', '/owner/orders')).body.orders;
  assert.deepEqual(q.map((o) => o.number), [1, 2], 'el más viejo primero');
  const [a, b] = q;
  assert.equal((await w.call(tP, 'PATCH', `/owner/orders/${a.id}/status`, { status: 'listo' })).status, 409, 'no se saltea pasos');
  assert.equal((await w.call(tP, 'PATCH', `/owner/orders/${a.id}/status`, { status: 'inventado' })).status, 400);
  for (const s of ['en_preparacion', 'listo', 'entregado']) assert.equal((await w.call(tP, 'PATCH', `/owner/orders/${a.id}/status`, { status: s })).status, 200);
  assert.equal((await w.call(tP, 'PATCH', `/owner/orders/${a.id}/status`, { status: 'cancelado' })).status, 409, 'entregado es final');
  assert.equal((await w.call(tP, 'PATCH', `/owner/orders/${b.id}/status`, { status: 'cancelado' })).status, 200);
  q = (await w.call(tP, 'GET', '/owner/orders')).body.orders; assert.equal(q.length, 0);
  const h = (await w.call(tP, 'GET', '/owner/orders?scope=history')).body.orders;
  assert.equal(h.length, 2);
  assert.deepEqual(h.find((o) => o.id === a.id).history.map((x) => x.status), ['nuevo', 'en_preparacion', 'listo', 'entregado']);
  // aislamiento
  assert.deepEqual((await w.call(tQ, 'GET', '/owner/orders?scope=history')).body.orders, []);
  assert.equal((await w.call(tQ, 'PATCH', `/owner/orders/${a.id}/status`, { status: 'cancelado' })).status, 404);
  assert.equal(w.t.orders.find((o) => o.id === a.id).status, 'entregado');
  assert.equal(w.t.orders.find((o) => o.id === b.id).status, 'cancelado');
});

test('estadísticas básicas', async () => {
  const { w, tP, tQ, muzza, fuga } = await setup();
  const r1 = (await order(w, 'res-prem', take([{ id: muzza.id, qty: 2 }, { id: fuga.id, qty: 1 }]))).body.order;
  await order(w, 'res-prem', take([{ id: fuga.id, qty: 1 }], { customer_phone: '1144556677', type: 'delivery', address: 'Calle 12345' }));
  const list = (await w.call(tP, 'GET', '/owner/orders')).body.orders;
  for (const s of ['en_preparacion', 'listo', 'entregado']) await w.call(tP, 'PATCH', `/owner/orders/${list[0].id}/status`, { status: s });
  await w.call(tP, 'PATCH', `/owner/orders/${list[1].id}/status`, { status: 'cancelado' });
  const s = (await w.call(tP, 'GET', '/owner/stats?days=30')).body;
  assert.equal(s.days, 30); assert.equal(s.total_orders, 2); assert.equal(s.delivered, 1);
  assert.equal(s.revenue_delivered, r1.total); assert.equal(s.avg_ticket, r1.total);
  assert.equal(s.by_status.cancelado, 1); assert.equal(s.by_type.take_away, 1); assert.equal(s.by_type.delivery, 0);
  assert.deepEqual(s.top_products, [{ name: 'Muzza', qty: 2 }, { name: 'Fugazza', qty: 1 }]);
  assert.equal((await w.call(tP, 'GET', '/owner/stats?days=5')).body.days, 7, 'valor raro → 7');
  assert.equal((await w.call(tQ, 'GET', '/owner/stats')).body.total_orders, 0, 'otro local no ve estos números');
});

test('downgrade de Premium: dejan de aceptarse pedidos y desaparece del menú', async () => {
  const { w, muzza, P } = await setup();
  assert.ok((await w.call(null, 'GET', '/public/menu/res-prem')).body.ordering);
  w.t.restaurants.find((r) => r.id === P.id).plan = 'profesional';
  assert.equal((await w.call(null, 'GET', '/public/menu/res-prem')).body.ordering, null);
  assert.equal((await order(w, 'res-prem', take([{ id: muzza.id, qty: 1 }]))).status, 403);
});

test('local suspendido no recibe pedidos', async () => {
  const { w, muzza, P } = await setup();
  w.t.restaurants.find((r) => r.id === P.id).status = 'suspendido';
  assert.equal((await order(w, 'res-prem', take([{ id: muzza.id, qty: 1 }]))).status, 404);
});
