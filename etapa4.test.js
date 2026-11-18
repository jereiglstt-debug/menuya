import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from './world.js';
import { normalizeWhatsapp } from '../server/lib/validate.js';

function setup() {
  const w = makeWorld();
  const tB = w.addUser('basico'); const tP = w.addUser('pro'); const tQ = w.addUser('pro2');
  const B = w.addRestaurant('res-basico', 'basico', { plan: 'basico' });
  const P = w.addRestaurant('res-pro', 'pro', { plan: 'profesional' });
  const Q = w.addRestaurant('res-pro2', 'pro2', { plan: 'profesional' });
  return { w, tB, tP, tQ, B, P, Q };
}
async function seed(w, token) {
  const cat = (await w.call(token, 'POST', '/owner/categories', { name: 'Pizzas' })).body.category;
  const prod = (await w.call(token, 'POST', '/owner/products', { category_id: cat.id, name: 'Muzza', price_ars: 100 })).body.product;
  return { cat, prod };
}
const pub = async (w, slug) => (await w.call(null, 'GET', `/public/menu/${slug}`)).body;

test('normalizeWhatsapp: formatos válidos, vacío y basura', () => {
  assert.equal(normalizeWhatsapp('+54 9 11 2233-4455'), '5491122334455');
  assert.equal(normalizeWhatsapp(''), null);
  assert.equal(normalizeWhatsapp(null), null);
  assert.equal(normalizeWhatsapp('123'), undefined);
  assert.equal(normalizeWhatsapp('abc12345678'), undefined);
  assert.equal(normalizeWhatsapp('1'.repeat(16)), undefined);
  assert.equal(normalizeWhatsapp(5491122334455), undefined);
});

test('Básico: no puede destacar ni crear promociones (403); sí guardar WhatsApp', async () => {
  const { w, tB } = setup();
  const { prod } = await seed(w, tB);
  assert.equal((await w.call(tB, 'PATCH', `/owner/products/${prod.id}`, { featured: true })).status, 403);
  assert.equal((await w.call(tB, 'PATCH', `/owner/products/${prod.id}`, { featured: false })).status, 200);
  assert.equal((await w.call(tB, 'POST', '/owner/products', { category_id: prod.category_id, name: 'X', price_ars: 1, featured: true })).status, 403);
  assert.equal((await w.call(tB, 'POST', '/owner/promotions', { title: '2x1' })).status, 403);
  assert.equal((await w.call(tB, 'PATCH', '/owner/settings', { whatsapp: '12' })).status, 400);
  assert.equal((await w.call(tB, 'PATCH', '/owner/settings', { whatsapp: '+54 9 11 2233-4455' })).status, 200);
  assert.equal((await w.call(tB, 'GET', '/owner/menu')).body.settings.whatsapp, '5491122334455');
});

test('Básico: el menú público trae WhatsApp pero no carrito, promos ni destacados', async () => {
  const { w, tB, B } = setup();
  await seed(w, tB);
  await w.call(tB, 'PATCH', '/owner/settings', { whatsapp: '5491122334455' });
  // aunque algo hubiera quedado guardado (p. ej. por un plan anterior), no se muestra
  w.t.products.forEach((p) => { p.featured = true; });
  w.t.promotions.push({ id: 'x', restaurant_id: B.id, title: 'Vieja', description: '', active: true, created_at: 'a' });
  await w.call(tB, 'POST', '/owner/publish');
  const m = await pub(w, 'res-basico');
  assert.equal(m.whatsapp, '5491122334455'); assert.equal(m.cart, false);
  assert.deepEqual(m.promotions, []); assert.equal(m.categories[0].products[0].featured, false);
});

test('Profesional: destacados, promociones y carrito llegan al público solo al publicar', async () => {
  const { w, tP } = setup();
  const { prod } = await seed(w, tP);
  assert.equal((await w.call(tP, 'PATCH', `/owner/products/${prod.id}`, { featured: true })).status, 200);
  const promo = (await w.call(tP, 'POST', '/owner/promotions', { title: '2x1 en pizzas', description: 'Martes' })).body.promotion;
  await w.call(tP, 'PATCH', '/owner/settings', { whatsapp: '5491122334455' });
  assert.equal((await w.call(tP, 'GET', '/owner/preview')).body.promotions.length, 1);
  await w.call(tP, 'POST', '/owner/publish');
  let m = await pub(w, 'res-pro');
  assert.equal(m.cart, true); assert.equal(m.promotions[0].title, '2x1 en pizzas'); assert.equal(m.categories[0].products[0].featured, true);
  // borrador nuevo no es público hasta publicar
  await w.call(tP, 'PATCH', `/owner/promotions/${promo.id}`, { active: false });
  assert.equal((await pub(w, 'res-pro')).promotions.length, 1);
  assert.equal((await w.call(tP, 'GET', '/owner/preview')).body.promotions.length, 0);
  await w.call(tP, 'POST', '/owner/publish');
  assert.equal((await pub(w, 'res-pro')).promotions.length, 0);
});

test('carrito: requiere número de WhatsApp cargado', async () => {
  const { w, tP } = setup();
  await seed(w, tP);
  await w.call(tP, 'POST', '/owner/publish');
  const m = await pub(w, 'res-pro');
  assert.equal(m.whatsapp, null); assert.equal(m.cart, false);
});

test('promociones: validación, tope de 10 y borrado', async () => {
  const { w, tP } = setup();
  assert.equal((await w.call(tP, 'POST', '/owner/promotions', { title: '' })).status, 400);
  assert.equal((await w.call(tP, 'POST', '/owner/promotions', { title: 'x'.repeat(61) })).status, 400);
  let last;
  for (let i = 0; i < 10; i++) last = (await w.call(tP, 'POST', '/owner/promotions', { title: `P${i}` })).body.promotion;
  assert.equal((await w.call(tP, 'POST', '/owner/promotions', { title: 'P11' })).status, 400);
  assert.equal((await w.call(tP, 'DELETE', `/owner/promotions/${last.id}`)).status, 200);
  assert.equal((await w.call(tP, 'POST', '/owner/promotions', { title: 'P11' })).status, 201);
  assert.equal((await w.call(tP, 'DELETE', `/owner/promotions/${last.id}`)).status, 404);
  assert.equal((await w.call(tP, 'PATCH', '/owner/promotions/no-es-uuid', { title: 'a' })).status, 400);
});

test('AISLAMIENTO: otro propietario no toca promociones ajenas', async () => {
  const { w, tP, tQ } = setup();
  const promo = (await w.call(tP, 'POST', '/owner/promotions', { title: 'Mía' })).body.promotion;
  assert.equal((await w.call(tQ, 'PATCH', `/owner/promotions/${promo.id}`, { title: 'Hack' })).status, 404);
  assert.equal((await w.call(tQ, 'DELETE', `/owner/promotions/${promo.id}`)).status, 404);
  assert.deepEqual((await w.call(tQ, 'GET', '/owner/menu')).body.promotions, []);
  assert.equal(w.t.promotions[0].title, 'Mía');
});

test('downgrade: al bajar a Básico se ocultan destacados, promos y carrito', async () => {
  const { w, tP, P } = setup();
  const { prod } = await seed(w, tP);
  await w.call(tP, 'PATCH', `/owner/products/${prod.id}`, { featured: true });
  await w.call(tP, 'POST', '/owner/promotions', { title: 'Promo' });
  await w.call(tP, 'PATCH', '/owner/settings', { whatsapp: '5491122334455' });
  await w.call(tP, 'POST', '/owner/publish');
  assert.equal((await pub(w, 'res-pro')).cart, true);
  w.t.restaurants.find((r) => r.id === P.id).plan = 'basico';
  const m = await pub(w, 'res-pro');
  assert.equal(m.cart, false); assert.deepEqual(m.promotions, []);
  assert.equal(m.categories[0].products[0].featured, false); assert.equal(m.whatsapp, '5491122334455');
  // y no puede volver a destacar
  assert.equal((await w.call(tP, 'PATCH', `/owner/products/${prod.id}`, { featured: true })).status, 403);
});
