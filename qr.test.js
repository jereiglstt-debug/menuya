import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { encodeQr } from '../public/shared/qr.js';

const URL1 = 'https://menuya-57t.pages.dev/jere';
const hash = (m) => createHash('sha256').update(m.map((r) => r.map((x) => (x ? 1 : 0)).join('')).join('\n')).digest('hex');

test('QR: matriz cuadrada, versión válida, patrones de búsqueda en 3 esquinas', () => {
  const m = encodeQr(URL1);
  const n = m.length;
  assert.ok(m.every((r) => r.length === n));
  assert.equal((n - 17) % 4, 0, 'tamaño 17+4v');
  for (const [x, y] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
    for (let i = 0; i < 7; i++) { assert.ok(m[y][x + i] && m[y + 6][x + i] && m[y + i][x] && m[y + i][x + 6]); }
    assert.ok(m[y + 3][x + 3] && !m[y + 1][x + 1]);
  }
});
test('QR: determinista y distinto para textos distintos', () => {
  assert.equal(hash(encodeQr(URL1)), hash(encodeQr(URL1)));
  assert.notEqual(hash(encodeQr(URL1)), hash(encodeQr(URL1 + '2')));
});
test('QR: regresión de la matriz de la URL del proyecto', () => {
  const h1 = hash(encodeQr(URL1));
  assert.equal(h1.length, 64);
  assert.equal(h1, 'f036cdfe193f1ccb848dc3f6a03c56966f23b55e5bfc079d24d186020b5b25a9');
});
test('QR: texto demasiado largo falla en vez de generar basura', () => {
  assert.throws(() => encodeQr('x'.repeat(2000)));
});
