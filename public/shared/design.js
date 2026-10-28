// Diseño del menú: plantillas, tipografías, colores y reglas de legibilidad.
// Un solo archivo para servidor y navegador, así la vista previa, el menú
// público y la validación siempre coinciden.

export const TEMPLATES = {
  clasico:      { label: 'Clásico',      font: 'lora',     bg: '#fbfaf7', ink: '#1d1b18', accent: '#9a3412', extra: false },
  minimalista:  { label: 'Minimalista',  font: 'figtree',  bg: '#ffffff', ink: '#111111', accent: '#111111', extra: false },
  moderno:      { label: 'Moderno',      font: 'poppins',  bg: '#f4f6fb', ink: '#172033', accent: '#2563eb', extra: true },
  elegante:     { label: 'Elegante',     font: 'playfair', bg: '#faf6ef', ink: '#2b2118', accent: '#8a6a2f', extra: true },
};
export const FONTS = {
  figtree:  { label: 'Sencilla', css: '"Figtree", system-ui, sans-serif',      gf: 'Figtree:wght@400;600;700' },
  lora:     { label: 'Clásica',  css: '"Lora", Georgia, serif',                gf: 'Lora:wght@400;600;700' },
  poppins:  { label: 'Moderna',  css: '"Poppins", system-ui, sans-serif',      gf: 'Poppins:wght@400;600;700' },
  playfair: { label: 'Elegante', css: '"Playfair Display", Georgia, serif',    gf: 'Playfair+Display:wght@400;600;700' },
};
export const CARD_STYLES = {
  lista:    'Lista con la foto al costado',
  tarjeta:  'Tarjetas con la foto arriba',
  compacta: 'Compacta, sin fotos',
};
export const BASIC_TEMPLATES = Object.keys(TEMPLATES).filter((k) => !TEMPLATES[k].extra);
export const ALL_TEMPLATES = Object.keys(TEMPLATES);

// Qué puede usar un plan. `extra` = plantillas adicionales; `advanced` = fondo,
// texto, tipografía, tarjetas y portada. Lo calcula el servidor desde el plan.
export const permissionsFor = ({ extraTemplates, advanced }) => ({
  templates: extraTemplates ? ALL_TEMPLATES : BASIC_TEMPLATES,
  advanced: !!advanced,
});

const HEX = /^#[0-9a-f]{6}$/i;
export const isHex = (v) => typeof v === 'string' && HEX.test(v);

// ---------- contraste (WCAG) ----------
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
export const textOn = (hex) => (contrast(hex, '#ffffff') >= contrast(hex, '#000000') ? '#ffffff' : '#000000');

// ---------- resolución ----------
// Convierte el diseño guardado (con nulos = "usar el de la plantilla") en valores concretos.
export function resolveDesign(d = {}) {
  const t = TEMPLATES[d.template] ? d.template : 'clasico';
  const base = TEMPLATES[t];
  return {
    template: t,
    accent: isHex(d.accent) ? d.accent : base.accent,
    bg: isHex(d.bg) ? d.bg : base.bg,
    ink: isHex(d.ink) ? d.ink : base.ink,
    font: FONTS[d.font] ? d.font : base.font,
    card_style: CARD_STYLES[d.card_style] ? d.card_style : 'lista',
  };
}
export const fontHref = (fontKey) => `https://fonts.googleapis.com/css2?family=${FONTS[fontKey].gf}&display=swap`;

function contrastErrors(r) {
  const e = {};
  if (contrast(r.ink, r.bg) < 4.5) e.ink = 'El texto no se lee bien sobre ese fondo. Elegí colores más contrastados.';
  if (contrast(r.accent, r.bg) < 3) e.accent = 'El color de acento se confunde con el fondo. Elegí uno más fuerte.';
  return e;
}

// Valida lo que envía el propietario. `forbidden` lista lo que su plan no incluye (→ 403).
export function validateDesign(input, perms) {
  const errors = {}; const forbidden = []; const out = {};
  const b = input && typeof input === 'object' ? input : {};

  if (typeof b.template !== 'string' || !TEMPLATES[b.template]) errors.template = 'Elegí una plantilla válida.';
  else if (!perms.templates.includes(b.template)) forbidden.push('template');
  else out.template = b.template;

  const color = (key) => {
    const v = b[key];
    if (v === null || v === undefined || v === '') { out[key] = null; return; }
    if (!isHex(v)) { errors[key] = 'Color inválido.'; return; }
    out[key] = v.toLowerCase();
  };
  color('accent');
  for (const key of ['bg', 'ink']) {
    if (b[key] !== null && b[key] !== undefined && b[key] !== '' && !perms.advanced) { forbidden.push(key); continue; }
    color(key);
  }
  for (const [key, table, label] of [['font', FONTS, 'tipografía'], ['card_style', CARD_STYLES, 'estilo de tarjeta']]) {
    const v = b[key];
    if (v === null || v === undefined || v === '') { out[key] = null; continue; }
    if (!perms.advanced) { forbidden.push(key); continue; }
    if (!table[v]) errors[key] = `La ${label} elegida no es válida.`; else out[key] = v;
  }
  if (!Object.keys(errors).length && !forbidden.length) Object.assign(errors, contrastErrors(resolveDesign(out)));
  return { ok: !Object.keys(errors).length && !forbidden.length, errors, forbidden, value: out };
}

// Lo que se publica nunca puede exceder el plan ACTUAL (por ejemplo, tras una baja de plan).
export function sanitizeDesign(stored, perms) {
  const d = stored && typeof stored === 'object' ? stored : {};
  const out = {
    template: perms.templates.includes(d.template) ? d.template : 'clasico',
    accent: isHex(d.accent) ? d.accent.toLowerCase() : null,
    bg: perms.advanced && isHex(d.bg) ? d.bg.toLowerCase() : null,
    ink: perms.advanced && isHex(d.ink) ? d.ink.toLowerCase() : null,
    font: perms.advanced && FONTS[d.font] ? d.font : null,
    card_style: perms.advanced && CARD_STYLES[d.card_style] ? d.card_style : null,
  };
  // Si la combinación guardada no es legible, se vuelve a los valores de la plantilla.
  if (Object.keys(contrastErrors(resolveDesign(out))).length) { out.accent = null; out.bg = null; out.ink = null; }
  return out;
}
