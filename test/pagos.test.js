import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from './world.js';
import { validatePaymentSettings } from '../server/lib/payments.js';
import { validateOrderInput, orderingView } from '../server/lib/orders.js';
import { payText } from '../public/shared/pagos.js';

test('validatePaymentSettings: opciones válidas y reglas de combinado', () => {
  assert.equal(validatePaymentSettings({ methods: ['efectivo'] }).ok, true);
  assert.deepEqual(validatePaymentSettings({ methods: ['credito', 'efectivo'] }).value, { methods: ['efectivo', 'credito'], combo_options: [] });
  assert.equal(validatePaymentSettings({ methods: [] }).ok, false);
  assert.equal(validatePaymentSettings({ methods: ['bitcoin'] }).ok, false);
  assert.equal(validatePaymentSettings({ methods: ['efectivo', 'efectivo'] }).ok, false);
  assert.equal(validatePaymentSettings({ methods: ['combinado'] }).ok, false, 'combinado exige combinaciones');
  assert.equal(validatePaymentSettings({ methods: ['combinado'], combo_options: ['efectivo'] }).ok, false, 'al menos dos');
  assert.equal(validatePaymentSettings({ methods: ['combinado'], combo_options: ['efectivo', 'combinado'] }).ok, false, 'no se combina "combinado"');
  const v = validatePaymentSettings({ methods: ['efectivo', 'combinado'], combo_options: ['debito', 'efectivo'] });
  assert.deepEqual(v.value, { methods: ['efectivo', 'combinado'], combo_options: ['efectivo', 'debito'] });
  assert.deepEqual(validatePaymentSettings({ methods: ['efectivo'], combo_options: ['efectivo', 'debito'] }).value.combo_options, [], 'sin combinado se ignoran las combinaciones');
  assert.equal(validatePaymentSettings(null).ok, false);
});

test('payText', () => {
  assert.equal(payText('debito'), 'Tarjeta de débito');
  assert.equal(payText('combinado', ['efectivo', 'credito']), 'Combinado (Efectivo + Tarjeta de crédito)');
});

const view = { types: ['mesa', 'take_away'], methods: ['efectivo', 'debito', 'combinado'], combo_options: ['efectivo', 'debito'], table: { id: 'T' }, fee: 0 };
test('validateOrderInput: combinado exige elegir al menos dos entre las habilitadas', () => {
  const base = { type: 'mesa', table_id: 'T' };
  assert.equal(validateOrderInput({ ...base, payment_method: 'combinado' }, view).ok, false);
  assert.equal(validateOrderInput({ ...base, payment_method: 'combinado', payment_combo: ['efectivo'] }, view).ok, false);
  assert.equal(validateOrderInput({ ...base, payment_method: 'combinado', payment_combo: ['efectivo', 'credito'] }, view).ok, false, 'crédito no está habilitado para combinar');
  assert.equal(validateOrderInput({ ...base, payment_method: 'combinado', payment_combo: ['efectivo', 'efectivo'] }, view).ok, false);
  const ok = validateOrderInput({ ...base, payment_method: 'combinado', payment_combo: ['debito', 'efectivo'] }, view);
  assert.ok(ok.ok); assert.deepEqual(ok.value.payment_combo, ['efectivo', 'debito']);
  assert.equal(validateOrderInput({ ...base, payment_method: 'credito' }, view).ok, false, 'crédito no habilitado');
  const simple = validateOrderInput({ ...base, payment_method: 'debito', payment_combo: ['efectivo', 'debito'] }, view);
  assert.ok(simple.ok); assert.equal(simple.value.payment_combo, null, 'combo se ignora si no es combinado');
  assert.equal(validateOrderInput({ ...base }, view).ok, true, 'en mesa el pago es opcional');
});

function setup() {
  const w = makeWorld();
  const tB = w.addUser('bas'); const tPro = w.addUser('pro'); const tP = w.addUser('prem'); const tQ = w.addUser('prem2');
  w.addRestaurant('res-bas', 'bas', { plan: 'basico' }); w.addRestaurant('res-pro', 'pro', { plan: 'profesional' });
  w.addRestaurant('res-prem', 'prem', { plan: 'premium' }); w.addRestaurant('res-prem2', 'prem2', { plan: 'premium' });
  return { w, tB, tPro, tP, tQ };
}
async function publish(w, token) {
  const cat = (await w.call(token, 'POST', '/owner/categories', { name: 'C' })).body.category;
  const prod = (await w.call(token, 'POST', '/owner/products', { category_id: cat.id, name: 'Muzza', price_ars: 100 })).body.product;
  await w.call(token, 'POST', '/owner/publish');
  return prod;
}

test('todos los planes configuran sus métodos de pago y se ven en el menú público', async () => {
  const { w, tB, tPro, tP } = setup();
  for (const [t, slug] of [[tB, 'res-bas'], [tPro, 'res-pro'], [tP, 'res-prem']]) {
    const g = (await w.call(t, 'GET', '/owner/payments')).body;
    assert.deepEqual(g.payments.methods, ['efectivo']); assert.equal(g.configured, false);
    await publish(w, t);
    assert.equal((await w.call(null, 'GET', `/public/menu/${slug}`)).body.payments, null, 'sin configurar no se muestra nada');
    const r = await w.call(t, 'PATCH', '/owner/payments', { methods: ['efectivo', 'debito', 'credito', 'combinado'], combo_options: ['efectivo', 'debito', 'credito'] });
    assert.equal(r.status, 200);
    const pub = (await w.call(null, 'GET', `/public/menu/${slug}`)).body;
    assert.deepEqual(pub.payments.methods, ['efectivo', 'debito', 'credito', 'combinado']);
    assert.deepEqual(pub.payments.combo_options, ['efectivo', 'debito', 'credito']);
  }
});

test('es configuración en vivo: no hace falta publicar', async () => {
  const { w, tB } = setup();
  await publish(w, tB);
  await w.call(tB, 'PATCH', '/owner/payments', { methods: ['debito'] });
  assert.deepEqual((await w.call(null, 'GET', '/public/menu/res-bas')).body.payments.methods, ['debito']);
  await w.call(tB, 'PATCH', '/owner/payments', { methods: ['efectivo', 'debito'] });
  assert.deepEqual((await w.call(null, 'GET', '/public/menu/res-bas')).body.payments.methods, ['efectivo', 'debito']);
});

test('validaciones de la API y sin sesión', async () => {
  const { w, tB } = setup();
  assert.equal((await w.call(null, 'GET', '/owner/payments')).status, 401);
  for (const bad of [{}, { methods: [] }, { methods: ['bitcoin'] }, { methods: ['combinado'] }, { methods: ['combinado'], combo_options: ['efectivo'] }, { methods: 'efectivo' }]) {
    assert.equal((await w.call(tB, 'PATCH', '/owner/payments', bad)).status, 400, JSON.stringify(bad));
  }
  assert.equal(w.t.restaurant_payment_settings.length, 0);
});

test('aislamiento: cada local guarda y ve solo lo suyo', async () => {
  const { w, tB, tPro } = setup();
  await w.call(tB, 'PATCH', '/owner/payments', { methods: ['debito'] });
  await w.call(tPro, 'PATCH', '/owner/payments', { methods: ['credito'] });
  assert.deepEqual((await w.call(tB, 'GET', '/owner/payments')).body.payments.methods, ['debito']);
  assert.deepEqual((await w.call(tPro, 'GET', '/owner/payments')).body.payments.methods, ['credito']);
  assert.equal(w.t.restaurant_payment_settings.length, 2);
});

async function openPremium(w, tP) {
  const prod = await publish(w, tP);
  await w.call(tP, 'PATCH', '/owner/ordering', { state: 'abierto' });
  await w.call(tP, 'PATCH', '/owner/payments', { methods: ['efectivo', 'debito', 'combinado'], combo_options: ['efectivo', 'debito'] });
  const mesa = (await w.call(tP, 'POST', '/owner/tables', { label: 'Mesa 1' })).body.tables[0];
  return { prod, mesa };
}

test('al escanear una mesa: el cliente ve las opciones y el pedido guarda el pago elegido', async () => {
  const { w, tP } = setup();
  const { prod, mesa } = await openPremium(w, tP);
  const m = (await w.call(null, 'GET', `/public/menu/res-prem?mesa=${mesa.id}`)).body;
  assert.deepEqual(m.ordering.methods, ['efectivo', 'debito', 'combinado']); assert.deepEqual(m.ordering.combo_options, ['efectivo', 'debito']);
  const order = (extra) => w.call(null, 'POST', '/public/orders/res-prem', { type: 'mesa', table_id: mesa.id, items: [{ id: prod.id, qty: 1 }], ...extra });
  assert.equal((await order({ payment_method: 'credito' })).status, 400, 'crédito no está habilitado');
  assert.equal((await order({ payment_method: 'combinado' })).status, 400, 'combinado sin detalle');
  assert.equal((await order({ payment_method: 'combinado', payment_combo: ['credito', 'efectivo'] })).status, 400);
  assert.equal((await order({ payment_method: 'combinado', payment_combo: ['efectivo', 'debito'] })).status, 201);
  assert.equal((await order({ payment_method: 'debito' })).status, 201);
  assert.equal((await order({})).status, 201, 'en mesa se puede decidir al final');
  const [a, b, c] = w.t.orders;
  assert.deepEqual([a.payment_method, a.payment_combo], ['combinado', ['efectivo', 'debito']]);
  assert.deepEqual([b.payment_method, b.payment_combo], ['debito', null]);
  assert.deepEqual([c.payment_method, c.payment_combo], [null, null]);
  const q = (await w.call(tP, 'GET', '/owner/orders')).body.orders;
  assert.deepEqual(q[0].payment_combo, ['efectivo', 'debito']);
});

test('cambiar los métodos de pago se aplica ya a los pedidos nuevos', async () => {
  const { w, tP } = setup();
  const { prod, mesa } = await openPremium(w, tP);
  const order = (pm) => w.call(null, 'POST', '/public/orders/res-prem', { type: 'mesa', table_id: mesa.id, items: [{ id: prod.id, qty: 1 }], payment_method: pm });
  assert.equal((await order('debito')).status, 201);
  await w.call(tP, 'PATCH', '/owner/payments', { methods: ['efectivo'] });
  assert.equal((await order('debito')).status, 400);
  assert.equal((await order('efectivo')).status, 201);
});

test('sin configurar, los pedidos Premium aceptan solo efectivo', async () => {
  const { w, tP } = setup();
  const prod = await publish(w, tP);
  await w.call(tP, 'PATCH', '/owner/ordering', { state: 'abierto' });
  const o = (pm) => w.call(null, 'POST', '/public/orders/res-prem', { type: 'take_away', customer_name: 'Ana', customer_phone: '1122334455', payment_method: pm, items: [{ id: prod.id, qty: 1 }] });
  assert.equal((await o('debito')).status, 400); assert.equal((await o('efectivo')).status, 201);
});

test('el orderingView usa los pagos recibidos', () => {
  const row = { accept_mesa: false, accept_take_away: true, accept_delivery: false, state: 'abierto', delivery_fee: 0 };
  assert.deepEqual(orderingView(row, 'premium', null).methods, ['efectivo']);
  assert.deepEqual(orderingView(row, 'premium', null, { methods: ['debito'], combo_options: [] }).methods, ['debito']);
});
