import test from 'node:test';
import assert from 'node:assert/strict';
import { contrast, resolveDesign, validateDesign, sanitizeDesign, permissionsFor, textOn } from '../public/shared/design.js';

const basico = permissionsFor({ extraTemplates: false, advanced: false });
const pro = permissionsFor({ extraTemplates: true, advanced: true });

test('contraste WCAG: negro/blanco = 21 y simétrico', () => {
  assert.ok(Math.abs(contrast('#000000', '#ffffff') - 21) < 0.01);
  assert.equal(contrast('#123456', '#fafafa'), contrast('#fafafa', '#123456'));
  assert.equal(textOn('#000000'), '#ffffff');
});
test('resolveDesign usa valores de la plantilla por defecto', () => {
  const d = resolveDesign({});
  assert.equal(d.template, 'clasico'); assert.equal(d.card_style, 'lista');
  assert.equal(resolveDesign({ template: 'inventada' }).template, 'clasico');
});
test('validateDesign: Básico solo plantillas básicas y acento', () => {
  assert.equal(validateDesign({ template: 'minimalista', accent: '#aa3300' }, basico).ok, true);
  assert.deepEqual(validateDesign({ template: 'moderno' }, basico).forbidden, ['template']);
  const v = validateDesign({ template: 'clasico', bg: '#000000', ink: '#ffffff', font: 'poppins', card_style: 'tarjeta' }, basico);
  assert.deepEqual(v.forbidden.sort(), ['bg', 'card_style', 'font', 'ink']);
  assert.equal(v.ok, false);
});
test('validateDesign: Profesional permite todo, pero exige contraste', () => {
  assert.equal(validateDesign({ template: 'moderno', bg: '#101820', ink: '#f5f5f5', accent: '#ffcc00', font: 'poppins', card_style: 'tarjeta' }, pro).ok, true);
  const mal = validateDesign({ template: 'clasico', bg: '#ffffff', ink: '#eeeeee' }, pro);
  assert.equal(mal.ok, false); assert.ok(mal.errors.ink || mal.errors.bg || Object.keys(mal.errors).length);
  assert.equal(validateDesign({ template: 'clasico', accent: 'rojo' }, pro).ok, false);
  assert.equal(validateDesign({ template: 'zzz' }, pro).ok, false);
});
test('sanitizeDesign: al bajar de plan se descartan opciones avanzadas', () => {
  const guardado = { template: 'elegante', accent: '#8a6a2f', bg: '#101820', ink: '#f5f5f5', font: 'poppins', card_style: 'tarjeta' };
  const s = sanitizeDesign(guardado, basico);
  assert.equal(s.template, 'clasico'); assert.equal(s.bg, null); assert.equal(s.font, null); assert.equal(s.card_style, null);
  assert.deepEqual(sanitizeDesign(guardado, pro).template, 'elegante');
  assert.equal(sanitizeDesign(null, basico).template, 'clasico');
});
