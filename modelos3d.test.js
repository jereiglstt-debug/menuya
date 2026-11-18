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
// Solo el administrador sube modelos. `up(w, tAdmin, restaurante, productoId, bytes, tipo)`.
const up = (w, tAdmin, R, id, bytes = GLB, type = 'model/gltf-binary') => w.call(tAdmin, 'POST', `/admin/restaurants/${R.id}/products/${id}/model`, undefined, { raw: bytes, type });
const down = (w, tAdmin, R, id) => w.call(tAdmin, 'DELETE', `/admin/restaurants/${R.id}/products/${id}/model`);

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

test('el ADMIN sube, reemplaza y quita un modelo; el dueño lo ve (solo lectura) en el borrador y la vista previa', async () => {
  const { w, tPrem, tAdmin, P } = setup();
  const [p] = await seed(w, tPrem);
  const r = await up(w, tAdmin, P, p.id);
  assert.equal(r.status, 200);
  assert.match(w.t.products[0].model_path, /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.glb$/);
  assert.equal(w.storage.size, 1);
  const menu = (await w.call(tPrem, 'GET', '/owner/menu')).body;
  assert.match(menu.categories[0].products[0].model_url, /menu-images\/.+\.glb$/);
  assert.ok((await w.call(tPrem, 'GET', '/owner/preview')).body.categories[0].products[0].model_url);
  const first = w.t.products[0].model_path;
  assert.equal((await up(w, tAdmin, P, p.id)).status, 200);        // reemplazo: el viejo queda pendiente de borrar
  assert.notEqual(w.t.products[0].model_path, first);
  assert.ok(w.t.pending_image_deletes.some((x) => x.path === first));
  assert.equal((await down(w, tAdmin, P, p.id)).status, 200);
  assert.equal(w.t.products[0].model_path, null);
});

test('LOS DUEÑOS NO PUEDEN subir ni quitar modelos: ni por ruta, ni al crear/editar un platillo', async () => {
  const { w, tPrem, tAdmin, P } = setup();
  const [p] = await seed(w, tPrem);
  // las rutas del dueño ya no existen
  for (const [m, body] of [['POST', { raw: GLB, type: 'model/gltf-binary' }], ['DELETE', undefined]]) {
    const r = await w.call(tPrem, m, `/owner/products/${p.id}/model`, undefined, body);
    assert.equal(r.status, 404, `${m} del dueño debe no existir`);
  }
  assert.equal(w.storage.size, 0);
  // intentar colar model_path al crear o editar un platillo no hace nada
  const cat = w.t.categories[0].id;
  const c = (await w.call(tPrem, 'POST', '/owner/products', { category_id: cat, name: 'Colado', price_ars: 1, model_path: `${P.id}/falso.glb` })).body.product;
  assert.equal(c.model_path ?? null, null);
  await w.call(tPrem, 'PATCH', `/owner/products/${p.id}`, { name: 'Pizza 0', price_ars: 9000, model_path: `${P.id}/falso.glb` });
  assert.equal(w.t.products.find((x) => x.id === p.id).model_path ?? null, null);
  // si el admin carga uno, el dueño tampoco puede quitarlo
  await up(w, tAdmin, P, p.id);
  const guardado = w.t.products.find((x) => x.id === p.id).model_path;
  assert.equal((await w.call(tPrem, 'DELETE', `/owner/products/${p.id}/model`)).status, 404);
  assert.equal(w.t.products.find((x) => x.id === p.id).model_path, guardado);
});

test('Básico y Profesional: ni el admin puede subir (403) y no se guarda nada', async () => {
  const { w, tPro, tAdmin, Q } = setup();
  const [p] = await seed(w, tPro);
  const r = await up(w, tAdmin, Q, p.id);
  assert.equal(r.status, 403);
  assert.equal(w.storage.size, 0);
  assert.equal(w.t.products[0].model_path ?? null, null);
});

test('archivos inválidos se rechazan: imagen, tipo, grande, vacío', async () => {
  const { w, tPrem, tAdmin, P } = setup();
  const [p] = await seed(w, tPrem);
  assert.equal((await up(w, tAdmin, P, p.id, JPEG)).status, 400);
  assert.equal((await up(w, tAdmin, P, p.id, GLB, 'image/png')).status, 415);
  assert.equal((await up(w, tAdmin, P, p.id, new Uint8Array(0))).status, 400);
  assert.equal((await up(w, tAdmin, P, p.id, makeGlb(undefined, { extra: 8 * MB }))).status, 413);
  assert.equal(w.storage.size, 0);
  assert.equal((await up(w, tAdmin, P, p.id, GLB, 'application/octet-stream')).status, 200); // algunas apps suben así
});

test('AISLAMIENTO: un producto de otro restaurante no se alcanza con el id de este', async () => {
  const { w, tPrem, tOtro, tAdmin, P, O } = setup();
  const [p] = await seed(w, tPrem);
  const [q] = await seed(w, tOtro);
  assert.equal((await up(w, tAdmin, O, p.id)).status, 404);
  assert.equal((await up(w, tAdmin, P, q.id)).status, 404);
  assert.equal(w.storage.size, 0);
  // sin sesión o sin ser admin: fuera
  assert.equal((await up(w, null, P, p.id)).status, 401);
  assert.equal((await up(w, tPrem, P, p.id)).status, 403);
  assert.equal((await up(w, tOtro, P, p.id)).status, 403);
  assert.equal(w.storage.size, 0);
});

test('límite por restaurante: el que sobra se rechaza y reemplazar no cuenta', async () => {
  const { w, tPrem, tAdmin, P } = setup();
  const prods = await seed(w, tPrem, 3);
  assert.equal((await w.call(tAdmin, 'PATCH', `/admin/restaurants/${P.id}`, { model_limit: 2 })).status, 200);
  assert.equal((await up(w, tAdmin, P, prods[0].id)).status, 200);
  assert.equal((await up(w, tAdmin, P, prods[1].id)).status, 200);
  const tercero = await up(w, tAdmin, P, prods[2].id);
  assert.equal(tercero.status, 409); assert.match(tercero.body.error, /2 de 2/);
  assert.equal((await up(w, tAdmin, P, prods[0].id)).status, 200); // reemplazo permitido
  assert.deepEqual((await w.call(tAdmin, 'GET', `/admin/restaurants/${P.id}/products`)).body.models, { used: 2, limit: 2 });
  assert.equal((await w.call(tAdmin, 'PATCH', `/admin/restaurants/${P.id}`, { model_limit: 500 })).status, 400);
  assert.equal((await w.call(tAdmin, 'PATCH', `/admin/restaurants/${P.id}`, { model_limit: -1 })).status, 400);
  assert.equal((await w.call(tPrem, 'PATCH', `/admin/restaurants/${P.id}`, { model_limit: 100 })).status, 403);
});

test('publicar: el menú público muestra el modelo solo en Premium y el archivo viejo se limpia', async () => {
  const { w, tPrem, tAdmin, P } = setup();
  const [p] = await seed(w, tPrem);
  await up(w, tAdmin, P, p.id);
  const a = w.t.products[0].model_path;
  assert.equal((await w.call(tPrem, 'POST', '/owner/publish')).status, 200);
  const pub = (await w.call(null, 'GET', '/public/menu/premium-x')).body;
  assert.match(pub.categories[0].products[0].model_url, /\.glb$/);
  await up(w, tAdmin, P, p.id);                                      // reemplazo: mientras no se publique, el viejo sigue guardado
  assert.ok(w.storage.has(a));
  await w.call(tPrem, 'POST', '/owner/publish');
  assert.ok(!w.storage.has(a), 'el modelo reemplazado se borra tras publicar');
  assert.equal(w.storage.size, 1);
  P.plan = 'profesional';                                           // baja de plan: deja de mostrarse aunque siga guardado
  assert.equal((await w.call(null, 'GET', '/public/menu/premium-x')).body.categories[0].products[0].model_url, null);
});

test('quitar el producto o la categoría encola su modelo para borrarlo', async () => {
  const { w, tPrem, tAdmin, P } = setup();
  const [p, q] = await seed(w, tPrem, 2);
  await up(w, tAdmin, P, p.id); await up(w, tAdmin, P, q.id);
  const pa = w.t.products.find((x) => x.id === p.id).model_path, qa = w.t.products.find((x) => x.id === q.id).model_path;
  await w.call(tPrem, 'DELETE', `/owner/products/${p.id}`);
  assert.ok(w.t.pending_image_deletes.some((x) => x.path === pa));
  await w.call(tPrem, 'DELETE', `/owner/categories/${w.t.categories[0].id}`);
  assert.ok(w.t.pending_image_deletes.some((x) => x.path === qa));
  await w.call(tPrem, 'POST', '/owner/products', { category_id: (await w.call(tPrem, 'POST', '/owner/categories', { name: 'X' })).body.category.id, name: 'Y', price_ars: 1 });
  await w.call(tPrem, 'POST', '/owner/publish');
  assert.equal(w.storage.size, 0);
});

test('duplicar un platillo NO copia el modelo (ahorra espacio)', async () => {
  const { w, tPrem, tAdmin, P } = setup();
  const [p] = await seed(w, tPrem);
  await up(w, tAdmin, P, p.id);
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
  assert.equal((await up(w, tAdmin, P, p.id)).status, 200);
  assert.equal((await w.call(tAdmin, 'GET', `/admin/restaurants/${P.id}/products`)).body.products[0].has_model, true);
  assert.equal((await down(w, tAdmin, P, p.id)).status, 200);
  assert.equal(w.t.products[0].model_path, null);
  assert.deepEqual(w.t.audit_log.map((a) => a.action).filter((a) => a.startsWith('modelo_3d')), ['modelo_3d_subido', 'modelo_3d_quitado']);
  const [q] = await seed(w, tPro);
  assert.equal((await w.call(tAdmin, 'GET', `/admin/restaurants/${Q.id}/products`)).body.enabled, false);
  assert.equal((await w.call(tPrem, 'GET', `/admin/restaurants/${P.id}/products`)).status, 403);
  assert.equal((await down(w, tPrem, P, p.id)).status, 403);
  assert.equal((await down(w, null, P, p.id)).status, 401);
});
