import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFake, ADMIN_TOKEN, OWNER_TOKEN } from './helpers.js';
import { accountState } from '../server/handlers/admin.js';

const NEW = { name: 'Rotisería Don Pepe', slug: 'don-pepe', plan: 'profesional', owner_email: 'Pepe@Mail.com' };

test('sin sesión → 401; con sesión inválida → 401', async () => {
  const { call } = makeFake();
  assert.equal((await call('GET', '/admin/restaurants')).status, 401);
  assert.equal((await call('GET', '/admin/restaurants', { token: 'basura' })).status, 401);
  assert.equal((await call('GET', '/admin/restaurants', { token: 'aaa.noexiste.zzz' })).status, 401);
});

test('un propietario NO puede usar endpoints de administrador', async () => {
  const { call, state } = makeFake();
  for (const [m, path, body] of [
    ['GET', '/admin/restaurants'], ['POST', '/admin/restaurants', NEW],
    ['GET', '/admin/audit'], ['PATCH', '/admin/restaurants/00000000-0000-4000-8000-000000000001', { status: 'suspendido' }],
  ]) {
    const res = await call(m, path, { token: OWNER_TOKEN, body });
    assert.equal(res.status, 403, `${m} ${path}`);
  }
  assert.equal(state.restaurants.length, 0);
});

test('el administrador crea restaurante, recibe enlace de invitación y queda auditado', async () => {
  const { call, state } = makeFake();
  const res = await call('POST', '/admin/restaurants', { token: ADMIN_TOKEN, body: NEW });
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.match(data.invite_link, /^https:\/\/fake\.supabase\.co\/verify/);
  assert.equal(data.restaurant.owner_email, 'pepe@mail.com');
  assert.equal(data.restaurant.estado_cuenta, 'sin_suscripcion');
  assert.equal(state.owners.length, 1);
  assert.equal(state.audit[0].action, 'restaurante_creado');
  assert.ok(!JSON.stringify(state.audit).includes('SECRET'), 'el enlace no debe guardarse en la auditoría');
});

test('slug duplicado → 409 con mensaje por campo', async () => {
  const { call } = makeFake();
  await call('POST', '/admin/restaurants', { token: ADMIN_TOKEN, body: NEW });
  const res = await call('POST', '/admin/restaurants', { token: ADMIN_TOKEN, body: { ...NEW, owner_email: 'otro@mail.com' } });
  assert.equal(res.status, 409);
  assert.ok((await res.json()).details.slug);
});

test('si falla la invitación se deshace el restaurante (sin cuentas a medias)', async () => {
  const { call, state } = makeFake({ failInvite: true });
  const res = await call('POST', '/admin/restaurants', { token: ADMIN_TOKEN, body: NEW });
  assert.equal(res.status, 502);
  assert.equal(state.restaurants.length, 0);
});

test('no existe registro público: crear sin sesión falla', async () => {
  const { call, state } = makeFake();
  assert.equal((await call('POST', '/admin/restaurants', { body: NEW })).status, 401);
  assert.equal(state.restaurants.length, 0);
});

test('el slug no se puede modificar', async () => {
  const { call } = makeFake();
  const created = await (await call('POST', '/admin/restaurants', { token: ADMIN_TOKEN, body: NEW })).json();
  const res = await call('PATCH', `/admin/restaurants/${created.restaurant.id}`, { token: ADMIN_TOKEN, body: { slug: 'nuevo' } });
  assert.equal(res.status, 400);
});

test('cambiar plan y suspender quedan auditados', async () => {
  const { call, state } = makeFake();
  const { restaurant } = await (await call('POST', '/admin/restaurants', { token: ADMIN_TOKEN, body: NEW })).json();
  let res = await call('PATCH', `/admin/restaurants/${restaurant.id}`, { token: ADMIN_TOKEN, body: { plan: 'premium' } });
  assert.equal((await res.json()).restaurant.plan, 'premium');
  res = await call('PATCH', `/admin/restaurants/${restaurant.id}`, { token: ADMIN_TOKEN, body: { status: 'suspendido' } });
  assert.equal((await res.json()).restaurant.estado_cuenta, 'suspendido');
  const actions = state.audit.map((a) => a.action);
  assert.ok(actions.includes('plan_cambiado') && actions.includes('cuenta_suspendida'));
});

test('id con intento de inyección → 400, nunca llega a la base', async () => {
  const { call } = makeFake();
  const res = await call('GET', `/admin/restaurants/${encodeURIComponent("x' or '1'='1")}`, { token: ADMIN_TOKEN });
  assert.equal(res.status, 400);
});

test('registrar pago usa la función atómica con datos validados', async () => {
  const { call, state } = makeFake();
  const { restaurant } = await (await call('POST', '/admin/restaurants', { token: ADMIN_TOKEN, body: NEW })).json();
  const bad = await call('POST', `/admin/restaurants/${restaurant.id}/payments`, { token: ADMIN_TOKEN, body: { plan: 'premium', amount_ars: -5 } });
  assert.equal(bad.status, 400);
  const res = await call('POST', `/admin/restaurants/${restaurant.id}/payments`, {
    token: ADMIN_TOKEN,
    body: { plan: 'premium', amount_ars: 20000, paid_on: '2026-10-01', starts_on: '2026-10-01', expires_on: '2026-10-31', method: 'transferencia' },
  });
  assert.equal(res.status, 201);
  assert.equal(state.rpcCalls.length, 1);
  assert.equal(state.rpcCalls[0].p_plan, 'premium');
});

test('enlace de recuperación no se guarda en la auditoría', async () => {
  const { call, state } = makeFake();
  const { restaurant } = await (await call('POST', '/admin/restaurants', { token: ADMIN_TOKEN, body: NEW })).json();
  const res = await call('POST', `/admin/restaurants/${restaurant.id}/access-link`, { token: ADMIN_TOKEN, body: { type: 'recovery' } });
  assert.equal(res.status, 200);
  assert.match((await res.json()).link, /type=recovery/);
  assert.ok(!JSON.stringify(state.audit).includes('SECRET'));
});

test('estado de cuenta: suspendido > sin suscripción > vencido > activo', () => {
  const now = '2026-10-25';
  assert.equal(accountState({ status: 'suspendido', subscriptions: [{ expires_on: '2027-01-01' }] }, now), 'suspendido');
  assert.equal(accountState({ status: 'activo', subscriptions: [] }, now), 'sin_suscripcion');
  assert.equal(accountState({ status: 'activo', subscriptions: [{ expires_on: '2026-10-24' }] }, now), 'vencido');
  assert.equal(accountState({ status: 'activo', subscriptions: [{ expires_on: '2026-10-25' }, { expires_on: '2026-01-01' }] }, now), 'activo');
});

test('rutas inexistentes y métodos incorrectos', async () => {
  const { call } = makeFake();
  assert.equal((await call('GET', '/no-existe')).status, 404);
  assert.equal((await call('DELETE', '/admin/restaurants')).status, 405);
});

test('/api/config avisa qué variables faltan, sin exponer valores', async () => {
  const { handle } = await import('../server/router.js');
  const res = await handle(new Request('https://x.pages.dev/api/config'), { SUPABASE_ANON_KEY: 'k' });
  assert.equal(res.status, 500);
  const d = await res.json();
  assert.ok(d.missing.includes('SUPABASE_URL') && !JSON.stringify(d).includes('"k"'));
  const ok = await handle(new Request('https://x.pages.dev/api/config'),
    { SUPABASE_URL: 'https://a.supabase.co/rest/v1', SUPABASE_ANON_KEY: 'k', SUPABASE_SERVICE_ROLE_KEY: 's', SITE_URL: 'https://x' });
  assert.equal((await ok.json()).supabaseUrl, 'https://a.supabase.co');
});
