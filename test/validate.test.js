import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRestaurantInput, validatePaymentInput, isValidDate, isUuid } from '../server/lib/validate.js';

const ok = { name: 'La Esquina', slug: 'la-esquina', plan: 'basico', owner_email: 'Dueño@Mail.com' };

test('restaurante válido normaliza slug y correo', () => {
  const r = validateRestaurantInput({ ...ok, slug: ' La-Esquina ', owner_email: 'A@B.com' });
  assert.ok(r.ok);
  assert.equal(r.value.slug, 'la-esquina');
  assert.equal(r.value.owner_email, 'a@b.com');
});
test('rechaza slugs inválidos y reservados', () => {
  for (const slug of ['a', 'ab', '-abc', 'abc-', 'a--b', 'Con Espacios', 'ñandú', 'x'.repeat(41), '../etc']) {
    assert.ok(!validateRestaurantInput({ ...ok, slug }).ok, slug);
  }
  for (const slug of ['admin', 'api', 'panel', 'establecer-contrasena']) {
    assert.ok(validateRestaurantInput({ ...ok, slug }).errors.slug, slug);
  }
});
test('rechaza plan y correo inválidos', () => {
  assert.ok(validateRestaurantInput({ ...ok, plan: 'gratis' }).errors.plan);
  assert.ok(validateRestaurantInput({ ...ok, owner_email: 'no-es-correo' }).errors.owner_email);
});
test('edición parcial no exige campos ausentes', () => {
  const r = validateRestaurantInput({ status: 'suspendido' }, { partial: true });
  assert.ok(r.ok);
  assert.deepEqual(r.value, { status: 'suspendido' });
  assert.ok(!validateRestaurantInput({ status: 'borrado' }, { partial: true }).ok);
});
test('fechas', () => {
  assert.ok(isValidDate('2026-02-28'));
  assert.ok(!isValidDate('2026-02-30'));
  assert.ok(!isValidDate('26-1-1'));
});
test('pagos: monto y período', () => {
  const base = { plan: 'premium', amount_ars: 15000, paid_on: '2026-10-01', starts_on: '2026-10-01', expires_on: '2026-10-31' };
  assert.ok(validatePaymentInput(base).ok);
  assert.ok(validatePaymentInput({ ...base, amount_ars: -1 }).errors.amount_ars);
  assert.ok(validatePaymentInput({ ...base, amount_ars: 'abc' }).errors.amount_ars);
  assert.ok(validatePaymentInput({ ...base, expires_on: '2026-09-01' }).errors.expires_on);
  assert.ok(validatePaymentInput({ ...base, method: 'bitcoin' }).errors.method);
});
test('uuid', () => {
  assert.ok(isUuid('123e4567-e89b-42d3-a456-426614174000'));
  assert.ok(!isUuid("1' or '1'='1"));
});
