// Cuentas corrientes de clientes del PROPIETARIO (plan Premium). Todo se filtra
// por el restaurante de la SESIÓN; nunca se confía en ids de restaurante del cliente.
import { HttpError, readJson, json } from '../lib/http.js';
import { requireOwner } from '../lib/auth.js';
import { requireFeature } from '../lib/plans.js';
import { isUuid } from '../lib/validate.js';
import { LIMITS, validateAccount, validateEntry, newCode, todayAR } from '../lib/credit.js';

async function ctx(request, db) {
  const c = await requireOwner(request, db);
  requireFeature(c.restaurant, 'cuentas_corrientes');
  return c;
}
const own = (rid, id) => ({ id: `eq.${id}`, restaurant_id: `eq.${rid}` });
const needId = (id) => { if (!isUuid(id)) throw new HttpError(400, 'Identificador inválido.'); };
const num = (v) => Math.round(Number(v) * 100) / 100;

const ACCOUNT_SELECT = 'id,name,phone,code,credit_limit,active,created_at';
const accountOut = (a, bal) => ({
  id: a.id, name: a.name, phone: a.phone, code: a.code, active: a.active,
  credit_limit: a.credit_limit === null || a.credit_limit === undefined ? null : num(a.credit_limit),
  balance: bal ? num(bal.balance) : 0, last_on: bal?.last_on ?? null,
  over_limit: a.credit_limit != null && bal ? num(bal.balance) > num(a.credit_limit) : false,
});
const entryOut = (e) => ({
  id: e.id, kind: e.kind, amount: num(e.amount), description: e.description, method: e.method ?? null,
  occurred_on: e.occurred_on, order_id: e.order_id ?? null, voided: !!e.voided_at, created_at: e.created_at,
});
async function balances(db, rid) {
  const rows = await db.rpc('credit_balances', { p_restaurant: rid });
  return new Map((rows || []).map((r) => [r.account_id, r]));
}
async function getAccount(db, rid, id) {
  needId(id);
  const [a] = await db.rest('credit_accounts', { query: { select: ACCOUNT_SELECT, ...own(rid, id) } });
  if (!a) throw new HttpError(404, 'Cuenta no encontrada.');
  return a;
}

export async function listAccounts({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const [accounts, bal] = await Promise.all([
    db.rest('credit_accounts', { query: { select: ACCOUNT_SELECT, restaurant_id: `eq.${r.id}`, order: 'name.asc', limit: String(LIMITS.maxAccounts) } }),
    balances(db, r.id),
  ]);
  const list = accounts.map((a) => accountOut(a, bal.get(a.id)));
  const owed = list.reduce((s, a) => s + Math.max(0, a.balance), 0);
  return json({ accounts: list, owed: num(owed), debtors: list.filter((a) => a.balance > 0).length }, 200, { 'cache-control': 'no-store' });
}

export async function getAccountDetail({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db);
  const a = await getAccount(db, r.id, params.id);
  const [entries, bal] = await Promise.all([
    db.rest('credit_entries', { query: { select: 'id,kind,amount,description,method,occurred_on,order_id,voided_at,created_at', account_id: `eq.${a.id}`, restaurant_id: `eq.${r.id}`, order: 'occurred_on.desc,created_at.desc', limit: String(LIMITS.maxEntries) } }),
    balances(db, r.id),
  ]);
  return json({ account: accountOut(a, bal.get(a.id)), entries: entries.map(entryOut), restaurant: r.name }, 200, { 'cache-control': 'no-store' });
}

async function freshCode(db, rid) {
  const used = new Set((await db.rest('credit_accounts', { query: { select: 'code', restaurant_id: `eq.${rid}`, limit: String(LIMITS.maxAccounts + 1) } })).map((x) => x.code));
  for (let i = 0; i < 200; i += 1) { const c = newCode(); if (!used.has(c)) return c; }
  throw new HttpError(409, 'No se pudo generar un código libre. Archivá cuentas que ya no uses.');
}

export async function createAccount({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const v = validateAccount(await readJson(request));
  if (!v.ok) throw new HttpError(400, 'Revisá los datos.', v.errors);
  const count = (await db.rest('credit_accounts', { query: { select: 'id', restaurant_id: `eq.${r.id}`, limit: String(LIMITS.maxAccounts) } })).length;
  if (count >= LIMITS.maxAccounts) throw new HttpError(400, `Podés tener hasta ${LIMITS.maxAccounts} cuentas.`);
  const [a] = await db.rest('credit_accounts', { method: 'POST', returning: true, body: { restaurant_id: r.id, ...v.value, code: await freshCode(db, r.id) } });
  return json({ account: accountOut(a, null) }, 201);
}

export async function updateAccount({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db);
  const a = await getAccount(db, r.id, params.id);
  const b = await readJson(request);
  const v = validateAccount(b, { partial: true });
  if (!v.ok) throw new HttpError(400, 'Revisá los datos.', v.errors);
  const body = { ...v.value };
  if (b.new_code === true) body.code = await freshCode(db, r.id);
  if (!Object.keys(body).length) throw new HttpError(400, 'No hay cambios para guardar.');
  const rows = await db.rest('credit_accounts', { method: 'PATCH', query: own(r.id, a.id), body, returning: true });
  const bal = await balances(db, r.id);
  return json({ account: accountOut(rows[0], bal.get(a.id)) });
}

// Con movimientos o pedidos asociados no se borra (queda el historial): se archiva.
export async function deleteAccount({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db);
  const a = await getAccount(db, r.id, params.id);
  const [e, o] = await Promise.all([
    db.rest('credit_entries', { query: { select: 'id', account_id: `eq.${a.id}`, restaurant_id: `eq.${r.id}`, limit: '1' } }),
    db.rest('orders', { query: { select: 'id', credit_account_id: `eq.${a.id}`, restaurant_id: `eq.${r.id}`, limit: '1' } }),
  ]);
  if (e.length || o.length) {
    await db.rest('credit_accounts', { method: 'PATCH', query: own(r.id, a.id), body: { active: false } });
    return json({ ok: true, archived: true });
  }
  await db.rest('credit_accounts', { method: 'DELETE', query: own(r.id, a.id) });
  return json({ ok: true, archived: false });
}

export async function createEntry({ request, db, params }) {
  const { user, restaurant: r } = await ctx(request, db);
  const a = await getAccount(db, r.id, params.id);
  const v = validateEntry(await readJson(request), todayAR());
  if (!v.ok) throw new HttpError(400, 'Revisá los datos.', v.errors);
  if (v.value.kind === 'consumo' && !a.active) throw new HttpError(409, 'Esta cuenta está archivada. Reactivala para cargarle consumos.');
  const [row] = await db.rest('credit_entries', { method: 'POST', returning: true, body: { restaurant_id: r.id, account_id: a.id, created_by: user.id, ...v.value } });
  const bal = (await balances(db, r.id)).get(a.id);
  const account = accountOut(a, bal);
  return json({ entry: entryOut(row), account, over_limit: v.value.kind === 'consumo' && account.over_limit }, 201);
}

export async function voidEntry({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db); needId(params.id);
  const [e] = await db.rest('credit_entries', { query: { select: 'id,account_id,voided_at', ...own(r.id, params.id) } });
  if (!e) throw new HttpError(404, 'Movimiento no encontrado.');
  if (e.voided_at) throw new HttpError(409, 'Ese movimiento ya estaba anulado.');
  await db.rest('credit_entries', { method: 'PATCH', query: own(r.id, e.id), body: { voided_at: new Date().toISOString() } });
  const a = await getAccount(db, r.id, e.account_id);
  return json({ ok: true, account: accountOut(a, (await balances(db, r.id)).get(a.id)) });
}

// El dueño elige (o corrige) a qué cuenta se carga un pedido que pidió "cuenta corriente".
export async function setOrderAccount({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db); needId(params.id);
  const { account_id: accountId } = await readJson(request);
  const [o] = await db.rest('orders', { query: { select: 'id,status,payment_method', ...own(r.id, params.id) } });
  if (!o) throw new HttpError(404, 'Pedido no encontrado.');
  if (o.payment_method !== 'cuenta_corriente') throw new HttpError(409, 'Este pedido no es de cuenta corriente.');
  if (o.status !== 'nuevo') throw new HttpError(409, 'Solo se puede cambiar la cuenta mientras el pedido está nuevo.');
  const a = await getAccount(db, r.id, accountId);
  if (!a.active) throw new HttpError(409, 'Esa cuenta está archivada.');
  await db.rest('orders', { method: 'PATCH', query: own(r.id, o.id), body: { credit_account_id: a.id } });
  return json({ ok: true });
}
