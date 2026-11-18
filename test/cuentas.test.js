import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from './world.js';
import { validateEntry, validateAccount, toAmount, newCode } from '../server/lib/credit.js';

async function setup() {
  const w = makeWorld();
  const tP = w.addUser('prem'); const tQ = w.addUser('prem2'); const tPro = w.addUser('pro');
  const P = w.addRestaurant('res-prem', 'prem', { plan: 'premium' });
  const Q = w.addRestaurant('res-prem2', 'prem2', { plan: 'premium' });
  w.addRestaurant('res-pro', 'pro', { plan: 'profesional' });
  const cat = (await w.call(tP, 'POST', '/owner/categories', { name: 'Pizzas' })).body.category;
  const muzza = (await w.call(tP, 'POST', '/owner/products', { category_id: cat.id, name: 'Muzza', price_ars: 9500 })).body.product;
  await w.call(tP, 'POST', '/owner/publish');
  await w.call(tP, 'PATCH', '/owner/ordering', { state: 'abierto' });
  await w.call(tP, 'PATCH', '/owner/payments', { methods: ['efectivo', 'cuenta_corriente'] });
  const acc = (body = { name: 'Juan Pérez', phone: '549 388 1234567', credit_limit: 20000 }) => w.call(tP, 'POST', '/owner/credit/accounts', body);
  return { w, tP, tQ, tPro, P, Q, muzza, acc };
}
const entry = (w, t, id, b) => w.call(t, 'POST', `/owner/credit/accounts/${id}/entries`, b);
const take = (muzza, extra = {}) => ({ type: 'take_away', customer_name: 'Juan', customer_phone: '549 388 1234567', payment_method: 'cuenta_corriente', items: [{ id: muzza.id, qty: 2 }], ...extra });

test('reglas puras: montos, código, validaciones', () => {
  assert.equal(toAmount('1.250,50'), 1250.5); assert.equal(toAmount(300), 300); assert.ok(Number.isNaN(toAmount(''))); assert.ok(Number.isNaN(toAmount('abc')));
  assert.match(newCode(), /^[0-9]{4}$/);
  assert.equal(validateEntry({ kind: 'consumo', amount: 100 }, '2026-10-28').ok, true);
  assert.equal(validateEntry({ kind: 'consumo', amount: 0 }, '2026-10-28').ok, false);
  assert.equal(validateEntry({ kind: 'consumo', amount: -5 }, '2026-10-28').ok, false);
  assert.equal(validateEntry({ kind: 'otro', amount: 5 }, '2026-10-28').ok, false);
  assert.equal(validateEntry({ kind: 'pago', amount: 5, method: 'bitcoin' }, '2026-10-28').ok, false);
  assert.equal(validateEntry({ kind: 'pago', amount: 5, occurred_on: '2027-01-01' }, '2026-10-28').ok, false, 'no se aceptan fechas futuras');
  assert.equal(validateEntry({ kind: 'pago', amount: 5, occurred_on: '2026-02-30x' }, '2026-10-28').ok, false);
  assert.equal(validateEntry({ kind: 'consumo', amount: 99999999 }, '2026-10-28').ok, false);
  assert.equal(validateAccount({ name: '  ' }).ok, false); assert.equal(validateAccount({ name: 'A', phone: '12' }).ok, false);
  assert.equal(validateAccount({ name: 'A', credit_limit: -1 }).ok, false);
});

test('plan: solo Premium; sin sesión 401; otro rol 403', async () => {
  const { w, tPro, tP } = await setup();
  for (const [m, p] of [['GET', '/owner/credit'], ['POST', '/owner/credit/accounts'], ['GET', '/owner/credit/accounts/x'], ['POST', '/owner/credit/entries/x/void'], ['PATCH', '/owner/orders/x/credit']]) {
    const b = m === 'GET' ? undefined : {};
    assert.equal((await w.call(null, m, p, b)).status, 401, `${m} ${p} sin sesión`);
    assert.equal((await w.call(tPro, m, p, b)).status, 403, `${m} ${p} Profesional`);
  }
  assert.equal((await w.call(tP, 'GET', '/owner/credit')).status, 200);
  // Profesional tampoco puede ofrecer "cuenta corriente" como medio de pago
  assert.equal((await w.call(tPro, 'PATCH', '/owner/payments', { methods: ['efectivo', 'cuenta_corriente'] })).status, 403);
  assert.equal((await w.call(tPro, 'PATCH', '/owner/payments', { methods: ['efectivo'] })).status, 200);
});

test('cuenta: se crea con código de 4 dígitos único, se edita y se archiva', async () => {
  const { w, tP, acc } = await setup();
  const a = (await acc()).body.account;
  assert.match(a.code, /^[0-9]{4}$/); assert.equal(a.balance, 0); assert.equal(a.phone, '5493881234567'); assert.equal(a.credit_limit, 20000);
  const codes = new Set([a.code]);
  for (let i = 0; i < 30; i += 1) codes.add((await acc({ name: `Cliente ${i}` })).body.account.code);
  assert.equal(codes.size, 31, 'los códigos no se repiten');
  assert.equal((await acc({ name: '' })).status, 400);
  const r = await w.call(tP, 'PATCH', `/owner/credit/accounts/${a.id}`, { name: 'Juan P.', credit_limit: '', new_code: true });
  assert.equal(r.body.account.name, 'Juan P.'); assert.equal(r.body.account.credit_limit, null); assert.notEqual(r.body.account.code, undefined);
  assert.equal((await w.call(tP, 'PATCH', `/owner/credit/accounts/${a.id}`, {})).status, 400);
  // sin movimientos se borra; con movimientos se archiva
  const b = (await acc({ name: 'Borrar' })).body.account;
  assert.deepEqual((await w.call(tP, 'DELETE', `/owner/credit/accounts/${b.id}`)).body, { ok: true, archived: false });
  await entry(w, tP, a.id, { kind: 'consumo', amount: 100 });
  assert.deepEqual((await w.call(tP, 'DELETE', `/owner/credit/accounts/${a.id}`)).body, { ok: true, archived: true });
  assert.equal((await entry(w, tP, a.id, { kind: 'consumo', amount: 5 })).status, 409, 'archivada: no recibe consumos');
  assert.equal((await entry(w, tP, a.id, { kind: 'pago', amount: 5 })).status, 201, 'pero sí pagos');
});

test('movimientos manuales: saldo, aviso de límite, anulación y fechas', async () => {
  const { w, tP, acc } = await setup();
  const a = (await acc()).body.account;
  let r = await entry(w, tP, a.id, { kind: 'consumo', amount: 15000, description: 'Cena del viernes', occurred_on: '2026-10-25' });
  assert.equal(r.status, 201); assert.equal(r.body.account.balance, 15000); assert.equal(r.body.over_limit, false);
  r = await entry(w, tP, a.id, { kind: 'consumo', amount: '8.000,50', description: 'Almuerzo' });
  assert.equal(r.body.account.balance, 23000.5); assert.equal(r.body.over_limit, true, 'avisa, pero guarda');
  assert.equal(r.body.account.over_limit, true);
  const pago = (await entry(w, tP, a.id, { kind: 'pago', amount: 10000, method: 'transferencia' })).body;
  assert.equal(pago.account.balance, 13000.5); assert.equal(pago.over_limit, false);
  const list = (await w.call(tP, 'GET', '/owner/credit')).body;
  assert.equal(list.owed, 13000.5); assert.equal(list.debtors, 1);
  const det = (await w.call(tP, 'GET', `/owner/credit/accounts/${a.id}`)).body;
  assert.equal(det.entries.length, 3); assert.equal(det.account.balance, 13000.5);
  // anular un consumo: el saldo vuelve a bajar y queda el rastro
  const cons = det.entries.find((e) => e.description === 'Almuerzo');
  const v = await w.call(tP, 'POST', `/owner/credit/entries/${cons.id}/void`);
  assert.equal(v.body.account.balance, 5000);
  assert.equal((await w.call(tP, 'POST', `/owner/credit/entries/${cons.id}/void`)).status, 409);
  assert.equal((await w.call(tP, 'GET', `/owner/credit/accounts/${a.id}`)).body.entries.find((e) => e.id === cons.id).voided, true);
  // validaciones
  for (const bad of [{ kind: 'consumo', amount: 0 }, { kind: 'consumo', amount: 'x' }, { kind: 'regalo', amount: 5 }, { kind: 'pago', amount: 5, occurred_on: '2099-01-01' }]) {
    assert.equal((await entry(w, tP, a.id, bad)).status, 400, JSON.stringify(bad));
  }
});

test('AISLAMIENTO: un restaurante no ve ni toca las cuentas de otro', async () => {
  const { w, tP, tQ, acc } = await setup();
  const a = (await acc()).body.account;
  await entry(w, tP, a.id, { kind: 'consumo', amount: 500 });
  const eid = (await w.call(tP, 'GET', `/owner/credit/accounts/${a.id}`)).body.entries[0].id;
  assert.deepEqual((await w.call(tQ, 'GET', '/owner/credit')).body.accounts, []);
  for (const [m, p, b] of [['GET', `/owner/credit/accounts/${a.id}`], ['PATCH', `/owner/credit/accounts/${a.id}`, { name: 'X' }], ['DELETE', `/owner/credit/accounts/${a.id}`], ['POST', `/owner/credit/accounts/${a.id}/entries`, { kind: 'pago', amount: 5 }], ['POST', `/owner/credit/entries/${eid}/void`]]) {
    assert.equal((await w.call(tQ, m, p, b)).status, 404, `${m} ${p}`);
  }
  assert.equal((await w.call(tP, 'GET', `/owner/credit/accounts/${a.id}`)).body.account.balance, 500);
  assert.equal((await w.call(tP, 'GET', '/owner/credit/accounts/no-es-uuid')).status, 400);
});

test('pedido con cuenta corriente: valida el código, no filtra datos y no carga nada hasta aceptar', async () => {
  const { w, tP, muzza, acc } = await setup();
  const a = (await acc()).body.account;
  const ord = (b) => w.call(null, 'POST', '/public/orders/res-prem', b);
  // sin código / código malo / código de otro restaurante
  assert.equal((await ord(take(muzza))).body.details.credit_code.includes('4 números'), true);
  const mal = await ord(take(muzza, { credit_code: a.code === '0000' ? '1111' : '0000' }));
  assert.equal(mal.status, 400); assert.ok(mal.body.details.credit_code);
  assert.ok(!JSON.stringify(mal.body).includes('Juan'));
  const ok = await ord(take(muzza, { credit_code: a.code }));
  assert.equal(ok.status, 201);
  assert.ok(!JSON.stringify(ok.body).match(/Juan|Pérez|5493881234567|balance|saldo/i), 'la respuesta al cliente no muestra nada de la cuenta');
  const track = await w.call(null, 'GET', `/public/orders/res-prem/${ok.body.order.tracking_token}`);
  assert.ok(!JSON.stringify(track.body).match(/Juan|cuenta|credit/i));
  assert.equal(w.t.credit_entries.length, 0, 'todavía no se cargó');
  // el dueño lo ve, con la cuenta
  const o = (await w.call(tP, 'GET', '/owner/orders')).body.orders[0];
  assert.equal(o.payment_method, 'cuenta_corriente'); assert.equal(o.credit_account.name, 'Juan Pérez');
  // al aceptar se carga el total
  assert.equal((await w.call(tP, 'PATCH', `/owner/orders/${o.id}/status`, { status: 'en_preparacion' })).status, 200);
  const det = (await w.call(tP, 'GET', `/owner/credit/accounts/${a.id}`)).body;
  assert.equal(det.account.balance, 19000); assert.equal(det.entries[0].description, `Pedido #${o.number}`); assert.equal(det.entries[0].order_id, o.id);
  // avanzar de estado no duplica el cargo
  await w.call(tP, 'PATCH', `/owner/orders/${o.id}/status`, { status: 'listo' });
  assert.equal((await w.call(tP, 'GET', `/owner/credit/accounts/${a.id}`)).body.account.balance, 19000);
  // cancelar después anula el cargo
  await w.call(tP, 'PATCH', `/owner/orders/${o.id}/status`, { status: 'cancelado' });
  assert.equal((await w.call(tP, 'GET', `/owner/credit/accounts/${a.id}`)).body.account.balance, 0);
});

test('pedido de cuenta corriente: rechazado = sin cargo; cuenta archivada o ajena no sirve', async () => {
  const { w, tP, tQ, muzza, acc } = await setup();
  const a = (await acc()).body.account;
  const ord = (b) => w.call(null, 'POST', '/public/orders/res-prem', b);
  const o1 = (await ord(take(muzza, { credit_code: a.code }))).body.order;
  const id1 = w.t.orders.find((x) => x.number === o1.number).id;
  await w.call(tP, 'PATCH', `/owner/orders/${id1}/status`, { status: 'cancelado' });
  assert.equal(w.t.credit_entries.length, 0);
  // cuenta archivada: el código deja de valer
  await entry(w, tP, a.id, { kind: 'consumo', amount: 10 });
  await w.call(tP, 'DELETE', `/owner/credit/accounts/${a.id}`);
  assert.equal((await ord(take(muzza, { credit_code: a.code }))).status, 400);
  // el código de un restaurante no sirve en otro
  const b = (await acc({ name: 'Otro' })).body.account;
  w.t.restaurants.find((r) => r.slug === 'res-prem2').plan = 'premium';
  assert.equal((await w.call(null, 'POST', '/public/orders/res-prem2', take(muzza, { credit_code: b.code }))).status !== 201, true);
});

test('el dueño elige la cuenta de un pedido; sin cuenta no se puede aceptar', async () => {
  const { w, tP, muzza, acc } = await setup();
  const a = (await acc()).body.account; const b = (await acc({ name: 'María' })).body.account;
  const o = (await w.call(null, 'POST', '/public/orders/res-prem', take(muzza, { credit_code: a.code }))).body.order;
  const id = w.t.orders.find((x) => x.number === o.number).id;
  assert.equal((await w.call(tP, 'PATCH', `/owner/orders/${id}/credit`, { account_id: b.id })).status, 200);
  assert.equal((await w.call(tP, 'GET', '/owner/orders')).body.orders[0].credit_account.name, 'María');
  await w.call(tP, 'PATCH', `/owner/orders/${id}/status`, { status: 'en_preparacion' });
  assert.equal((await w.call(tP, 'GET', `/owner/credit/accounts/${b.id}`)).body.account.balance, 19000);
  assert.equal((await w.call(tP, 'GET', `/owner/credit/accounts/${a.id}`)).body.account.balance, 0);
  assert.equal((await w.call(tP, 'PATCH', `/owner/orders/${id}/credit`, { account_id: a.id })).status, 409, 'ya aceptado: no se cambia');
  // un pedido que no es de cuenta corriente no admite cuenta
  const o2 = (await w.call(null, 'POST', '/public/orders/res-prem', take(muzza, { payment_method: 'efectivo' }))).body.order;
  const id2 = w.t.orders.find((x) => x.number === o2.number).id;
  assert.equal((await w.call(tP, 'PATCH', `/owner/orders/${id2}/credit`, { account_id: a.id })).status, 409);
  // pedido de cuenta corriente al que se le quitó la cuenta (dato viejo): no se acepta
  const o3 = (await w.call(null, 'POST', '/public/orders/res-prem', take(muzza, { credit_code: a.code }))).body.order;
  const row3 = w.t.orders.find((x) => x.number === o3.number); row3.credit_account_id = null;
  assert.equal((await w.call(tP, 'PATCH', `/owner/orders/${row3.id}/status`, { status: 'en_preparacion' })).status, 400);
  assert.equal(row3.status, 'nuevo');
});

test('"cuenta corriente" no aparece como medio de pago si el local no la habilitó', async () => {
  const { w, tP, muzza } = await setup();
  await w.call(tP, 'PATCH', '/owner/payments', { methods: ['efectivo'] });
  const r = await w.call(null, 'POST', '/public/orders/res-prem', take(muzza, { credit_code: '1234' }));
  assert.equal(r.status, 400); assert.ok(r.body.details.payment_method);
  const pub = (await w.call(null, 'GET', '/public/menu/res-prem')).body;
  assert.ok(!JSON.stringify(pub.ordering ?? pub).includes('cuenta_corriente'));
});
