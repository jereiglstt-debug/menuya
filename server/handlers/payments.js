// Métodos de pago del local (todos los planes). Configuración en vivo.
import { HttpError, readJson, json } from '../lib/http.js';
import { requireOwner } from '../lib/auth.js';
import { requireFeature } from '../lib/plans.js';
import { validatePaymentSettings, DEFAULT_PAYMENTS } from '../lib/payments.js';

async function ctx(request, db) {
  const c = await requireOwner(request, db);
  requireFeature(c.restaurant, 'metodos_pago');
  return c;
}
const out = (row) => ({ methods: row.methods, combo_options: row.combo_options || [] });

export async function getPayments({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const [row] = await db.rest('restaurant_payment_settings', { query: { select: 'methods,combo_options', restaurant_id: `eq.${r.id}` } });
  return json({ payments: row ? out(row) : DEFAULT_PAYMENTS, configured: !!row });
}

export async function updatePayments({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const v = validatePaymentSettings(await readJson(request));
  if (!v.ok) throw new HttpError(400, 'Revisá los datos.', v.errors);
  const [row] = await db.rest('restaurant_payment_settings', { query: { select: 'restaurant_id', restaurant_id: `eq.${r.id}` } });
  if (row) await db.rest('restaurant_payment_settings', { method: 'PATCH', query: { restaurant_id: `eq.${r.id}` }, body: v.value });
  else await db.rest('restaurant_payment_settings', { method: 'POST', body: { restaurant_id: r.id, ...v.value } });
  return json({ payments: v.value, configured: true });
}
