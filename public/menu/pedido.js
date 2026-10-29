// Pedido nativo (Plan Premium): el cliente confirma el pedido en el local y
// puede seguir su estado. Los precios mostrados son orientativos: el servidor
// vuelve a calcular el total con el menú publicado y el local lo confirma.
import { h, money } from '/shared/core.js';
import { orderTotal } from '/shared/whatsapp.js';
import { PAY_LABEL } from '/shared/pagos.js';

const TYPE_LABEL = { mesa: 'Comer acá (mesa)', take_away: 'Retiro en el local (Take Away)', delivery: 'Delivery (envío a domicilio)' };
const STATUS_TEXT = {
  nuevo: 'Recibido. Esperando que el local lo acepte.',
  en_preparacion: 'En preparación.',
  listo: 'Listo.',
  entregado: 'Entregado. ¡Que lo disfrutes!',
  cancelado: 'El local canceló este pedido. Si tenés dudas, comunicate con ellos.',
};
const STEPS = ['nuevo', 'en_preparacion', 'listo', 'entregado'];
const KEY = (slug) => `menuya-pedido-${slug}`;
const store = {
  get(slug) { try { return JSON.parse(sessionStorage.getItem(KEY(slug)) || 'null'); } catch { return null; } },
  set(slug, v) { try { sessionStorage.setItem(KEY(slug), JSON.stringify(v)); } catch { /* sin almacenamiento: no pasa nada */ } },
  clear(slug) { try { sessionStorage.removeItem(KEY(slug)); } catch { /* idem */ } },
};
export const savedOrder = (slug) => (slug ? store.get(slug) : null);

// Seguimiento del pedido (consulta cada 10 s mientras el diálogo esté abierto).
export function openTracking({ dlg, slug, onNew }) {
  const saved = store.get(slug);
  if (!saved) return false;
  const box = h('div', { 'aria-live': 'polite' }, h('p', {}, 'Cargando tu pedido…'));
  dlg.replaceChildren(h('h2', {}, 'Tu pedido'), box,
    h('div', { class: 'm-cart-actions' },
      h('button', { class: 'm-btn alt', onclick: () => { store.clear(slug); onNew(); } }, 'Hacer otro pedido'),
      h('button', { class: 'm-btn alt', onclick: () => dlg.close() }, 'Cerrar')));
  let timer = null;
  async function refresh() {
    try {
      const res = await fetch(`/api/public/orders/${encodeURIComponent(slug)}/${encodeURIComponent(saved.token)}`, { cache: 'no-store' });
      if (res.status === 404) { store.clear(slug); box.replaceChildren(h('p', {}, 'No encontramos este pedido.')); clearInterval(timer); return; }
      const { order: o } = await res.json();
      box.replaceChildren(...[
        h('p', { class: 'm-order-num' }, `Pedido #${o.number}`),
        h('p', { class: 'm-order-status' }, STATUS_TEXT[o.status]),
        o.status !== 'cancelado' && h('ol', { class: 'm-steps' }, STEPS.map((s) => h('li', { class: STEPS.indexOf(s) <= STEPS.indexOf(o.status) ? 'done' : '' }, ({ nuevo: 'Recibido', en_preparacion: 'En preparación', listo: 'Listo', entregado: 'Entregado' })[s]))),
        h('ul', { class: 'm-cart-list' }, o.items.map((i) => h('li', {}, h('span', { class: 'm-cart-name' }, `${i.qty} x ${i.name}`), h('span', {}), h('span', { class: 'm-cart-sub' }, money(i.unit_price * i.qty))))),
        o.delivery_fee > 0 && h('p', { class: 'm-cart-hint' }, `Envío: ${money(o.delivery_fee)}`),
        h('p', { class: 'm-cart-total' }, `Total: ${money(o.total)}`)].filter(Boolean)); // sin “false” sueltos
      if (!o.active) clearInterval(timer);
    } catch { /* sin conexión: reintenta en el próximo ciclo */ }
  }
  refresh(); timer = setInterval(refresh, 10000);
  dlg.addEventListener('close', () => clearInterval(timer), { once: true });
  return true;
}

// Formulario de pedido. cart: Map clave -> { id, name, price_ars, qty }.
export function openOrderForm({ dlg, d, ord, cart, paint: repaintBar, onPlaced }) {
  const ids = (n) => `o-${n}`;
  const typeSel = h('select', { id: ids('type') }, ord.types.map((t) => h('option', { value: t, selected: t === 'mesa' }, t === 'mesa' && ord.table ? `Comer acá (${ord.table.label})` : TYPE_LABEL[t])));
  const name = h('input', { id: ids('name'), maxlength: '60', autocomplete: 'name' });
  const phone = h('input', { id: ids('phone'), type: 'tel', maxlength: '25', autocomplete: 'tel' });
  const addr = h('input', { id: ids('addr'), maxlength: '200', autocomplete: 'street-address' });
  const pay = h('select', { id: ids('pay') }, h('option', { value: '' }, 'Elegí…'), ord.methods.map((m) => h('option', { value: m }, PAY_LABEL[m])));
  const comboChecks = (ord.combo_options || []).map((m) => ({ m, el: h('input', { type: 'checkbox', id: ids(`combo-${m}`), value: m }) }));
  const comboBox = h('fieldset', { class: 'm-combo' }, h('legend', {}, '¿Cuáles vas a combinar? (elegí al menos dos)'),
    comboChecks.map(({ m, el }) => h('label', { class: 'm-check', for: el.id }, el, PAY_LABEL[m])));
  const chosenCombo = () => comboChecks.filter((c) => c.el.checked).map((c) => c.m);
  const note = h('textarea', { id: ids('note'), maxlength: '300', rows: '2' });
  const trap = h('input', { name: 'website', tabindex: '-1', autocomplete: 'off', class: 'm-trap', 'aria-hidden': 'true' }); // campo trampa
  const list = h('ul', { class: 'm-cart-list' });
  const totals = h('p', { class: 'm-cart-total' });
  const err = h('p', { class: 'm-cart-warn hidden', role: 'alert' });
  const fe = {}; const field = (k, label, el, hint) => { fe[k] = h('p', { class: 'm-field-err hidden', role: 'alert' }); return h('div', { class: 'm-f', 'data-f': k }, h('label', { for: el.id }, label), el, hint && h('p', { class: 'm-cart-hint' }, hint), fe[k]); };
  const rows = { phone: field('customer_phone', 'Teléfono (para avisarte)', phone), addr: field('address', 'Dirección de entrega', addr), pay: field('payment_method', 'Cómo vas a pagar', pay, 'El pago se hace al recibir o en el local. No se cobra nada por internet.') };
  rows.combo = field('payment_combo', 'Combinación de pago', comboBox);
  pay.addEventListener('change', () => rows.combo.classList.toggle('hidden', pay.value !== 'combinado'));
  rows.combo.classList.add('hidden');
  // al corregir, el aviso anterior deja de mostrarse
  comboChecks.forEach(({ el }) => el.addEventListener('change', () => fe.payment_combo.classList.add('hidden')));
  pay.addEventListener('change', () => { fe.payment_method.classList.add('hidden'); fe.payment_combo.classList.add('hidden'); });
  const send = h('button', { class: 'm-btn', type: 'submit' }, d.preview ? 'Confirmar pedido (no disponible en la vista previa)' : 'Confirmar pedido');
  if (d.preview) send.setAttribute('disabled', '');
  const items = () => [...cart.values()];

  function paint() {
    if (!cart.size) { dlg.close(); repaintBar(); return; }
    list.replaceChildren(...[...cart.entries()].map(([key, i]) => h('li', {},
      h('span', { class: 'm-cart-name' }, i.name),
      h('span', { class: 'm-qty' },
        h('button', { type: 'button', class: 'm-q', 'aria-label': `Quitar uno de ${i.name}`, onclick: () => { i.qty -= 1; if (i.qty <= 0) cart.delete(key); paint(); } }, '−'),
        h('strong', {}, String(i.qty)),
        h('button', { type: 'button', class: 'm-q', 'aria-label': `Agregar uno de ${i.name}`, disabled: i.qty >= 20, onclick: () => { i.qty += 1; paint(); } }, '+')),
      h('span', { class: 'm-cart-sub' }, money(i.price_ars * i.qty)))));
    const t = typeSel.value; const fee = t === 'delivery' ? ord.fee : 0;
    totals.textContent = fee ? `Total: ${money(orderTotal(items()) + fee)} (incluye envío ${money(fee)})` : `Total: ${money(orderTotal(items()))}`;
    rows.phone.classList.toggle('hidden', t === 'mesa'); rows.addr.classList.toggle('hidden', t !== 'delivery');
    repaintBar();
  }
  typeSel.addEventListener('change', paint);

  const form = h('form', { novalidate: true, onsubmit: async (ev) => {
    ev.preventDefault();
    if (d.preview || !d.slug) return;
    err.classList.add('hidden'); Object.values(fe).forEach((e) => e.classList.add('hidden'));
    send.disabled = true;
    try {
      const res = await fetch(`/api/public/orders/${encodeURIComponent(d.slug)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        type: typeSel.value, table_id: typeSel.value === 'mesa' ? ord.table?.id : undefined,
        customer_name: name.value, customer_phone: phone.value, address: addr.value, payment_method: pay.value || undefined, payment_combo: pay.value === 'combinado' ? chosenCombo() : undefined, note: note.value,
        website: trap.value, items: items().map((i) => ({ id: i.id, qty: i.qty })),
      }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let shown = false;
        for (const [k, msg] of Object.entries(data.details || {})) if (fe[k]) { fe[k].textContent = msg; fe[k].classList.remove('hidden'); shown = true; }
        const extra = data.details?.type || data.details?._ || data.details?.table_id; // errores sin campo propio
        err.textContent = [data.error || 'No se pudo enviar el pedido.', extra].filter(Boolean).join(' ');
        err.classList.toggle('hidden', shown && !extra); send.disabled = false; return;
      }
      store.set(d.slug, { token: data.order.tracking_token, number: data.order.number });
      cart.clear(); onPlaced();
    } catch { err.textContent = 'Sin conexión. Revisá tu internet y probá de nuevo.'; err.classList.remove('hidden'); send.disabled = false; }
  } },
    h('label', { for: ids('type') }, 'Cómo querés tu pedido'), typeSel,
    field('customer_name', 'Tu nombre', name), rows.phone, rows.addr, rows.pay, rows.combo,
    field('note', 'Aclaraciones (opcional)', note), trap, totals, err,
    h('p', { class: 'm-cart-hint' }, 'Los precios son los del menú. El local confirma tu pedido y te avisa por acá mismo.'),
    h('div', { class: 'm-cart-actions' }, send, h('button', { type: 'button', class: 'm-btn alt', onclick: () => dlg.close() }, 'Seguir mirando el menú')));
  dlg.replaceChildren(h('h2', {}, 'Tu pedido'), list, form);
  paint();
}
