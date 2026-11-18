import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, JPEG, PNG } from './world.js';

function setup() {
  const w = makeWorld();
  const tA = w.addUser('duenoA'); const tB = w.addUser('duenoB'); const tAdmin = w.addUser('admin'); const tNada = w.addUser('nadie'); const tC = w.addUser('duenoC');
  w.t.platform_admins.push({ user_id: 'u-admin' });
  const A = w.addRestaurant('pizzeria-a', 'duenoA'); const B = w.addRestaurant('cafe-b', 'duenoB', { plan: 'premium' });
  const C = w.addRestaurant('susp-c', 'duenoC', { status: 'suspendido' });
  return { w, tA, tB, tAdmin, tNada, tC, A, B, C };
}
async function seed(w, token, catName = 'Pizzas', prodName = 'Muzzarella', price = 9500) {
  const cat = (await w.call(token, 'POST', '/owner/categories', { name: catName })).body.category;
  const prod = (await w.call(token, 'POST', '/owner/products', { category_id: cat.id, name: prodName, price_ars: price })).body.product;
  return { cat, prod };
}

test('acceso: sin sesión 401; admin sin restaurante 403; usuario sin restaurante 403; suspendido 403', async () => {
  const { w, tAdmin, tNada, tC } = setup();
  assert.equal((await w.call(null, 'GET', '/owner/menu')).status, 401);
  assert.equal((await w.call(tAdmin, 'GET', '/owner/menu')).status, 403);
  assert.equal((await w.call(tNada, 'GET', '/owner/menu')).status, 403);
  assert.equal((await w.call(tC, 'GET', '/owner/menu')).status, 403);
});

test('AISLAMIENTO: el propietario B no puede ver, editar, borrar, duplicar ni reordenar datos de A', async () => {
  const { w, tA, tB } = setup();
  const { cat, prod } = await seed(w, tA);
  const antes = JSON.stringify([w.t.categories, w.t.products]);

  assert.deepEqual((await w.call(tB, 'GET', '/owner/menu')).body.categories, []);
  assert.deepEqual((await w.call(tB, 'GET', '/owner/preview')).body.categories, []);
  assert.equal((await w.call(tB, 'PATCH', `/owner/products/${prod.id}`, { name: 'Hackeado' })).status, 404);
  assert.equal((await w.call(tB, 'DELETE', `/owner/products/${prod.id}`)).status, 404);
  assert.equal((await w.call(tB, 'POST', `/owner/products/${prod.id}/duplicate`)).status, 404);
  assert.equal((await w.call(tB, 'POST', `/owner/products/${prod.id}/image`, undefined, { raw: JPEG, type: 'image/jpeg' })).status, 404);
  assert.equal((await w.call(tB, 'DELETE', `/owner/products/${prod.id}/image`)).status, 404);
  assert.equal((await w.call(tB, 'PATCH', `/owner/categories/${cat.id}`, { name: 'Hackeada' })).status, 404);
  assert.equal((await w.call(tB, 'DELETE', `/owner/categories/${cat.id}`)).status, 404);
  assert.equal((await w.call(tB, 'POST', '/owner/products', { category_id: cat.id, name: 'Intruso', price_ars: 1 })).status, 404);
  assert.equal((await w.call(tB, 'POST', '/owner/categories/reorder', { ids: [cat.id] })).status, 400);
  assert.equal((await w.call(tB, 'POST', '/owner/products/reorder', { category_id: cat.id, ids: [prod.id] })).status, 404);
  assert.equal(JSON.stringify([w.t.categories, w.t.products]), antes, 'los datos de A no cambiaron');
});

test('el restaurante nunca se toma del cliente: restaurant_id enviado en el cuerpo se ignora', async () => {
  const { w, tB, A, B } = setup();
  const cat = (await w.call(tB, 'POST', '/owner/categories', { name: 'X', restaurant_id: A.id })).body.category;
  assert.equal(w.t.categories.find((c) => c.id === cat.id).restaurant_id, B.id);
});

test('un producto no puede moverse a una categoría de otro restaurante', async () => {
  const { w, tA, tB } = setup();
  const a = await seed(w, tA); const b = await seed(w, tB, 'Cafés', 'Latte', 3000);
  assert.equal((await w.call(tA, 'PATCH', `/owner/products/${a.prod.id}`, { category_id: b.cat.id })).status, 404);
});

test('validaciones: precio negativo, nombre vacío, id malformado', async () => {
  const { w, tA } = setup();
  const { cat } = await seed(w, tA);
  assert.equal((await w.call(tA, 'POST', '/owner/products', { category_id: cat.id, name: 'A', price_ars: -5 })).status, 400);
  assert.equal((await w.call(tA, 'POST', '/owner/products', { category_id: cat.id, name: '  ', price_ars: 5 })).status, 400);
  assert.equal((await w.call(tA, 'POST', '/owner/categories', { name: '' })).status, 400);
  assert.equal((await w.call(tA, 'PATCH', `/owner/products/${encodeURIComponent("x' or 1=1")}`, { name: 'a' })).status, 400);
});

test('CRUD, duplicar, agotado y reordenar', async () => {
  const { w, tA } = setup();
  const { cat, prod } = await seed(w, tA);
  const p2 = (await w.call(tA, 'POST', '/owner/products', { category_id: cat.id, name: 'Fugazzeta', price_ars: '10500,5' })).body.product;
  assert.equal(p2.price_ars, 10500.5);
  const dup = (await w.call(tA, 'POST', `/owner/products/${prod.id}/duplicate`)).body.product;
  assert.equal(dup.name, 'Muzzarella (copia)');
  assert.equal((await w.call(tA, 'PATCH', `/owner/products/${prod.id}`, { available: false })).body.product.available, false);
  assert.equal((await w.call(tA, 'POST', '/owner/products/reorder', { category_id: cat.id, ids: [dup.id, p2.id, prod.id] })).status, 200);
  const menu = (await w.call(tA, 'GET', '/owner/menu')).body;
  assert.deepEqual(menu.categories[0].products.map((p) => p.name), ['Muzzarella (copia)', 'Fugazzeta', 'Muzzarella']);
  assert.equal((await w.call(tA, 'POST', '/owner/products/reorder', { category_id: cat.id, ids: [dup.id] })).status, 400, 'lista incompleta');
  assert.equal((await w.call(tA, 'DELETE', `/owner/products/${p2.id}`)).status, 200);
  assert.equal((await w.call(tA, 'DELETE', `/owner/categories/${cat.id}`)).status, 200);
  assert.equal(w.t.products.length, 0);
});

test('BORRADOR/PUBLICADO: el público no ve el borrador hasta publicar', async () => {
  const { w, tA } = setup();
  assert.equal((await w.call(null, 'GET', '/public/menu/pizzeria-a')).status, 404, 'sin publicar → 404');
  const { prod } = await seed(w, tA);
  assert.equal((await w.call(null, 'GET', '/public/menu/pizzeria-a')).status, 404, 'borrador no es público');
  assert.equal((await w.call(tA, 'GET', '/owner/menu')).body.status.unpublished_changes, true);
  assert.equal((await w.call(tA, 'GET', '/owner/preview')).body.categories[0].products[0].name, 'Muzzarella', 'la vista previa sí muestra el borrador');

  assert.equal((await w.call(tA, 'POST', '/owner/publish')).body.version, 1);
  let pub = (await w.call(null, 'GET', '/public/menu/pizzeria-a')).body;
  assert.equal(pub.categories[0].products[0].price_ars, 9500);
  assert.equal((await w.call(tA, 'GET', '/owner/menu')).body.status.unpublished_changes, false);

  await w.call(tA, 'PATCH', `/owner/products/${prod.id}`, { price_ars: 12000, name: 'Cambiada' });
  assert.equal((await w.call(tA, 'GET', '/owner/menu')).body.status.unpublished_changes, true);
  pub = (await w.call(null, 'GET', '/public/menu/pizzeria-a')).body;
  assert.equal(pub.categories[0].products[0].price_ars, 9500, 'el público sigue con la versión publicada');
  assert.equal(pub.categories[0].products[0].name, 'Muzzarella');

  await w.call(tA, 'POST', '/owner/publish');
  pub = (await w.call(null, 'GET', '/public/menu/pizzeria-a')).body;
  assert.equal(pub.categories[0].products[0].price_ars, 12000);
});

test('publicar sin productos falla y conserva la versión pública anterior', async () => {
  const { w, tA } = setup();
  const { prod } = await seed(w, tA);
  await w.call(tA, 'POST', '/owner/publish');
  await w.call(tA, 'DELETE', `/owner/products/${prod.id}`);
  const r = await w.call(tA, 'POST', '/owner/publish');
  assert.equal(r.status, 400);
  assert.equal((await w.call(null, 'GET', '/public/menu/pizzeria-a')).body.categories[0].products[0].name, 'Muzzarella');
});

test('menú público: suspendido, inexistente o inválido → 404; no filtra datos internos', async () => {
  const { w, tA } = setup();
  assert.equal((await w.call(null, 'GET', '/public/menu/susp-c')).status, 404);
  assert.equal((await w.call(null, 'GET', '/public/menu/no-existe')).status, 404);
  assert.equal((await w.call(null, 'GET', `/public/menu/${encodeURIComponent('../x')}`)).status, 404);
  await seed(w, tA); await w.call(tA, 'POST', '/owner/publish');
  const txt = JSON.stringify((await w.call(null, 'GET', '/public/menu/pizzeria-a')).body);
  assert.ok(!/restaurant_id|u-duenoA|draft/.test(txt));
});

test('imágenes: valida tipo, contenido real y tamaño; guarda bajo el prefijo del restaurante', async () => {
  const { w, tA, A } = setup();
  const { prod } = await seed(w, tA);
  const up = (raw, type) => w.call(tA, 'POST', `/owner/products/${prod.id}/image`, undefined, { raw, type });
  assert.equal((await up(JPEG, 'application/pdf')).status, 415);
  assert.equal((await up(PNG, 'image/jpeg')).status, 400, 'contenido no coincide con el tipo declarado');
  const big = new Uint8Array(3 * 1024 * 1024); big.set(JPEG);
  assert.equal((await up(big, 'image/jpeg')).status, 413);
  assert.equal((await up(JPEG, 'image/jpeg')).status, 200);
  const path = w.t.products[0].image_path;
  assert.ok(path.startsWith(`${A.id}/`) && path.endsWith('.jpg') && w.storage.has(path));
});

test('reemplazar imagen: la vieja se borra recién después de publicar (el público aún la usa)', async () => {
  const { w, tA } = setup();
  const { prod } = await seed(w, tA);
  const up = () => w.call(tA, 'POST', `/owner/products/${prod.id}/image`, undefined, { raw: JPEG, type: 'image/jpeg' });
  await up(); const vieja = w.t.products[0].image_path;
  await w.call(tA, 'POST', '/owner/publish');
  await up(); const nueva = w.t.products[0].image_path;
  assert.notEqual(vieja, nueva);
  assert.ok(w.storage.has(vieja), 'la imagen publicada sigue disponible antes de republicar');
  await w.call(tA, 'POST', '/owner/publish');
  assert.ok(!w.storage.has(vieja), 'después de publicar se limpia');
  assert.ok(w.storage.has(nueva));
  assert.equal(w.t.pending_image_deletes.length, 0);
});

test('duplicar copia la imagen: borrar una no afecta a la otra', async () => {
  const { w, tA } = setup();
  const { prod } = await seed(w, tA);
  await w.call(tA, 'POST', `/owner/products/${prod.id}/image`, undefined, { raw: JPEG, type: 'image/jpeg' });
  const dup = (await w.call(tA, 'POST', `/owner/products/${prod.id}/duplicate`)).body.product;
  const orig = w.t.products.find((p) => p.id === prod.id).image_path;
  assert.ok(dup.image_path && dup.image_path !== orig && w.storage.has(dup.image_path));
  await w.call(tA, 'DELETE', `/owner/products/${prod.id}`);
  await w.call(tA, 'POST', '/owner/publish');
  assert.ok(!w.storage.has(orig) && w.storage.has(dup.image_path));
});

test('logo y datos del negocio se guardan en el borrador y salen al publicar', async () => {
  const { w, tA } = setup();
  await seed(w, tA);
  await w.call(tA, 'PATCH', '/owner/settings', { title: 'La Pizzería', description: 'Desde 1990' });
  assert.equal((await w.call(tA, 'POST', '/owner/logo', undefined, { raw: JPEG, type: 'image/jpeg' })).status, 200);
  await w.call(tA, 'POST', '/owner/publish');
  const pub = (await w.call(null, 'GET', '/public/menu/pizzeria-a')).body;
  assert.equal(pub.title, 'La Pizzería');
  assert.equal(pub.description, 'Desde 1990');
  assert.match(pub.logo_url, /\/storage\/v1\/object\/public\/menu-images\//);
});
