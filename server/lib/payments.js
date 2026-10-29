// Métodos de pago que acepta un local. Solo informan y registran la elección
// del cliente: la plataforma no cobra online.
export const BASE_METHODS = ['efectivo', 'debito', 'credito'];
export const METHODS = [...BASE_METHODS, 'combinado'];
export const METHOD_LABELS = { efectivo: 'Efectivo', debito: 'Tarjeta de débito', credito: 'Tarjeta de crédito', combinado: 'Combinado' };
export const DEFAULT_PAYMENTS = { methods: ['efectivo'], combo_options: [] };

const uniqueSubset = (v, allowed) => Array.isArray(v) && new Set(v).size === v.length && v.every((x) => allowed.includes(x));

// Valida lo que envía el dueño. "Combinado" exige elegir al menos 2 medios combinables.
export function validatePaymentSettings(b) {
  const errors = {}; const out = {};
  if (!b || typeof b !== 'object') return { ok: false, errors: { _: 'Datos inválidos.' }, value: {} };
  if (!uniqueSubset(b.methods, METHODS) || b.methods.length < 1) errors.methods = 'Elegí al menos un medio de pago.';
  else out.methods = METHODS.filter((m) => b.methods.includes(m)); // orden estable
  if (out.methods?.includes('combinado')) {
    if (!uniqueSubset(b.combo_options, BASE_METHODS) || b.combo_options.length < 2) errors.combo_options = 'Para ofrecer “Combinado” elegí al menos dos medios que se puedan combinar.';
    else out.combo_options = BASE_METHODS.filter((m) => b.combo_options.includes(m));
  } else if (out.methods) out.combo_options = [];
  return { ok: !Object.keys(errors).length, errors, value: out };
}

// Forma pública (menú y formulario de pedido).
export const paymentsView = (row) => (row ? { methods: row.methods, combo_options: row.combo_options || [] } : null);
