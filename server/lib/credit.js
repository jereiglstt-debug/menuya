// Cuentas corrientes de clientes (plan Premium). Es un registro interno del
// restaurante: no cobra nada online. Saldo = consumos − pagos (sin lo anulado).
import { normalizePhone } from './orders.js';

export const LIMITS = { maxAccounts: 500, maxEntryAmount: 10_000_000, maxCreditLimit: 100_000_000, maxEntries: 2000 };
export const PAY_METHODS = ['efectivo', 'transferencia', 'debito', 'credito', 'otro'];
export const CODE_RE = /^[0-9]{4}$/;

const clean = (v, max) => (typeof v === 'string' ? v.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '') : null);
const round2 = (n) => Math.round(n * 100) / 100;

export function toAmount(v) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim().replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && String(v ?? '').trim() !== '' ? round2(n) : NaN;
}

// Día de hoy en Argentina (YYYY-MM-DD).
export const todayAR = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(now);

export function newCode() {
  const b = new Uint32Array(1); crypto.getRandomValues(b);
  return String(b[0] % 10000).padStart(4, '0');
}

export function validateAccount(b, { partial = false } = {}) {
  const errors = {}; const out = {};
  if (!b || typeof b !== 'object') return { ok: false, errors: { _: 'Datos inválidos.' }, value: {} };
  if (!partial || b.name !== undefined) {
    const n = clean(b.name, 80);
    if (!n || n.length > 80) errors.name = 'Escribí el nombre del cliente (hasta 80 letras).'; else out.name = n;
  }
  if (b.phone !== undefined) {
    if (b.phone === '' || b.phone === null) out.phone = '';
    else { const p = normalizePhone(String(b.phone)); p ? (out.phone = p) : (errors.phone = 'Teléfono inválido. Incluí el código de país, por ejemplo 549388…'); }
  } else if (!partial) out.phone = '';
  if (b.credit_limit !== undefined) {
    if (b.credit_limit === '' || b.credit_limit === null) out.credit_limit = null;
    else { const n = toAmount(b.credit_limit); n >= 0 && n <= LIMITS.maxCreditLimit ? (out.credit_limit = n) : (errors.credit_limit = 'El límite tiene que ser un monto válido (0 o más).'); }
  } else if (!partial) out.credit_limit = null;
  if (b.active !== undefined) { typeof b.active === 'boolean' ? (out.active = b.active) : (errors.active = 'Valor inválido.'); }
  return { ok: !Object.keys(errors).length, errors, value: out };
}

export function validateEntry(b, today = todayAR()) {
  const errors = {}; const out = {};
  if (!b || typeof b !== 'object') return { ok: false, errors: { _: 'Datos inválidos.' }, value: {} };
  if (b.kind !== 'consumo' && b.kind !== 'pago') errors.kind = 'Elegí si es un consumo o un pago.'; else out.kind = b.kind;
  const amount = toAmount(b.amount);
  if (!(amount > 0) || amount > LIMITS.maxEntryAmount) errors.amount = 'Ingresá un monto mayor a 0 (hasta 10.000.000).'; else out.amount = amount;
  const d = clean(b.description ?? '', 200);
  if (d === null || d.length > 200) errors.description = 'El detalle puede tener hasta 200 caracteres.';
  else out.description = d || (out.kind === 'pago' ? 'Pago' : 'Consumo');
  if (out.kind === 'pago') {
    const m = b.method ?? 'efectivo';
    PAY_METHODS.includes(m) ? (out.method = m) : (errors.method = 'Medio de pago inválido.');
  } else out.method = null;
  if (b.occurred_on === undefined || b.occurred_on === null || b.occurred_on === '') out.occurred_on = today;
  else if (typeof b.occurred_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.occurred_on) && !Number.isNaN(Date.parse(b.occurred_on))
    && b.occurred_on >= '2020-01-01' && b.occurred_on <= today) out.occurred_on = b.occurred_on;
  else errors.occurred_on = 'La fecha no es válida (no puede ser futura).';
  return { ok: !Object.keys(errors).length, errors, value: out };
}
