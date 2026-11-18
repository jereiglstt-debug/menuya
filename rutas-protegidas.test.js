import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handle } from '../server/router.js';

// Lee las rutas reales del router: ninguna ruta /owner/* ni /admin/* puede responder sin sesión.
const src = fs.readFileSync(new URL('../server/router.js', import.meta.url), 'utf8');
const routes = [...src.matchAll(/\['(GET|POST|PATCH|DELETE)',\s*\/\^(\\\/(?:owner|admin)[^/]*?.*?)\$\/,/g)]
  .map(([, method, re]) => ({ method, path: re.replace(/\\\//g, '/').replace(/\(\[\^\/\]\+\)/g, '00000000-0000-4000-8000-000000000001') }));

test('el router tiene rutas /owner y /admin para revisar', () => { assert.ok(routes.length > 40, `solo ${routes.length}`); });

test('todas las rutas /owner y /admin exigen sesión (401 sin token, 401 con token falso)', async () => {
  const ENV = { SUPABASE_URL: 'https://fake.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'a.b.c', SUPABASE_ANON_KEY: 'x', SITE_URL: 'https://x.test' };
  const fetchImpl = async (url) => (new URL(url).pathname === '/auth/v1/user' ? new Response('{}', { status: 401 }) : new Response('[]', { status: 200 }));
  for (const { method, path } of routes) {
    for (const headers of [{}, { authorization: 'Bearer basura' }]) {
      const res = await handle(new Request(`https://x.test/api${path}`, { method, headers, body: method === 'GET' ? undefined : '{}' }), ENV, fetchImpl);
      assert.equal(res.status, 401, `${method} ${path} respondió ${res.status}`);
    }
  }
});
