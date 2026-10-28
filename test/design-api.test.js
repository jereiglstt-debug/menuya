import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, JPEG } from './world.js';

function setup() {
  const w = makeWorld();
  const tB = w.addUser('basico'); const tP = w.addUser('pro');
  const B = w.addRestaurant('res-basico', 'basico', { plan: 'basico' });
  const P = w.addRestaurant('res-pro', 'pro', { plan: 'profesional' });
  return { w, tB, tP, B, P };
}
async function seed(w, token) {
  const cat = (await w.call(token, 'POST', '/owner/categories', { name: 'Pizzas' })).body.category;
  await w.call(token, 'POST', '/owner/products', { category_id: cat.id, name: 'Muzza', price_ars: 100 });
}

test('Básico: plantilla básica + acento OK; el resto → 403', async () => {
  const { w, tB } = setup();
  assert.equal((await w.call(tB, 'PATCH', '/owner/design', { template: 'minimalista', accent: '#aa3300' })).status, 200);
  for (const body of [{ template: 'moderno' }, { template: 'clasico', bg: '#000000' }, { template: 'clasico', ink: '#111111' },
    { template: 'clasico', font: 'poppins' }, { template: 'clasico', card_style: 'tarjeta' }]) {
    const r = await w.call(tB, 'PATCH', '/owner/design', body);
    assert.equal(r.status, 403, JSON.stringify(body));
  }
  assert.equal((await w.call(tB, 'POST', '/owner/cover', undefined, { raw: JPEG, type: 'image/jpeg' })).status, 403);
  const m = (await w.call(tB, 'GET', '/owner/menu')).body;
  assert.equal(m.design.template, 'minimalista'); assert.equal(m.capabilities.design.advanced, false);
});
test('Profesional: todo permitido, contraste ilegible → 400', async () => {
  const { w, tP } = setup();
  assert.equal((await w.call(tP, 'PATCH', '/owner/design', { template: 'moderno', bg: '#101820', ink: '#f5f5f5', font: 'poppins', card_style: 'tarjeta' })).status, 200);
  assert.equal((await w.call(tP, 'PATCH', '/owner/design', { template: 'clasico', bg: '#ffffff', ink: '#eeeeee' })).status, 400);
  assert.equal((await w.call(tP, 'PATCH', '/owner/design', { template: 'clasico', accent: 'no-es-color' })).status, 400);
});
test('el diseño llega al menú público solo tras publicar (borrador no se filtra)', async () => {
  const { w, tP } = setup();
  await seed(w, tP);
  await w.call(tP, 'PATCH', '/owner/design', { template: 'elegante' });
  await w.call(tP, 'POST', '/owner/publish');
  assert.equal((await w.call(null, 'GET', '/public/menu/res-pro')).body.design.template, 'elegante');
  await w.call(tP, 'PATCH', '/owner/design', { template: 'moderno' });
  assert.equal((await w.call(null, 'GET', '/public/menu/res-pro')).body.design.template, 'elegante', 'sin publicar no cambia');
  assert.equal((await w.call(tP, 'GET', '/owner/preview')).body.design.template, 'moderno');
});
test('downgrade: el menú público ya publicado se sanea según el plan actual', async () => {
  const { w, tP, P } = setup();
  await seed(w, tP);
  await w.call(tP, 'PATCH', '/owner/design', { template: 'moderno', bg: '#101820', ink: '#f5f5f5' });
  await w.call(tP, 'POST', '/owner/cover', undefined, { raw: JPEG, type: 'image/jpeg' });
  await w.call(tP, 'POST', '/owner/publish');
  let pub = (await w.call(null, 'GET', '/public/menu/res-pro')).body;
  assert.equal(pub.design.template, 'moderno'); assert.ok(pub.cover_url);
  w.t.restaurants.find((r) => r.id === P.id).plan = 'basico';
  pub = (await w.call(null, 'GET', '/public/menu/res-pro')).body;
  assert.equal(pub.design.template, 'clasico'); assert.equal(pub.design.bg, null); assert.equal(pub.cover_url, null);
});
test('portada: se sube, el reemplazo se limpia tras publicar, y la publicada no se borra antes', async () => {
  const { w, tP, P } = setup();
  await seed(w, tP);
  await w.call(tP, 'POST', '/owner/cover', undefined, { raw: JPEG, type: 'image/jpeg' });
  await w.call(tP, 'POST', '/owner/publish');
  const vieja = w.t.menu_settings.find((s) => s.restaurant_id === P.id).cover_path;
  assert.ok(vieja && vieja.startsWith(`${P.id}/`) && w.storage.has(vieja));
  await w.call(tP, 'POST', '/owner/cover', undefined, { raw: JPEG, type: 'image/jpeg' });
  assert.ok(w.storage.has(vieja), 'la publicada sigue disponible');
  await w.call(tP, 'POST', '/owner/publish');
  assert.ok(!w.storage.has(vieja), 'se limpia luego de publicar');
});
test('aislamiento: cada propietario edita solo su propio diseño', async () => {
  const { w, tB, tP, B, P } = setup();
  await w.call(tP, 'PATCH', '/owner/design', { template: 'moderno' });
  await w.call(tB, 'PATCH', '/owner/design', { template: 'minimalista' });
  assert.equal(w.t.menu_settings.find((s) => s.restaurant_id === P.id).design.template, 'moderno');
  assert.equal(w.t.menu_settings.find((s) => s.restaurant_id === B.id).design.template, 'minimalista');
});
