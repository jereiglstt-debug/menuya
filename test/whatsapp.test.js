import test from 'node:test';
import assert from 'node:assert/strict';
import { waLink, orderMessage, inquiryMessage, orderTotal } from '../public/shared/whatsapp.js';

test('waLink: codifica el texto y rechaza números inválidos', () => {
  const u = new URL(waLink('5491122334455', 'Hola & chau\n¿Qué tal?'));
  assert.equal(u.origin, 'https://wa.me'); assert.equal(u.pathname, '/5491122334455');
  assert.equal(u.searchParams.get('text'), 'Hola & chau\n¿Qué tal?');
  assert.throws(() => waLink('abc', 'x')); assert.throws(() => waLink('5491122334455/../x', 'x'));
});
test('orderMessage: líneas, total y datos opcionales', () => {
  const items = [{ name: 'Muzza', qty: 2, price_ars: 9500 }, { name: 'Gaseosa', qty: 1, price_ars: 2500.5 }];
  const m = orderMessage({ title: 'Lo de Jere', items, customer: ' Ana ', note: 'Sin cebolla' });
  assert.match(m, /pedido en Lo de Jere/); assert.match(m, /• 2 x Muzza/); assert.match(m, /Nombre: Ana/); assert.match(m, /Aclaraciones: Sin cebolla/);
  assert.equal(orderTotal(items), 21500.5);
  assert.ok(!/Nombre:/.test(orderMessage({ title: 'X', items })));
});
test('orderMessage: recorta nombre/nota y limita líneas', () => {
  const items = Array.from({ length: 60 }, (_, i) => ({ name: `P${i}`, qty: 1, price_ars: 1 }));
  const m = orderMessage({ title: 'X', items, customer: 'a'.repeat(100), note: 'b'.repeat(500) });
  assert.equal(m.split('\n').filter((l) => l.startsWith('•')).length, 40);
  assert.ok(m.includes('a'.repeat(60)) && !m.includes('a'.repeat(61)) && !m.includes('b'.repeat(301)));
});
test('inquiryMessage', () => assert.equal(inquiryMessage('Bar'), 'Hola, quiero consultar por el menú de Bar.'));
