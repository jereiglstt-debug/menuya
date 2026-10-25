import test from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../server/lib/supabase.js';

function capture(key) {
  let seen;
  const db = createDb(
    { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'sb_publishable_x', SUPABASE_SERVICE_ROLE_KEY: key },
    async (_u, init) => { seen = init.headers; return new Response('[]', { status: 200 }); },
  );
  return db.rest('restaurants').then(() => seen);
}

test('clave nueva sb_secret_: solo apikey, nunca Authorization Bearer', async () => {
  const h = await capture('sb_secret_abc123');
  assert.equal(h.apikey, 'sb_secret_abc123');
  assert.equal(h.authorization, undefined);
});
test('clave legacy JWT: apikey y Bearer', async () => {
  const h = await capture('aaa.bbb.ccc');
  assert.equal(h.authorization, 'Bearer aaa.bbb.ccc');
});

test('una SUPABASE_URL con ruta extra (/rest/v1) se normaliza al origen', async () => {
  let url;
  const db = createDb(
    { SUPABASE_URL: ' https://x.supabase.co/rest/v1/ ', SUPABASE_ANON_KEY: 'a', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_z' },
    async (u) => { url = u; return new Response('[]'); },
  );
  await db.rest('restaurants');
  assert.equal(url, 'https://x.supabase.co/rest/v1/restaurants');
});
