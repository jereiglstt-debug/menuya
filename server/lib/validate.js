import { PLANS } from './plans.js';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;
export const RESERVED_SLUGS = new Set([
  'admin','api','panel','login','logout','assets','static','app','www','mesa','menu',
  'pedido','pedidos','establecer-contrasena','recuperar','health','favicon','robots',
  'sitemap','soporte','ayuda',
]);
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const METHODS = ['efectivo', 'transferencia', 'otro'];

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function str(v, { min = 0, max = 200 } = {}) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length >= min && t.length <= max ? t : null;
}

export function validateRestaurantInput(b, { partial = false } = {}) {
  const errors = {};
  const out = {};

  if (!partial || b.name !== undefined) {
    const v = str(b.name, { min: 2, max: 80 });
    v === null ? (errors.name = 'El nombre debe tener entre 2 y 80 caracteres.') : (out.name = v);
  }
  if (!partial) {
    const slug = typeof b.slug === 'string' ? b.slug.trim().toLowerCase() : '';
    if (!SLUG_RE.test(slug) || slug.includes('--')) {
      errors.slug = 'La dirección debe tener 3 a 40 caracteres: minúsculas, números y guiones simples.';
    } else if (RESERVED_SLUGS.has(slug)) {
      errors.slug = 'Esa dirección está reservada por el sistema. Elegí otra.';
    } else out.slug = slug;
  }
  if (b.description !== undefined) {
    const v = str(b.description, { max: 500 });
    v === null ? (errors.description = 'La descripción puede tener hasta 500 caracteres.') : (out.description = v);
  }
  if (!partial || b.plan !== undefined) {
    PLANS.includes(b.plan) ? (out.plan = b.plan) : (errors.plan = 'Elegí un plan válido.');
  }
  if (b.status !== undefined) {
    ['activo', 'suspendido'].includes(b.status)
      ? (out.status = b.status)
      : (errors.status = 'Estado inválido.');
  }
  if (!partial) {
    const email = typeof b.owner_email === 'string' ? b.owner_email.trim().toLowerCase() : '';
    EMAIL_RE.test(email) && email.length <= 254
      ? (out.owner_email = email)
      : (errors.owner_email = 'Ingresá un correo electrónico válido.');
  }
  return { ok: Object.keys(errors).length === 0, errors, value: out };
}

export function validatePaymentInput(b) {
  const errors = {};
  const out = {};
  PLANS.includes(b.plan) ? (out.plan = b.plan) : (errors.plan = 'Elegí un plan válido.');

  const amount = typeof b.amount_ars === 'number' ? b.amount_ars : Number(b.amount_ars);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e9) {
    errors.amount_ars = 'Ingresá un monto en pesos válido (0 o más).';
  } else out.amount_ars = Math.round(amount * 100) / 100;

  for (const f of ['paid_on', 'starts_on', 'expires_on']) {
    isValidDate(b[f]) ? (out[f] = b[f]) : (errors[f] = 'Fecha inválida (AAAA-MM-DD).');
  }
  if (out.starts_on && out.expires_on && out.expires_on < out.starts_on) {
    errors.expires_on = 'El vencimiento no puede ser anterior al inicio.';
  }
  const method = b.method ?? 'otro';
  METHODS.includes(method) ? (out.method = method) : (errors.method = 'Método de pago inválido.');
  const note = b.note === undefined ? '' : str(b.note, { max: 300 });
  note === null ? (errors.note = 'La nota puede tener hasta 300 caracteres.') : (out.note = note);
  return { ok: Object.keys(errors).length === 0, errors, value: out };
}

export const isSlugFormat = (s) => typeof s === 'string' && SLUG_RE.test(s) && !s.includes('--');

export function validateCategoryInput(b) {
  const name = str(b.name, { min: 1, max: 60 });
  return name === null
    ? { ok: false, errors: { name: 'El nombre debe tener entre 1 y 60 caracteres.' } }
    : { ok: true, errors: {}, value: { name } };
}

export function validateProductInput(b, { partial = false } = {}) {
  const errors = {}; const out = {};
  if (!partial || b.name !== undefined) {
    const v = str(b.name, { min: 1, max: 80 });
    v === null ? (errors.name = 'El nombre debe tener entre 1 y 80 caracteres.') : (out.name = v);
  }
  if (b.description !== undefined) {
    const v = str(b.description, { max: 300 });
    v === null ? (errors.description = 'La descripción puede tener hasta 300 caracteres.') : (out.description = v);
  }
  if (!partial || b.price_ars !== undefined) {
    const n = typeof b.price_ars === 'number' ? b.price_ars : Number(String(b.price_ars ?? '').replace(',', '.'));
    if (b.price_ars === '' || b.price_ars === null || !Number.isFinite(n) || n < 0 || n > 10000000) {
      errors.price_ars = 'Ingresá un precio válido en pesos (0 o más).';
    } else out.price_ars = Math.round(n * 100) / 100;
  }
  if (b.available !== undefined) {
    typeof b.available === 'boolean' ? (out.available = b.available) : (errors.available = 'Valor inválido.');
  }
  if (b.featured !== undefined) {
    typeof b.featured === 'boolean' ? (out.featured = b.featured) : (errors.featured = 'Valor inválido.');
  }
  if (!partial || b.category_id !== undefined) {
    isUuid(b.category_id) ? (out.category_id = b.category_id) : (errors.category_id = 'Elegí una categoría.');
  }
  return { ok: Object.keys(errors).length === 0, errors, value: out };
}

export function validateSettingsInput(b) {
  const errors = {}; const out = {};
  if (b.title !== undefined) {
    const v = str(b.title, { max: 80 });
    v === null ? (errors.title = 'El nombre puede tener hasta 80 caracteres.') : (out.title = v);
  }
  if (b.description !== undefined) {
    const v = str(b.description, { max: 500 });
    v === null ? (errors.description = 'La descripción puede tener hasta 500 caracteres.') : (out.description = v);
  }
  if (b.whatsapp !== undefined) {
    const w = normalizeWhatsapp(b.whatsapp);
    w === undefined ? (errors.whatsapp = 'Ingresá el número con código de país y sin el 0 ni el 15 (por ejemplo 5491122334455).') : (out.whatsapp = w);
  }
  return { ok: Object.keys(errors).length === 0, errors, value: out };
}

// Acepta "+54 9 11 2233-4455" → "5491122334455". Vacío → null. Inválido → undefined.
export function normalizeWhatsapp(v) {
  if (v === null || v === '') return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (t === '') return null;
  if (!/^\+?[0-9\s().-]+$/.test(t)) return undefined;
  const d = t.replace(/\D/g, '');
  return /^[0-9]{8,15}$/.test(d) ? d : undefined;
}

export function validatePromotionInput(b, { partial = false } = {}) {
  const errors = {}; const out = {};
  if (!partial || b.title !== undefined) {
    const v = str(b.title, { min: 1, max: 60 });
    v === null ? (errors.title = 'El título debe tener entre 1 y 60 caracteres.') : (out.title = v);
  }
  if (b.description !== undefined) {
    const v = str(b.description, { max: 200 });
    v === null ? (errors.description = 'La descripción puede tener hasta 200 caracteres.') : (out.description = v);
  }
  if (b.active !== undefined) {
    typeof b.active === 'boolean' ? (out.active = b.active) : (errors.active = 'Valor inválido.');
  }
  return { ok: Object.keys(errors).length === 0, errors, value: out };
}

export function validateIdList(ids) {
  return Array.isArray(ids) && ids.length <= 500 && ids.every(isUuid) && new Set(ids).size === ids.length;
}
