// Pestaña "Cuentas corrientes" (plan Premium): clientes que consumen y pagan después.
// Es un registro interno: no cobra nada por internet. El servidor exige el plan y
// valida cada movimiento; esto solo lo muestra.
import { h, money, toast } from '/shared/core.js';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const METHOD = { efectivo: 'Efectivo', transferencia: 'Transferencia', debito: 'Débito', credito: 'Crédito', otro: 'Otro' };
const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));
const fdate = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const todayAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
const ym = (iso) => iso.slice(0, 7);

// Resumen de un mes: saldo anterior + movimientos del mes + saldo final (sin lo anulado).
export function statement(entries, month) {
  const live = entries.filter((e) => !e.voided);
  const sign = (e) => (e.kind === 'consumo' ? 1 : -1) * e.amount;
  const before = Math.round(live.filter((e) => ym(e.occurred_on) < month).reduce((n, e) => n + sign(e), 0) * 100) / 100;
  const rows = live.filter((e) => ym(e.occurred_on) === month).sort((a, b) => (a.occurred_on < b.occurred_on ? -1 : a.occurred_on > b.occurred_on ? 1 : a.created_at < b.created_at ? -1 : 1));
  const consumos = rows.filter((e) => e.kind === 'consumo').reduce((n, e) => n + e.amount, 0);
  const pagos = rows.filter((e) => e.kind === 'pago').reduce((n, e) => n + e.amount, 0);
  return { before, rows, consumos, pagos, after: Math.round((before + consumos - pagos) * 100) / 100 };
}
export const monthLabel = (m) => `${MONTHS[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`;

export function statementText(account, restaurant, month, st) {
  const lines = [`*${restaurant}* — Resumen de cuenta corriente`, `Cliente: ${account.name}`, `Período: ${monthLabel(month)}`, '',
    `Saldo anterior: ${money(st.before)}`,
    ...st.rows.map((e) => `${fdate(e.occurred_on)} ${e.kind === 'consumo' ? '+' : '−'} ${money(e.amount)} ${e.description}`),
    '', `Consumos: ${money(st.consumos)}`, `Pagos: ${money(st.pagos)}`, `*Saldo a pagar: ${money(st.after)}*`];
  return lines.join('\n');
}

export function cuentasTab({ S, api, confirmDlg, dialog }) {
  if (!S.capabilities.features.includes('cuentas_corrientes')) {
    return h('section', { class: 'card' }, h('h2', {}, 'Cuentas corrientes'),
      h('p', { class: 'lock-note' }, 'Las cuentas corrientes de clientes (consumir ahora y pagar a fin de mes) están disponibles en el plan Premium.'));
  }
  const root = h('div', {});
  const fail = (e) => { if (e.message !== 'sesión') toast(e.details ? Object.values(e.details).join(' ') : e.message); };
  const fieldErr = (e, box) => { if (e.message === 'sesión') return; box.textContent = Object.values(e.details || {}).join(' ') || e.message; box.classList.remove('hidden'); };

  // ---------------- lista ----------------
  let showArchived = false;
  async function list() {
    const box = h('section', { class: 'card' }, h('p', { class: 'empty' }, 'Cargando…'));
    fill(root, box);
    let data;
    try { data = await api('/owner/credit'); } catch (e) { fail(e); return; }
    const rows = data.accounts.filter((a) => showArchived || a.active).sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
    const arch = data.accounts.some((a) => !a.active);
    fill(box,
      h('h2', {}, 'Cuentas corrientes'),
      h('p', { class: 'muted' }, 'Para clientes que consumen y pagan a fin de mes. Cargá sus consumos (o dejá que lleguen solos desde sus pedidos) y registrá sus pagos. No se cobra nada por internet: es tu registro.'),
      h('p', {}, h('strong', {}, `Te deben ${money(data.owed)}`), data.debtors ? ` entre ${data.debtors} ${data.debtors === 1 ? 'cliente' : 'clientes'}.` : '.'),
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: () => accountDlg(null) }, 'Nueva cuenta')),
      rows.length ? rows.map((a) => h('div', { class: `promo-row${a.active ? '' : ' off'}` },
        h('div', {}, h('strong', {}, a.name), !a.active && h('span', { class: 'tag-off' }, 'Archivada'), a.over_limit && h('span', { class: 'tag-off' }, 'Pasó el límite'),
          h('div', { class: 'pmeta' }, `Código ${a.code}`, a.phone ? ` · +${a.phone}` : '', ` · último movimiento: ${fdate(a.last_on)}`)),
        h('div', { class: 'pacts' }, h('strong', { class: a.balance > 0 ? 'debt' : '' }, money(a.balance)),
          h('button', { class: 'btn small', onclick: () => detail(a.id) }, 'Abrir'))))
        : h('p', { class: 'empty' }, 'Todavía no creaste cuentas. Empezá con “Nueva cuenta”: cada cliente recibe un código de 4 números para pedir desde la carta.'),
      arch && h('label', { class: 'check', for: 'cc-arch' }, h('input', { id: 'cc-arch', type: 'checkbox', checked: showArchived, onchange: (e) => { showArchived = e.target.checked; list(); } }), 'Mostrar cuentas archivadas'));
  }

  // ---------------- crear / editar cuenta ----------------
  function accountDlg(a) {
    const name = h('input', { id: 'ca-name', maxlength: '80', value: a?.name ?? '', required: true });
    const phone = h('input', { id: 'ca-phone', type: 'tel', maxlength: '25', value: a?.phone ?? '', placeholder: 'Ej: 549388…' });
    const limit = h('input', { id: 'ca-limit', inputmode: 'decimal', value: a?.credit_limit ?? '', placeholder: 'Sin límite' });
    const err = h('div', { class: 'form-error hidden', role: 'alert' });
    const d = dialog('', h('h2', {}, a ? 'Editar cuenta' : 'Nueva cuenta'), h('form', { onsubmit: async (ev) => {
      ev.preventDefault(); err.classList.add('hidden');
      try {
        const body = { name: name.value, phone: phone.value, credit_limit: limit.value };
        const r = a ? await api(`/owner/credit/accounts/${a.id}`, { method: 'PATCH', body }) : await api('/owner/credit/accounts', { method: 'POST', body });
        d.close(); toast(a ? 'Cuenta actualizada' : `Cuenta creada. Código del cliente: ${r.account.code}`);
        a ? detail(a.id) : list();
      } catch (e) { fieldErr(e, err); }
    } },
      h('label', { for: 'ca-name' }, 'Nombre del cliente'), name,
      h('label', { for: 'ca-phone' }, 'Teléfono (opcional, con código de país)'), phone,
      h('label', { for: 'ca-limit' }, 'Límite de crédito (opcional)'), limit,
      h('p', { class: 'hint' }, 'El límite solo te avisa cuando un cliente se pasa: no bloquea nada.'), err,
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Guardar'), h('button', { class: 'btn', type: 'button', onclick: () => d.close() }, 'Cancelar'))));
    name.focus();
  }

  // ---------------- movimiento manual ----------------
  function entryDlg(a, kind) {
    const amount = h('input', { id: 'ce-amount', inputmode: 'decimal', required: true, placeholder: '0' });
    const desc = h('input', { id: 'ce-desc', maxlength: '200', placeholder: kind === 'consumo' ? 'Ej: 2 milanesas y 1 gaseosa' : 'Ej: pago de octubre' });
    const date = h('input', { id: 'ce-date', type: 'date', value: todayAR(), max: todayAR(), min: '2020-01-01' });
    const method = h('select', { id: 'ce-method' }, Object.entries(METHOD).map(([v, l]) => h('option', { value: v }, l)));
    const err = h('div', { class: 'form-error hidden', role: 'alert' });
    const d = dialog('', h('h2', {}, kind === 'consumo' ? `Cargar consumo a ${a.name}` : `Registrar pago de ${a.name}`), h('form', { onsubmit: async (ev) => {
      ev.preventDefault(); err.classList.add('hidden');
      try {
        const r = await api(`/owner/credit/accounts/${a.id}/entries`, { method: 'POST', body: { kind, amount: amount.value, description: desc.value, occurred_on: date.value, method: kind === 'pago' ? method.value : undefined } });
        d.close(); toast(r.over_limit ? `Cargado. Atención: ${a.name} superó su límite de crédito.` : kind === 'consumo' ? 'Consumo cargado' : 'Pago registrado');
        detail(a.id);
      } catch (e) { fieldErr(e, err); }
    } },
      h('label', { for: 'ce-amount' }, 'Monto'), amount,
      h('label', { for: 'ce-desc' }, 'Detalle'), desc,
      h('label', { for: 'ce-date' }, 'Fecha'), date,
      kind === 'pago' && [h('label', { for: 'ce-method' }, 'Medio de pago'), method],
      err, h('div', { class: 'actions' }, h('button', { class: 'btn primary', type: 'submit' }, kind === 'consumo' ? 'Cargar consumo' : 'Registrar pago'), h('button', { class: 'btn', type: 'button', onclick: () => d.close() }, 'Cancelar'))));
    amount.focus();
  }

  // ---------------- resumen imprimible / WhatsApp ----------------
  function statementDlg(a, entries, restaurant) {
    const months = [...new Set([todayAR().slice(0, 7), ...entries.filter((e) => !e.voided).map((e) => ym(e.occurred_on))])].sort().reverse();
    const sel = h('select', { id: 'cs-month', 'aria-label': 'Mes del resumen' }, months.map((m) => h('option', { value: m }, monthLabel(m))));
    const out = h('div', { class: 'statement', id: 'print-area' });
    const wa = h('a', { class: 'btn', target: '_blank', rel: 'noopener noreferrer' }, 'Enviar por WhatsApp');
    function paint() {
      const st = statement(entries, sel.value);
      fill(out, h('h3', {}, `${restaurant} — Resumen de cuenta corriente`), h('p', {}, h('strong', {}, a.name), ` · ${monthLabel(sel.value)}`),
        h('table', { class: 'stmt' }, h('tbody', {},
          h('tr', {}, h('td', { colspan: '3' }, 'Saldo anterior'), h('td', { class: 'num' }, money(st.before))),
          st.rows.map((e) => h('tr', {}, h('td', {}, fdate(e.occurred_on)), h('td', {}, e.description), h('td', {}, e.kind === 'consumo' ? 'Consumo' : `Pago${e.method ? ` (${METHOD[e.method]})` : ''}`), h('td', { class: 'num' }, `${e.kind === 'consumo' ? '' : '− '}${money(e.amount)}`))),
          !st.rows.length && h('tr', {}, h('td', { colspan: '4', class: 'pmeta' }, 'Sin movimientos en este mes.')),
          h('tr', {}, h('td', { colspan: '3' }, 'Consumos del mes'), h('td', { class: 'num' }, money(st.consumos))),
          h('tr', {}, h('td', { colspan: '3' }, 'Pagos del mes'), h('td', { class: 'num' }, `− ${money(st.pagos)}`)),
          h('tr', { class: 'total' }, h('td', { colspan: '3' }, 'Saldo a pagar'), h('td', { class: 'num' }, money(st.after))))));
      const text = statementText(a, restaurant, sel.value, st);
      if (a.phone) { wa.href = `https://wa.me/${a.phone}?text=${encodeURIComponent(text)}`; wa.classList.remove('hidden'); } else wa.classList.add('hidden');
    }
    sel.addEventListener('change', paint); paint();
    const d = dialog('wide', h('h2', {}, 'Resumen del mes'), h('label', { for: 'cs-month' }, 'Mes'), sel, out,
      !a.phone && h('p', { class: 'hint' }, 'Cargale el teléfono (con código de país) a esta cuenta para poder enviarle el resumen por WhatsApp.'),
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: () => window.print() }, 'Imprimir'), wa, h('button', { class: 'btn', onclick: () => d.close() }, 'Cerrar')));
    document.body.classList.add('printing-statement');
    d.addEventListener('close', () => document.body.classList.remove('printing-statement'));
  }

  // ---------------- detalle ----------------
  async function detail(id) {
    const box = h('section', { class: 'card' }, h('p', { class: 'empty' }, 'Cargando…'));
    fill(root, box);
    let data;
    try { data = await api(`/owner/credit/accounts/${id}`); } catch (e) { fail(e); return list(); }
    const { account: a, entries, restaurant } = data;
    fill(box,
      h('button', { class: 'btn small', onclick: list }, '← Volver a las cuentas'),
      h('h2', {}, a.name, !a.active && h('span', { class: 'tag-off' }, 'Archivada')),
      h('p', { class: 'pmeta' }, `Código para pedir desde la carta: `, h('strong', {}, a.code), a.phone ? ` · +${a.phone}` : '', a.credit_limit != null ? ` · límite ${money(a.credit_limit)}` : ' · sin límite'),
      h('p', { class: 'big-balance' }, a.balance > 0 ? 'Debe ' : a.balance < 0 ? 'Saldo a favor ' : 'Al día ', a.balance !== 0 && h('strong', { class: a.balance > 0 ? 'debt' : '' }, money(Math.abs(a.balance)))),
      a.over_limit && h('p', { class: 'form-error' }, 'Esta cuenta superó su límite de crédito.'),
      h('div', { class: 'pacts' },
        a.active && h('button', { class: 'btn primary', onclick: () => entryDlg(a, 'consumo') }, 'Cargar consumo'),
        h('button', { class: 'btn primary', onclick: () => entryDlg(a, 'pago') }, 'Registrar pago'),
        h('button', { class: 'btn', onclick: () => statementDlg(a, entries, restaurant) }, 'Resumen del mes'),
        h('button', { class: 'btn small', onclick: () => accountDlg(a) }, 'Editar'),
        h('button', { class: 'btn small', onclick: () => confirmDlg('¿Generar un código nuevo?', `El código actual (${a.code}) deja de funcionar. Avisale el nuevo al cliente.`, 'Generar código', async () => { try { const r = await api(`/owner/credit/accounts/${a.id}`, { method: 'PATCH', body: { new_code: true } }); toast(`Código nuevo: ${r.account.code}`); detail(a.id); } catch (e) { fail(e); } }) }, 'Código nuevo'),
        a.active
          ? h('button', { class: 'btn small danger', onclick: () => confirmDlg(`¿Archivar la cuenta de ${a.name}?`, 'Deja de poder pedir con su código y no se le pueden cargar consumos. El historial se conserva.', 'Archivar', async () => { try { await api(`/owner/credit/accounts/${a.id}`, { method: 'DELETE' }); toast('Cuenta archivada'); list(); } catch (e) { fail(e); } }) }, entries.length ? 'Archivar' : 'Eliminar')
          : h('button', { class: 'btn small', onclick: async () => { try { await api(`/owner/credit/accounts/${a.id}`, { method: 'PATCH', body: { active: true } }); toast('Cuenta reactivada'); detail(a.id); } catch (e) { fail(e); } } }, 'Reactivar')),
      h('h3', {}, 'Movimientos'),
      entries.length ? h('ul', { class: 'o-hist ce-list' }, entries.map((e) => h('li', { class: e.voided ? 'off' : '' },
        h('span', {}, fdate(e.occurred_on), ' · ', e.kind === 'consumo' ? 'Consumo' : `Pago${e.method ? ` (${METHOD[e.method]})` : ''}`, ' · ', e.description, e.order_id && h('span', { class: 'tag-star' }, 'Pedido'), e.voided && h('span', { class: 'tag-off' }, 'Anulado')),
        h('strong', { class: e.kind === 'consumo' ? 'debt' : '' }, `${e.kind === 'consumo' ? '+' : '−'} ${money(e.amount)}`),
        !e.voided && h('button', { class: 'btn small danger ml', onclick: () => confirmDlg('¿Anular este movimiento?', 'Deja de contar en el saldo, pero queda en el historial marcado como anulado.', 'Anular', async () => { try { await api(`/owner/credit/entries/${e.id}/void`, { method: 'POST' }); toast('Movimiento anulado'); detail(a.id); } catch (er) { fail(er); } }) }, 'Anular'))))
        : h('p', { class: 'empty' }, 'Todavía no tiene movimientos.'));
  }

  list();
  return root;
}
