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
const tokens = { 'pro@x.com': w.addUser('pro'), 'bas@x.com': w.addUser('bas') };
w.addRestaurant('res-pro', 'pro', { plan: 'profesional' });
w.addRestaurant('res-bas', 'bas', { plan: 'basico' });
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
  ok('panel: pestañas', (await page.locator('.tab').allTextContents()).join('|') === 'Menú|Promociones|Diseño|Código QR');
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
  await page.click('.tab:has-text("Promociones")');
  ok('básico: promociones bloqueadas', await page.locator('.lock-note').count() === 1 && await page.locator('#pr-t').count() === 0);
  await page.click('.tab:has-text("Menú")'); await page.click('text=Publicar cambios'); await page.waitForSelector('text=Tu menú está al día');
  const pub = await newPage(); await pub.goto(`${base}/res-bas`); await pub.waitForSelector('.menu');
  ok('básico público: sin carrito, con consulta por WhatsApp', await pub.locator('.m-add').count() === 0 && await pub.locator('.m-bar a.m-btn').count() === 1);
  ok('básico: enlace de consulta', (await pub.getAttribute('.m-bar a.m-btn', 'href')).startsWith('https://wa.me/5491122334455?text='));
}
await browser.close(); server.close();
for (const [c, n, e] of results) console.log(c ? 'OK  ' : 'FALLA', n, c ? '' : e);
console.log('problemas de consola/CSP:', problems.length ? problems : 'ninguno');
