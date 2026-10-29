// Prueba de navegador (Chromium + Playwright) contra el servidor simulado, con el CSP real de public/_headers.
// NO forma parte de `npm test` (necesita Playwright): node test/e2e/navegador.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = (await import('playwright'))); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const { makeWorld } = await import(`${ROOT}/test/world.js`);
const w = makeWorld();
const tokens = { 'pro@x.com': w.addUser('pro'), 'bas@x.com': w.addUser('bas'), 'prem@x.com': w.addUser('prem') };
w.addRestaurant('res-pro', 'pro', { plan: 'profesional' });
w.addRestaurant('res-bas', 'bas', { plan: 'basico' });
w.addRestaurant('res-prem', 'prem', { plan: 'premium' });
const csp = fs.readFileSync(`${ROOT}/public/_headers`, 'utf8').match(/Content-Security-Policy: (.*)/)[1];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const chunks = []; for await (const c of req) chunks.push(c); const buf = Buffer.concat(chunks);
  const send = (s, body, type = 'application/json') => { res.writeHead(s, { 'content-type': type, 'content-security-policy': csp }); res.end(body); };
  if (u.pathname === '/api/config') return send(200, JSON.stringify({ supabaseUrl: `http://localhost:${server.address().port}`, supabaseAnonKey: 'anon' }));
  if (u.pathname === '/auth/v1/token') {
    const b = JSON.parse(buf.toString()); const t = tokens[b.email];
    return t ? send(200, JSON.stringify({ access_token: t, refresh_token: 'r', expires_in: 3600 })) : send(400, '{}');
  }
  if (u.pathname.startsWith('/api/')) {
    const token = (req.headers.authorization || '').replace('Bearer ', '') || null;
    const ct = req.headers['content-type'] || '';
    const isJson = ct.includes('json');
    const r = await w.call(token, req.method, u.pathname.slice(4) + u.search,
      isJson && buf.length ? JSON.parse(buf.toString()) : undefined, !isJson && buf.length ? { raw: new Uint8Array(buf), type: ct } : {});
    return send(r.status, JSON.stringify(r.body ?? {}));
  }
  let f = path.join(ROOT, 'public', u.pathname);
  if (u.pathname.endsWith('/')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT, 'public/menu/index.html'); // /<slug>
  send(200, fs.readFileSync(f), MIME[path.extname(f)] || 'application/octet-stream');
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
const results = []; const problems = [];
const ok = (name, cond, extra = '') => { results.push([cond, name, extra]); };
async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  return page;
}
async function login(page, email) {
  await page.goto(`${base}/panel/`);
  await page.fill('#e', email); await page.fill('#p', 'x'); await page.click('button[type=submit]');
  await page.waitForSelector('.tabs');
}

// ---- Profesional ----
{
  const page = await newPage(); await login(page, 'pro@x.com');
  ok('panel: pestañas', (await page.locator('.tab').allTextContents()).join('|') === 'Menú|Pedidos|Promociones|Diseño|Código QR|Métodos de pago');
  await page.click('text=Nueva categoría'); await page.fill('#dlg-in', 'Pizzas'); await page.click('dialog button:has-text("Crear")');
  await page.waitForSelector('.cat');
  await page.click('text=Agregar producto').catch(async () => { await page.click('.cat >> text=/Agregar|Nuevo/'); });
  await page.fill('#f-name', 'Muzzarella'); await page.fill('#f-price', '9500'); await page.check('#f-ft');
  await page.click('dialog button:has-text("Crear producto")'); await page.waitForSelector('.tag-star');
  ok('producto destacado marcado en el panel', await page.locator('.tag-star').count() === 1);
  await page.click('.cat >> text=/Agregar|Nuevo/'); await page.fill('#f-name', 'Fugazza'); await page.fill('#f-price', '8000');
  await page.click('dialog button:has-text("Crear producto")'); await page.waitForSelector('text=Fugazza');
  await page.fill('#b-wa', '+54 9 11 2233-4455'); await page.click('text=Guardar datos'); await page.waitForTimeout(400);
  ok('whatsapp guardado normalizado', (await page.inputValue('#b-wa')) === '5491122334455');
  await page.click('.tab:has-text("Promociones")'); await page.fill('#pr-t', '2x1 martes'); await page.fill('#pr-d', 'En pizzas'); await page.click('text=Agregar promoción');
  await page.waitForSelector('.promo-row');
  await page.click('.tab:has-text("Diseño")'); await page.waitForSelector('.design-prev .menu');
  ok('diseño: promo y destacado en vista previa', await page.locator('.design-prev .m-promo').count() === 1 && await page.locator('.design-prev .m-featured').count() === 1);
  await page.click('.opt:has-text("Moderno")'); await page.click('text=Guardar diseño'); await page.waitForTimeout(400);
  await page.click('.tab:has-text("Código QR")'); await page.waitForSelector('canvas.qr-canvas');
  ok('QR dibujado', await page.evaluate(() => document.querySelector('canvas.qr-canvas').width > 500));
  await page.click('text=Publicar cambios'); await page.waitForSelector('text=Tu menú está al día');
  // público
  const pub = await newPage(); await pub.goto(`${base}/res-pro`); await pub.waitForSelector('.menu');
  ok('público: plantilla moderno', (await pub.getAttribute('.menu', 'data-template')) === 'moderno');
  ok('público: promo + destacados', await pub.locator('.m-promo').count() === 1 && await pub.locator('#m-destacados .m-item').count() === 1);
  await pub.locator('#m-cat-0 .m-add').first().click(); await pub.locator('#m-cat-0 .m-add').first().click(); await pub.locator('#m-cat-0 .m-add').nth(1).click();
  ok('carrito: barra con total', (await pub.locator('.m-bar .m-btn').textContent()).includes('3 productos'), await pub.locator('.m-bar .m-btn').textContent());
  await pub.click('.m-bar .m-btn'); await pub.waitForSelector('dialog.m-cart[open]');
  await pub.fill('#m-cust', 'Ana'); await pub.fill('#m-note', 'Sin cebolla');
  const href = await pub.getAttribute('dialog.m-cart a.m-btn', 'href');
  const text = new URL(href).searchParams.get('text');
  ok('whatsapp: enlace y mensaje', href.startsWith('https://wa.me/5491122334455?text=') && /2 x Muzzarella/.test(text) && /Nombre: Ana/.test(text) && /Sin cebolla/.test(text), text);
  await pub.screenshot({ path: '/tmp/e2e-pro-cart.png' });
  await pub.click('dialog.m-cart .m-q >> nth=0'); await pub.waitForTimeout(100);
  ok('carrito: quitar uno baja el contador', (await pub.locator('.m-bar .m-btn').textContent()).includes('2 productos'));
  await pub.locator('dialog.m-cart .m-btn.alt').click();
  await pub.screenshot({ path: '/tmp/e2e-pro-menu.png' });
  // vista previa del panel
  await page.click('.tab:has-text("Menú")'); await page.click('text=Vista previa'); await page.waitForSelector('dialog .preview-frame .menu');
  ok('vista previa del panel con carrito', await page.locator('dialog .preview-frame .m-add').count() >= 1);
}
// ---- Básico ----
{
  const page = await newPage(); await login(page, 'bas@x.com');
  await page.click('text=Nueva categoría'); await page.fill('#dlg-in', 'Café'); await page.click('dialog button:has-text("Crear")'); await page.waitForSelector('.cat');
  await page.click('.cat >> text=/Agregar|Nuevo/');
  ok('básico: destacado bloqueado', await page.locator('#f-ft').count() === 0 && await page.locator('dialog .lock-note').count() === 1);
  await page.fill('#f-name', 'Cortado'); await page.fill('#f-price', '2000'); await page.click('dialog button:has-text("Crear producto")'); await page.waitForSelector('text=Cortado');
  await page.fill('#b-wa', '5491122334455'); await page.click('text=Guardar datos'); await page.waitForTimeout(300);
  await page.click('.tab[data-k=pagos]'); await page.waitForSelector('#pm-efectivo');
  await page.check('#pm-credito'); await page.click('text=Guardar métodos de pago'); await page.waitForSelector('.toast >> text=Métodos de pago guardados');
  await page.click('.tab:has-text("Promociones")');
  ok('básico: promociones bloqueadas', await page.locator('.lock-note').count() === 1 && await page.locator('#pr-t').count() === 0);
  await page.click('.tab:has-text("Menú")'); await page.click('text=Publicar cambios'); await page.waitForSelector('text=Tu menú está al día');
  const pub = await newPage(); await pub.goto(`${base}/res-bas`); await pub.waitForSelector('.menu');
  ok('básico público: sin carrito, con consulta por WhatsApp', await pub.locator('.m-add').count() === 0 && await pub.locator('.m-bar a.m-btn').count() === 1);
  ok('básico: medios de pago en el menú', /Medios de pago: Efectivo · Tarjeta de crédito/.test(await pub.textContent('.m-pay')));
  ok('básico: enlace de consulta', (await pub.getAttribute('.m-bar a.m-btn', 'href')).startsWith('https://wa.me/5491122334455?text='));
}
// ---- Premium: pedidos nativos ----
{
  const tk = tokens['prem@x.com'];
  const cat = (await w.call(tk, 'POST', '/owner/categories', { name: 'Pizzas' })).body.category;
  await w.call(tk, 'POST', '/owner/products', { category_id: cat.id, name: 'Muzzarella', price_ars: 9500 });
  await w.call(tk, 'POST', '/owner/products', { category_id: cat.id, name: 'Fugazza', price_ars: 8000 });
  await w.call(tk, 'POST', '/owner/publish');
  const page = await newPage(); await login(page, 'prem@x.com');
  ok('premium: pestaña Pedidos', (await page.locator('.tab').allTextContents()).some((t) => t.startsWith('Pedidos')));
  await page.click('.tab[data-k=pedidos]'); await page.waitForSelector('.state-bar button');
  await page.click('.sub .tab:has-text("Mesas")'); await page.fill('#t-c', '3'); await page.click('text=Crear mesas'); await page.waitForSelector('.promo-row');
  ok('mesas creadas', await page.locator('.promo-row').count() === 3);
  await page.click('.sub .tab:has-text("Ajustes")'); await page.check('#a-del'); await page.fill('#a-fee', '1500');
  await page.click('text=Guardar ajustes'); await page.waitForSelector('.toast >> text=Ajustes guardados');
  await page.click('.state-bar button:has-text("Abrir")'); await page.waitForSelector('.state-bar .b-activo');
  await page.click('.tab[data-k=pagos]'); await page.waitForSelector('#pm-efectivo');
  await page.check('#pm-debito'); await page.check('#pm-combinado'); await page.waitForSelector('.pay-combo:not(.hidden)');
  await page.click('text=Guardar métodos de pago'); await page.waitForTimeout(200);
  ok('pagos: combinado exige 2 combinaciones', await page.locator('.form-error:not(.hidden)').count() === 1);
  await page.check('#pc-efectivo'); await page.check('#pc-debito'); await page.click('text=Guardar métodos de pago'); await page.waitForSelector('.toast >> text=Métodos de pago guardados');
  await page.screenshot({ path: '/tmp/e2e-pagos-tab.png' });
  ok('pagos guardados en el servidor', JSON.stringify(w.t.restaurant_payment_settings.find((x) => x.methods.includes('combinado'))?.combo_options) === '["efectivo","debito"]');
  await page.click('.tab[data-k=qr]'); await page.waitForSelector('.qr-table canvas');
  ok('QR por mesa', await page.locator('.qr-table canvas').count() === 3);
  const mesaId = w.t.restaurant_tables[0].id;

  const cli = await newPage(); await cli.goto(`${base}/res-prem?mesa=${mesaId}`); await cli.waitForSelector('.menu');
  await cli.locator('#m-cat-0 .m-add').first().click(); await cli.locator('#m-cat-0 .m-add').first().click();
  await cli.click('.m-bar .m-btn'); await cli.waitForSelector('dialog.m-cart[open] form');
  ok('pedido: opciones y mesa preseleccionada', (await cli.locator('#o-type').inputValue()) === 'mesa' && (await cli.locator('#o-type option').count()) === 3);
  await cli.selectOption('#o-type', 'take_away'); await cli.click('text=Confirmar pedido');
  await cli.waitForSelector('[data-f=customer_phone] .m-field-err:not(.hidden)');
  ok('pedido: errores por campo', (await cli.locator('[data-f=customer_name] .m-field-err:not(.hidden)').count()) === 1);
  ok('pago: opciones del cliente', (await cli.locator('#o-pay option').allTextContents()).join('|') === 'Elegí…|Efectivo|Tarjeta de débito|Combinado');
  ok('pago: menú muestra medios', /Medios de pago: Efectivo · Tarjeta de débito · Combinado/.test(await cli.textContent('.m-pay')));
  await cli.selectOption('#o-type', 'mesa'); await cli.fill('#o-name', 'Ana');
  await cli.selectOption('#o-pay', 'combinado'); await cli.waitForSelector('.m-combo:visible');
  await cli.check('#o-combo-efectivo'); await cli.click('text=Confirmar pedido');
  await cli.waitForSelector('[data-f=payment_combo] .m-field-err:not(.hidden)');
  ok('pago: combinado pide al menos dos', true);
  await cli.check('#o-combo-debito'); await cli.locator('#o-pay').scrollIntoViewIfNeeded(); await cli.screenshot({ path: '/tmp/e2e-pago.png' }); await cli.click('text=Confirmar pedido');
  await cli.waitForSelector('.m-order-num');
  ok('pedido: confirmado y seguimiento', (await cli.textContent('.m-order-num')) === 'Pedido #1' && /Esperando/.test(await cli.textContent('.m-order-status')), await cli.textContent('.m-order-status'));
  ok('seguimiento sin texto suelto', !/\bfalse\b|undefined|null/.test(await cli.textContent('dialog.m-cart')));
  await cli.screenshot({ path: '/tmp/e2e-pedido.png' });
  const o = w.t.orders[0];
  ok('servidor: total y mesa', o.total === 19000 && o.table_label === 'Mesa 1');
  ok('servidor: pago combinado guardado', o.payment_method === 'combinado' && JSON.stringify(o.payment_combo) === '["efectivo","debito"]');

  // el dueño recibe el aviso por sondeo (≤ 15 s)
  await page.click('.tab[data-k=pedidos]'); await page.click('.sub .tab:has-text("Cola")');
  await page.waitForSelector('.order.st-nuevo', { timeout: 20000 });
  ok('cola: llega el pedido', (await page.locator('.order.st-nuevo').textContent()).includes('Muzzarella'));
  ok('cola: muestra el pago combinado', (await page.locator('.order.st-nuevo').textContent()).includes('Combinado (Efectivo + Tarjeta de débito)'));
  ok('cola: insignia en la pestaña', /Pedidos \(1\)/.test(await page.textContent('.tab[data-k=pedidos]')));
  await page.click('text=Aceptar y preparar'); await page.waitForSelector('.order.st-en_preparacion');
  await page.screenshot({ path: '/tmp/e2e-cola.png', fullPage: true });
  await cli.reload(); await cli.waitForSelector('.menu'); await cli.click('text=Ver el estado de mi pedido #1');
  await cli.waitForSelector('.m-order-num');
  ok('cliente ve el nuevo estado', /preparación/.test(await cli.textContent('.m-order-status')));
  // pausar: el menú sigue pero sin pedidos
  await page.click('.state-bar button:has-text("Pausar")'); await page.waitForSelector('.state-bar .b-vencido');
  const cli2 = await newPage(); await cli2.goto(`${base}/res-prem`); await cli2.waitForSelector('.menu');
  ok('pausado: aviso y sin botones de agregar', await cli2.locator('.m-closed').count() === 1 && await cli2.locator('.m-add').count() === 0);
  await page.click('.sub .tab:has-text("Estadísticas")'); await page.waitForSelector('.stat-grid');
  ok('estadísticas visibles', await page.locator('.stat').count() >= 6);
}
await browser.close(); server.close();
for (const [c, n, e] of results) console.log(c ? 'OK  ' : 'FALLA', n, c ? '' : e);
console.log('problemas de consola/CSP:', problems.length ? problems : 'ninguno');
