import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/[slug].js';

const run = async (path) => {
  let nexted = false; let assetUrl = null;
  const res = await onRequest({
    request: new Request(`https://x.pages.dev${path}`),
    next: async () => { nexted = true; return new Response('estatico'); },
    env: { ASSETS: { fetch: async (u) => { assetUrl = String(u); return new Response('<html>menu</html>', { headers: { 'content-type': 'text/html' } }); } } },
  });
  return { nexted, assetUrl, res };
};

test('slug válido sirve la página del menú', async () => {
  const r = await run('/pizzeria-a'); assert.ok(!r.nexted); assert.match(r.assetUrl, /\/menu\/$/);
});
test('rutas del sistema, archivos y slugs inválidos pasan de largo', async () => {
  for (const p of ['/admin', '/admin/', '/panel', '/menu', '/establecer-contrasena.html', '/favicon.ico', '/robots.txt', '/a', '/UPPER']) {
    assert.ok((await run(p)).nexted, p);
  }
});
