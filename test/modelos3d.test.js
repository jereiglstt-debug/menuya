import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, makeGlb, GLB, JPEG } from './world.js';
import { parseGlb } from '../server/lib/models.js';

const MB = 1024 * 1024;
function setup() {
  const w = makeWorld();
  const tPrem = w.addUser('prem'); const tPro = w.addUser('pro'); const tOtro = w.addUser('otro'); const tAdmin = w.addUser('admin');
  w.t.platform_admins.push({ user_id: 'u-admin' });
  const P = w.addRestaurant('premium-x', 'prem', { plan: 'premium' });
  const Q = w.addRestaurant('pro-x', 'pro', { plan: 'profesional' });
  const O = w.addRestaurant('otro-x', 'otro', { plan: 'premium' });
  return { w, tPrem, tPro, tOtro, tAdmin, P, Q, O };
}
async function seed(w, token, n = 1) {
  const cat = (await w.call(token, 'POST', '/owner/categories', { name: 'Pizzas' })).body.category;
  const prods = [];
  for (let i = 0; i < n; i++) prods.push((await w.call(token, 'POST', '/owner/products', { category_id: cat.id, name: `Pizza ${i}`, price_ars: 9000 })).body.product);
  return prods;
}
const up = (w, token, id, bytes = GLB, type = 'model/gltf-binary') => w.call(token, 'POST', `/owner/products/${id}/model`, undefined, { raw: bytes, type });

test('GLB: valida cabecera, tamaño declarado, contenido y archivos externos', () => {
  assert.doesNotThrow(() => parseGlb(GLB));
  assert.throws(() => parseGlb(new Uint8Array(40)), /GLB válido/);
  assert.throws(() => parseGlb(JPEG), /GLB válido/);
  assert.throws(() => parseGlb(makeGlb(undefined, { lie: 999 })), /incompleto/);
  assert.throws(() => parseGlb(makeGlb({ asset: { version: '2.0' }, meshes: [] })), /ninguna figura/);
  assert.throws(() => parseGlb(makeGlb({ meshes: [{}], extensionsRequired: ['KHR_draco_mesh_compression'] })), /compresión/);
  assert.throws(() => parseGlb(makeGlb({ meshes: [{}], extensionsUsed: ['KHR_texture_basisu'] })), /compresión/);
  assert.throws(() => parseGlb(makeGlb({ meshes: [{}], images: [{ uri: 'https://malo.com/x.png' }] })), /externos/);
  assert.doesNotThrow(() => parseGlb(makeGlb({ meshes: [{}], images: [{ uri: 'data:image/png;base64,AAAA' }] })));
});

test('Premium sube, reemplaza y quita un modelo; el borrador y la vista previa lo muestran', async () => {
  const { w, tPrem } = setup();
  const [p] = await seed(w, tPrem);
  const r = await up(w, tPrem, p.id);
  assert.equal(r.status, 200);
  assert.match(r.body.product.model_path, /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.glb$/);
  assert.match(r.body.product.model_url, /menu-images\/.+\.glb$/);
  assert.equal(w.storage.size, 1);
  const menu = (await w.call(tPrem, 'GET', '/owner/menu')).body;
  assert.deepEqual(menu.models, { used: 1, limit: 15 });
  assert.ok(menu.categories[0].products[0].model_url);
  assert.ok((await w.call(tPrem, 'GET', '/owner/preview')).body.categories[0].products[0].model_url);
  const first = r.body.product.model_path;
  const r2 = await up(w, tPrem, p.id);                           // reemplazo: el viejo queda pendiente de borrar
  assert.equal(r2.status, 200); assert.notEqual(r2.body.product.model_path, first);
  assert.ok(w.t.pending_image_deletes.some((x) => x.path === first));
  assert.equal((await w.call(tPrem, 'DELETE', `/owner/products/${p.id}/model`)).status, 200);
  assert.equal(w.t.products[0].model_path, null);
  assert.equal((await w.call(tPrem, 'GET', '/owner/menu')).body.models.used, 0);
});

test('Básico y Profesional NO pueden subir modelos (403) y no se guarda nada', async () => {
  const { w, tPro } = setup();
  const [p] = await seed(w, tPro);
  const r = await up(w, tPro, p.id);
  assert.equal(r.status, 403);
  assert.equal(w.storage.size, 0);
  assert.equal(w.t.products[0].model_path ?? null, null);
  assert.equal((await w.call(tPro, 'GET', '/owner/menu')).body.models, null);
});

test('archivos inválidos se rechazan: imagen, tipo, grande, vacío', async () => {
  const { w, tPrem } = setup();
  const [p] = await seed(w, tPrem);
  assert.equal((await up(w, tPrem, p.id, JPEG)).status, 400);
  assert.equal((await up(w, tPrem, p.id, GLB, 'image/png')).status, 415);
  assert.equal((await up(w, tPrem, p.id, new Uint8Array(0))).status, 400);
  assert.equal((await up(w, tPrem, p.id, makeGlb(undefined, { extra: 8 * MB }))).status, 413);
  assert.equal(w.storage.size, 0);
  assert.equal((await up(w, tPrem, p.id, GLB, 'application/octet-stream')).status, 200); // algunas apps suben así
});

test('AISLAMIENTO: otro restaurante no puede tocar el modelo de este', async () => {
  const { w, tPrem, tOtro } = setup();
  const [p] = await seed(w, tPrem);
  assert.equal((await up(w, tOtro, p.id)).status, 404);
  await up(w, tPrem, p.id);
  assert.equal((await w.call(tOtro, 'DELETE', `/owner/products/${p.id}/model`)).status, 404);
  assert.ok(w.t.products[0].model_path);
  assert.equal((await w.call(null, 'POST', `/owner/products/${p.id}/model`, undefined, { raw: GLB, type: 'model/gltf-binary' })).status, 401);
});

test('límite por restaurante: el que sobra se rechaza y reemplazar no cuenta', async () => {
  const { w, tPrem, tAdmin, P } = setup();
  const prods = await seed(w, tPrem, 3);
  assert.equal((await w.call(tAdmin, 'PATCH', `/admin/restaurants/${P.id}`, { model_limit: 2 })).status, 200);
  assert.equal((await up(w, tPrem, prods[0].id)).status, 200);
  assert.equal((await up(w, tPrem, prods[1].id)).status, 200);
  const tercero = await up(w, tPrem, prods[2].id);
  assert.equal(tercero.status, 409); assert.match(tercero.body.error, /2 de 2/);
  assert.equal((await up(w, tPrem, prods[0].id)).status, 200); // reemplazo permitido
  assert.deepEqual((await w.call(tPrem, 'GET', '/owner/menu')).body.models, { used: 2, limit: 2 });
  assert.equal((await w.call(tAdmin, 'PATCH', `/admin/restaurants/${P.id}`, { model_limit: 500 })).status, 400);
  assert.equal((await w.call(tAdmin, 'PATCH', `/admin/restaurants/${P.id}`, { model_limit: -1 })).status, 400);
  assert.equal((await w.call(tPrem, 'PATCH', `/admin/restaurants/${P.id}`, { model_limit: 100 })).status, 403);
});

test('publicar: el menú público muestra el modelo solo en Premium y el archivo viejo se limpia', async () => {
  const { w, tPrem, P } = setup();
  const [p] = await seed(w, tPrem);
  const a = (await up(w, tPrem, p.id)).body.product.model_path;
  assert.equal((await w.call(tPrem, 'POST', '/owner/publish')).status, 200);
  const pub = (await w.call(null, 'GET', '/public/menu/premium-x')).body;
  assert.match(pub.categories[0].products[0].model_url, /\.glb$/);
  // reemplazar: mientras no se publique, el viejo sigue guardado (el menú público lo usa)
  await up(w, tPrem, p.id);
  assert.ok(w.storage.has(a));
  await w.call(tPrem, 'POST', '/owner/publish');
  assert.ok(!w.storage.has(a), 'el modelo reemplazado se borra tras publicar');
  assert.equal(w.storage.size, 1);
  // baja de plan: el modelo deja de mostrarse aunque siga guardado
  P.plan = 'profesional';
  assert.equal((await w.call(null, 'GET', '/public/menu/premium-x')).body.categories[0].products[0].model_url, null);
});

test('quitar el producto o la categoría encola su modelo para borrarlo', async () => {
  const { w, tPrem } = setup();
  const [p, q] = await seed(w, tPrem, 2);
  const pa = (await up(w, tPrem, p.id)).body.product.model_path;
  const qa = (await up(w, tPrem, q.id)).body.product.model_path;
  await w.call(tPrem, 'DELETE', `/owner/products/${p.id}`);
  assert.ok(w.t.pending_image_deletes.some((x) => x.path === pa));
  const catId = w.t.categories[0].id;
  await w.call(tPrem, 'DELETE', `/owner/categories/${catId}`);
  assert.ok(w.t.pending_image_deletes.some((x) => x.path === qa));
  await w.call(tPrem, 'POST', '/owner/products', { category_id: (await w.call(tPrem, 'POST', '/owner/categories', { name: 'X' })).body.category.id, name: 'Y', price_ars: 1 });
  await w.call(tPrem, 'POST', '/owner/publish');
  assert.equal(w.storage.size, 0);
});

test('duplicar un platillo NO copia el modelo (ahorra espacio)', async () => {
  const { w, tPrem } = setup();
  const [p] = await seed(w, tPrem);
  await up(w, tPrem, p.id);
  const d = (await w.call(tPrem, 'POST', `/owner/products/${p.id}/duplicate`)).body.product;
  assert.equal(d.model_path ?? null, null);
});

test('ADMIN: lista platillos, sube y quita modelos de cualquier restaurante Premium, con auditoría', async () => {
  const { w, tPrem, tAdmin, tPro, P, Q } = setup();
  const [p] = await seed(w, tPrem);
  const list = await w.call(tAdmin, 'GET', `/admin/restaurants/${P.id}/products`);
  assert.equal(list.status, 200); assert.equal(list.body.enabled, true);
  assert.deepEqual(list.body.models, { used: 0, limit: 15 });
  assert.equal(list.body.products[0].has_model, false);
  assert.equal((await w.call(tAdmin, 'POST', `/admin/restaurants/${P.id}/products/${p.id}/model`, undefined, { raw: GLB, type: 'model/gltf-binary' })).status, 200);
  assert.ok(w.t.products[0].model_path);
  assert.equal((await w.call(tAdmin, 'GET', `/admin/restaurants/${P.id}/products`)).body.products[0].has_model, true);
  assert.equal((await w.call(tAdmin, 'DELETE', `/admin/restaurants/${P.id}/products/${p.id}/model`)).status, 200);
  assert.equal(w.t.products[0].model_path, null);
  assert.deepEqual(w.t.audit_log.map((a) => a.action).filter((a) => a.startsWith('modelo_3d')), ['modelo_3d_subido', 'modelo_3d_quitado']);
  // plan Profesional: aunque sea admin, la regla de plan se respeta
  const [q] = await seed(w, tPro);
  assert.equal((await w.call(tAdmin, 'GET', `/admin/restaurants/${Q.id}/products`)).body.enabled, false);
  assert.equal((await w.call(tAdmin, 'POST', `/admin/restaurants/${Q.id}/products/${q.id}/model`, undefined, { raw: GLB, type: 'model/gltf-binary' })).status, 403);
  // un producto de otro restaurante no se puede alcanzar con el id de este
  assert.equal((await w.call(tAdmin, 'POST', `/admin/restaurants/${P.id}/products/${q.id}/model`, undefined, { raw: GLB, type: 'model/gltf-binary' })).status, 404);
  // no-admins fuera
  assert.equal((await w.call(tPrem, 'GET', `/admin/restaurants/${P.id}/products`)).status, 403);
  assert.equal((await w.call(tPrem, 'POST', `/admin/restaurants/${P.id}/products/${p.id}/model`, undefined, { raw: GLB, type: 'model/gltf-binary' })).status, 403);
  assert.equal((await w.call(null, 'DELETE', `/admin/restaurants/${P.id}/products/${p.id}/model`)).status, 401);
});
