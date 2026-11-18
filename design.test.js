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

// ---- colores extra (nombre, promociones, categorías/platos, precio/línea, burbuja) ----
test('colores extra: Básico no puede, Profesional sí, y se normalizan', () => {
  const body = { template: 'clasico', name_color: '#FFFFFF', promo_bg: '#223344', cat_text: '#111111', price_color: '#7a3b00', item_bg: '#EEEEEE', item_opacity: 50 };
  const b = validateDesign(body, basico);
  assert.equal(b.ok, false);
  assert.deepEqual(b.forbidden.sort(), ['cat_text', 'item_bg', 'item_opacity', 'name_color', 'price_color', 'promo_bg']);
  const p = validateDesign(body, pro);
  assert.equal(p.ok, true, JSON.stringify(p.errors));
  assert.equal(p.value.name_color, '#ffffff'); assert.equal(p.value.item_bg, '#eeeeee'); assert.equal(p.value.item_opacity, 50);
});
test('colores extra: valores inválidos y nulos', () => {
  assert.equal(validateDesign({ template: 'clasico', cat_text: 'rojo' }, pro).ok, false);
  assert.equal(validateDesign({ template: 'clasico', item_opacity: 5 }, pro).ok, false);
  assert.equal(validateDesign({ template: 'clasico', item_opacity: 101 }, pro).ok, false);
  assert.equal(validateDesign({ template: 'clasico', item_opacity: 1.5 }, pro).ok, false);
  const v = validateDesign({ template: 'clasico', name_color: null, item_opacity: '70' }, pro);
  assert.equal(v.ok, true); assert.equal(v.value.name_color, null); assert.equal(v.value.item_opacity, 70);
});
test('colores extra: legibilidad', () => {
  const base = { template: 'clasico', bg: '#ffffff', ink: '#111111' };
  assert.ok(validateDesign({ ...base, cat_text: '#f0f0f0' }, pro).errors.cat_text);
  assert.ok(validateDesign({ ...base, price_color: '#fafafa' }, pro).errors.price_color);
  assert.ok(validateDesign({ ...base, promo_bg: '#ffff00', promo_text: '#ffffaa' }, pro).errors.promo_text);
  assert.equal(validateDesign({ ...base, promo_bg: '#ffff00' }, pro).ok, true); // el texto se elige solo
  // burbuja oscura opaca con texto oscuro → no se lee; con mucha transparencia sí
  assert.ok(validateDesign({ ...base, item_bg: '#000000', item_opacity: 100 }, pro).errors.item_bg);
  assert.equal(validateDesign({ ...base, item_bg: '#000000', item_opacity: 10 }, pro).ok, true);
  assert.equal(validateDesign({ ...base, item_bg: '#000000', item_opacity: 100, cat_text: '#ffffff' }, pro).ok, false); // blanco sobre negro, pero no sobre el fondo blanco
});
test('sanitizeDesign: tras bajar de plan se descartan los colores extra; ilegibles se descartan', () => {
  const stored = { template: 'clasico', name_color: '#ffffff', promo_bg: '#112233', item_bg: '#eeeeee', item_opacity: 40 };
  const s = sanitizeDesign(stored, basico);
  assert.equal(s.name_color, null); assert.equal(s.promo_bg, null); assert.equal(s.item_bg, null); assert.equal(s.item_opacity, null);
  assert.equal(sanitizeDesign(stored, pro).promo_bg, '#112233');
  const bad = sanitizeDesign({ template: 'clasico', bg: '#ffffff', ink: '#111111', cat_text: '#fefefe', promo_bg: '#112233' }, pro);
  assert.equal(bad.cat_text, null); assert.equal(bad.promo_bg, null);
});
test('resolveDesign: extras nulos por defecto y opacidad 60', () => {
  const d = resolveDesign({});
  assert.equal(d.name_color, null); assert.equal(d.item_bg, null); assert.equal(d.item_opacity, 60);
});
