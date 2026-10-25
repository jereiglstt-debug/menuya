import test from 'node:test';
import assert from 'node:assert/strict';
import { hasFeature, featuresFor, requireFeature, FEATURES } from '../server/lib/plans.js';
import { HttpError } from '../server/lib/http.js';

test('Básico incluye menú y QR general pero no carrito ni pedidos', () => {
  assert.ok(hasFeature('basico', 'qr_general'));
  assert.ok(!hasFeature('basico', 'carrito'));
  assert.ok(!hasFeature('basico', 'pedidos_nativos'));
});
test('Profesional incluye carrito pero no mesas ni pedidos nativos', () => {
  assert.ok(hasFeature('profesional', 'carrito'));
  assert.ok(hasFeature('profesional', 'qr_general'));
  assert.ok(!hasFeature('profesional', 'mesas_y_qr_mesa'));
  assert.ok(!hasFeature('profesional', 'delivery'));
});
test('Premium incluye todas las funciones', () => {
  for (const f of Object.keys(FEATURES)) assert.ok(hasFeature('premium', f), f);
});
test('planes y funciones desconocidos se deniegan', () => {
  assert.ok(!hasFeature('gratis', 'menu_publico'));
  assert.ok(!hasFeature('premium', 'funcion_inventada'));
  assert.ok(!hasFeature(undefined, 'menu_publico'));
});
test('requireFeature lanza 403', () => {
  assert.throws(() => requireFeature({ plan: 'basico' }, 'delivery'),
    (e) => e instanceof HttpError && e.status === 403);
  assert.doesNotThrow(() => requireFeature({ plan: 'premium' }, 'delivery'));
});
test('los planes son estrictamente incrementales', () => {
  const b = featuresFor('basico'), p = featuresFor('profesional'), x = featuresFor('premium');
  assert.ok(b.every((f) => p.includes(f)) && p.every((f) => x.includes(f)));
  assert.ok(b.length < p.length && p.length < x.length);
});
