// Pestaña "Pedidos" (Plan Premium): cola, historial, mesas, ajustes y estadísticas.
// El servidor exige el plan y valida cada cambio de estado; esto solo lo muestra.
import { h, money, toast } from '/shared/core.js';
import { payText } from '/shared/pagos.js';

const STATUS = { nuevo: 'Nuevo', en_preparacion: 'En preparación', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado' };
const TYPE = { mesa: 'Mesa', take_away: 'Take Away', delivery: 'Delivery' };
const NEXT = { nuevo: ['en_preparacion', 'Aceptar y preparar'], en_preparacion: ['listo', 'Marcar listo'], listo: ['entregado', 'Marcar entregado'] };
const POLL_MS = 15000;

// ---------- avisos (solo dentro del panel y mientras esté abierto) ----------
const live = { orders: [], seen: null, timer: null, listeners: new Set(), sound: false, base: document.title };
function beep() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; const c = new AC();
    const o = c.createOscillator(); const g = c.createGain(); o.connect(g); g.connect(c.destination);
    o.frequency.value = 880; g.gain.value = 0.15; o.start(); o.stop(c.currentTime + 0.25); setTimeout(() => c.close(), 400);
  } catch { /* sin audio: no pasa nada */ }
}
export function startOrderAlerts(api, onCount) {
  if (live.timer) return;
  async function tick() {
    try {
      const { orders } = await api('/owner/orders');
      const news = orders.filter((o) => o.status === 'nuevo');
      if (live.seen) {
        const fresh = news.filter((o) => !live.seen.has(o.id));
        if (fresh.length) { toast(fresh.length === 1 ? `Nuevo pedido #${fresh[0].number}` : `${fresh.length} pedidos nuevos`); if (live.sound) beep(); }
      }
      live.seen = new Set(news.map((o) => o.id)); live.orders = orders;
      document.title = news.length ? `(${news.length}) ${live.base}` : live.base;
      onCount(news.length); live.listeners.forEach((f) => f(orders));
    } catch (e) { if (e.status === 403) stopOrderAlerts(); }
  }
  tick(); live.timer = setInterval(tick, POLL_MS);
}
export function stopOrderAlerts() { clearInterval(live.timer); live.timer = null; live.seen = null; document.title = live.base; }

// replaceChildren no aplana listas: este ayudante sí (y descarta null/false).
const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));

const ago = (iso) => { const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000)); return m < 1 ? 'recién' : m < 60 ? `hace ${m} min` : `hace ${Math.floor(m / 60)} h ${m % 60} min`; };
const hhmm = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

let SUB = 'cola';
const SUBS = [['cola', 'Cola'], ['historial', 'Historial'], ['mesas', 'Mesas'], ['ajustes', 'Ajustes'], ['stats', 'Estadísticas']];

export function pedidosTab({ S, api, confirmDlg, inputDlg }) {
  if (!S.capabilities.features.includes('pedidos_nativos')) {
    return h('section', { class: 'card' }, h('h2', {}, 'Pedidos'),
      h('p', { class: 'lock-note' }, 'Los pedidos por internet (mesa, Take Away y delivery) están disponibles en el plan Premium.'));
  }
  const body = h('div', {});
  const stateBar = h('div', { class: 'card state-bar' });
  const root = h('div', {}, stateBar, h('div', { class: 'tabs sub', role: 'tablist' }, SUBS.map(([k, l]) => h('button', { role: 'tab', class: `tab${SUB === k ? ' on' : ''}`, 'aria-selected': String(SUB === k), onclick: () => { SUB = k; show(); root.querySelectorAll('.sub .tab').forEach((b, i) => { const on = SUBS[i][0] === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }); } }, l))), body);
  let ordering = null; let tables = [];
  let unlisten = null;
  const fail = (e) => { if (e.message !== 'sesión') toast(e.message); };

  async function loadOrdering() { const r = await api('/owner/ordering'); ordering = r.ordering; tables = r.tables; paintState(); }
  function paintState() {
    const st = ordering.state;
    fill(stateBar, h('div', {}, h('strong', {}, 'Recepción de pedidos: '), h('span', { class: `badge ${st === 'abierto' ? 'b-activo' : 'b-vencido'}` }, st === 'abierto' ? 'Abierto' : st === 'pausado' ? 'Pausado' : 'Cerrado')),
      h('div', { class: 'acts' }, [['abierto', 'Abrir'], ['pausado', 'Pausar'], ['cerrado', 'Cerrar']].map(([v, l]) =>
        h('button', { class: `btn small${st === v ? ' primary' : ''}`, disabled: st === v, onclick: async () => { try { const r = await api('/owner/ordering', { method: 'PATCH', body: { state: v } }); ordering = r.ordering; paintState(); toast({ abierto: 'Pedidos abiertos', pausado: 'Pedidos pausados', cerrado: 'Pedidos cerrados' }[v]); } catch (e) { fail(e); } } }, l))));
  }

  // ----- cola -----
  function card(o, withActions) {
    const next = NEXT[o.status];
    return h('article', { class: `order st-${o.status}` },
      h('header', {}, h('strong', {}, `#${o.number}`), ' ', h('span', { class: 'tag-star' }, o.type === 'mesa' ? (o.table_label || 'Mesa') : TYPE[o.type]), ' ', h('span', { class: 'badge' }, STATUS[o.status]), h('span', { class: 'pmeta ml' }, ago(o.created_at))),
      h('ul', { class: 'o-items' }, o.items.map((i) => h('li', {}, h('strong', {}, `${i.qty} x `), i.name, h('span', { class: 'pmeta ml' }, money(i.unit_price * i.qty))))),
      o.customer_name && h('p', { class: 'm0' }, h('strong', {}, o.customer_name)),
      o.customer_phone && h('p', { class: 'm0' }, 'Tel: ', h('a', { href: `tel:+${o.customer_phone}` }, `+${o.customer_phone}`)),
      o.address && h('p', { class: 'm0' }, `Dirección: ${o.address}`),
      o.note && h('p', { class: 'm0 o-note' }, `Aclaraciones: ${o.note}`),
      h('p', { class: 'm0' }, o.payment_method ? `Pago: ${payText(o.payment_method, o.payment_combo)}` : 'Pago: a definir en el local', ' · ', h('strong', {}, `Total ${money(o.total)}`), o.delivery_fee > 0 && h('span', { class: 'pmeta' }, ` (envío ${money(o.delivery_fee)})`)),
      h('details', {}, h('summary', {}, 'Historial de estados'), h('ul', { class: 'o-hist' }, o.history.map((x) => h('li', {}, `${hhmm(x.at)} — ${STATUS[x.status]}`)))),
      withActions && next && h('div', { class: 'pacts o-acts' },
        h('button', { class: 'btn primary', onclick: (e) => move(o, next[0], e.currentTarget) }, next[1]),
        h('button', { class: 'btn small danger', onclick: () => confirmDlg(`¿Cancelar el pedido #${o.number}?`, 'El cliente va a ver que fue cancelado. No se puede deshacer.', 'Cancelar pedido', () => move(o, 'cancelado')) }, 'Cancelar')));
  }
  async function move(o, status, btn) {
    if (btn) btn.disabled = true;
    try { await api(`/owner/orders/${o.id}/status`, { method: 'PATCH', body: { status } }); await refreshCola(); } catch (e) { fail(e); if (btn) btn.disabled = false; }
  }
  const colaBox = h('div', {});
  function paintCola(orders) {
    fill(colaBox, orders.length ? orders.map((o) => card(o, true)) : h('p', { class: 'empty' }, 'No hay pedidos para atender. Cuando llegue uno, aparece acá y te avisamos.'));
  }
  async function refreshCola() { const { orders } = await api('/owner/orders'); live.orders = orders; paintCola(orders); }
  function cola() {
    const snd = h('input', { type: 'checkbox', id: 'snd', checked: live.sound, onchange: () => { live.sound = snd.checked; if (live.sound) beep(); } });
    paintCola(live.orders);
    unlisten = paintCola; live.listeners.add(unlisten);
    return h('div', {}, h('label', { class: 'check', for: 'snd' }, snd, 'Sonido al llegar un pedido nuevo'),
      h('p', { class: 'hint' }, 'Los avisos funcionan solo mientras tengas este panel abierto en tu navegador (se actualiza cada 15 segundos). No enviamos avisos por WhatsApp ni por correo.'), colaBox);
  }

  // ----- historial -----
  function historial() {
    const box = h('div', {}, h('p', { class: 'empty' }, 'Cargando…'));
    api('/owner/orders?scope=history').then(({ orders }) => fill(box, orders.length ? orders.map((o) => card(o, false)) : h('p', { class: 'empty' }, 'Todavía no hay pedidos entregados o cancelados.'))).catch(fail);
    return h('div', {}, h('p', { class: 'hint' }, 'Los últimos 60 pedidos entregados o cancelados. Por privacidad, el nombre, teléfono, dirección y aclaraciones de los clientes se borran automáticamente a los 90 días; los productos y totales se conservan para las estadísticas.'), box);
  }

  // ----- mesas -----
  function mesas() {
    const box = h('div', {});
    const label = h('input', { id: 't-l', maxlength: '30', placeholder: 'Por ejemplo: Terraza 1' });
    const count = h('input', { id: 't-c', type: 'number', min: '1', max: '50', value: '10' });
    const err = h('div', { class: 'form-error hidden', role: 'alert' });
    const add = async (body) => { err.classList.add('hidden'); try { await api('/owner/tables', { method: 'POST', body }); await loadOrdering(); paint(); toast('Mesas actualizadas'); } catch (e) { if (e.message !== 'sesión') { err.textContent = e.details?.label || e.message; err.classList.remove('hidden'); } } };
    function paint() {
      fill(box, tables.length ? tables.map((t) => h('div', { class: `promo-row${t.active ? '' : ' off'}` },
        h('div', {}, h('strong', {}, t.label), !t.active && h('span', { class: 'tag-off' }, 'Archivada')),
        h('div', { class: 'pacts' },
          h('button', { class: 'btn small', onclick: () => inputDlg('Renombrar mesa', 'Nuevo nombre', t.label, 'Guardar', async (n) => { try { await api(`/owner/tables/${t.id}`, { method: 'PATCH', body: { label: n } }); await loadOrdering(); paint(); } catch (e) { fail(e); } }) }, 'Renombrar'),
          h('button', { class: 'btn small', onclick: async () => { try { await api(`/owner/tables/${t.id}`, { method: 'PATCH', body: { active: !t.active } }); await loadOrdering(); paint(); } catch (e) { fail(e); } } }, t.active ? 'Archivar' : 'Reactivar'),
          h('button', { class: 'btn small danger', onclick: () => confirmDlg(`¿Eliminar “${t.label}”?`, 'Si ya tuvo pedidos, se archiva para conservar el historial. Su QR dejará de funcionar.', 'Eliminar', async () => { try { const r = await api(`/owner/tables/${t.id}`, { method: 'DELETE' }); await loadOrdering(); paint(); toast(r.archived ? 'La mesa tenía pedidos: quedó archivada' : 'Mesa eliminada'); } catch (e) { fail(e); } }) }, 'Eliminar'))))
        : h('p', { class: 'empty' }, 'Todavía no creaste mesas. Sin mesas, el pedido “Comer acá” no está disponible.'));
    }
    paint();
    return h('div', {}, h('section', { class: 'card' }, h('h3', {}, 'Tus mesas'), box,
      h('p', { class: 'hint' }, 'Cada mesa tiene su propio QR: descargalo en la pestaña “Código QR”. Cuando un cliente lo escanea, su pedido queda asociado a esa mesa.')),
      h('section', { class: 'card' }, h('h3', {}, 'Agregar mesas'),
        h('label', { for: 't-c' }, 'Crear varias de una vez (Mesa 1, Mesa 2, …)'), count,
        h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => add({ count: Number(count.value) }) }, 'Crear mesas')),
        h('label', { for: 't-l' }, 'O agregar una con nombre propio'), label, err,
        h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: () => add({ label: label.value }) }, 'Agregar mesa'))));
  }

  // ----- ajustes -----
  function ajustes() {
    const o = ordering;
    const cb = (id, text, on) => { const i = h('input', { id, type: 'checkbox', checked: on }); return [i, h('label', { class: 'check', for: id }, i, text)]; };
    const [mesaI, mesaL] = cb('a-mesa', 'Comer acá (pedidos desde el QR de cada mesa)', o.accept_mesa);
    const [takeI, takeL] = cb('a-take', 'Retiro en el local (Take Away)', o.accept_take_away);
    const [delI, delL] = cb('a-del', 'Delivery (envío a domicilio)', o.accept_delivery);
    const fee = h('input', { id: 'a-fee', inputmode: 'decimal', value: String(o.delivery_fee).replace('.', ',') });
    const err = h('div', { class: 'form-error hidden', role: 'alert' });
    return h('section', { class: 'card' }, h('h3', {}, 'Cómo recibís pedidos'), mesaL, takeL, delL,
      h('label', { for: 'a-fee' }, 'Costo de envío (en pesos)'), fee,
      h('p', { class: 'hint' }, 'Los medios de pago (efectivo, débito, crédito y combinado) se configuran en la pestaña “Métodos de pago”.'), err,
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: async () => {
        err.classList.add('hidden');
        try {
          const r = await api('/owner/ordering', { method: 'PATCH', body: { accept_mesa: mesaI.checked, accept_take_away: takeI.checked, accept_delivery: delI.checked, delivery_fee: fee.value } });
          ordering = r.ordering; paintState(); toast('Ajustes guardados. Se aplican ya mismo.');
        } catch (e) { if (e.message !== 'sesión') { err.textContent = Object.values(e.details || {}).join(' ') || e.message; err.classList.remove('hidden'); } }
      } }, 'Guardar ajustes')));
  }

  // ----- estadísticas -----
  function stats() {
    const box = h('div', {}, h('p', { class: 'empty' }, 'Cargando…'));
    const sel = h('select', { id: 's-d', 'aria-label': 'Período', onchange: () => load() }, [7, 30, 90].map((d) => h('option', { value: d }, `Últimos ${d} días`)));
    async function load() {
      try {
        const s = await api(`/owner/stats?days=${sel.value}`);
        const max = Math.max(1, ...s.per_day.map((x) => x.orders));
        fill(box, 
          h('div', { class: 'stat-grid' }, [['Pedidos', s.total_orders], ['Entregados', s.delivered], ['Ventas entregadas', money(s.revenue_delivered)], ['Ticket promedio', money(s.avg_ticket)], ['Cancelados', s.by_status.cancelado],
            ['Mesa', s.by_type.mesa], ['Take Away', s.by_type.take_away], ['Delivery', s.by_type.delivery]].map(([k, v]) => h('div', { class: 'stat' }, h('span', { class: 'pmeta' }, k), h('strong', {}, String(v))))),
          h('h3', {}, 'Pedidos por día'),
          s.per_day.length ? s.per_day.map((x) => { const bar = h('span', { class: 'bar' }); bar.style.setProperty('width', `${Math.max(4, Math.round((x.orders / max) * 100))}%`); return h('div', { class: 'bar-row' }, h('span', { class: 'pmeta' }, x.day), h('span', { class: 'bar-track' }, bar), h('strong', {}, String(x.orders))); }) : h('p', { class: 'empty' }, 'Sin pedidos en este período.'),
          h('h3', {}, 'Productos más pedidos'),
          s.top_products.length ? h('ol', {}, s.top_products.map((p) => h('li', {}, `${p.name} — ${p.qty}`))) : h('p', { class: 'empty' }, 'Todavía no hay datos.'),
          h('p', { class: 'hint' }, 'Las ventas cuentan solo pedidos marcados como entregados. Los pedidos cancelados no se suman a nada más que al contador de cancelados.'));
      } catch (e) { fail(e); }
    }
    load();
    return h('section', { class: 'card' }, h('div', { class: 'card-h' }, h('h3', {}, 'Estadísticas'), sel), box);
  }

  function show() {
    if (unlisten) { live.listeners.delete(unlisten); unlisten = null; }
    const view = SUB === 'cola' ? cola() : SUB === 'historial' ? historial() : SUB === 'mesas' ? mesas() : SUB === 'ajustes' ? ajustes() : stats();
    fill(body, view);
  }
  fill(stateBar, h('p', { class: 'm0' }, 'Cargando…'));
  loadOrdering().then(show).catch(fail);
  return root;
}
