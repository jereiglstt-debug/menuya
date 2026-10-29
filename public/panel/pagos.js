// Pestaña "Métodos de pago" (todos los planes). Configuración en vivo: se aplica
// apenas se guarda. La plataforma no cobra online: esto informa qué acepta el
// local y, en Premium, es lo que el cliente puede elegir al hacer su pedido.
import { h } from '/shared/core.js';
import { PAY_LABEL, BASE } from '/shared/pagos.js';

const OPTIONS = ['efectivo', 'debito', 'credito', 'combinado'];

export function pagosTab({ S, api, act }) {
  const premium = S.capabilities.features.includes('pedidos_nativos');
  const box = h('section', { class: 'card' }, h('p', { class: 'empty' }, 'Cargando…'));
  const root = h('div', {}, box);
  api('/owner/payments').then(({ payments, configured }) => {
    const on = new Set(payments.methods); const combo = new Set(payments.combo_options);
    const err = h('div', { class: 'form-error hidden', role: 'alert' });
    const comboBox = h('fieldset', { class: 'pay-combo' });
    const checks = {};
    function paintCombo() {
      comboBox.classList.toggle('hidden', !on.has('combinado'));
    }
    const main = OPTIONS.map((m) => {
      const i = h('input', { type: 'checkbox', id: `pm-${m}`, checked: on.has(m), onchange: () => { i.checked ? on.add(m) : on.delete(m); paintCombo(); } });
      checks[m] = i;
      return h('label', { class: 'check', for: `pm-${m}` }, i, PAY_LABEL[m]);
    });
    comboBox.replaceChildren(h('legend', {}, '¿Qué medios se pueden combinar?'),
      h('p', { class: 'hint' }, 'Elegí al menos dos. Si el cliente elige “Combinado”, va a decidir cuáles de estos usa.'),
      ...BASE.map((m) => {
        const i = h('input', { type: 'checkbox', id: `pc-${m}`, checked: combo.has(m), onchange: () => { i.checked ? combo.add(m) : combo.delete(m); } });
        return h('label', { class: 'check', for: `pc-${m}` }, i, PAY_LABEL[m]);
      }));
    paintCombo();
    const save = h('button', { class: 'btn primary' }, 'Guardar métodos de pago');
    save.onclick = async () => {
      err.classList.add('hidden');
      if (!on.size) { err.textContent = 'Elegí al menos un medio de pago.'; err.classList.remove('hidden'); return; }
      if (on.has('combinado') && combo.size < 2) { err.textContent = 'Para ofrecer “Combinado” elegí al menos dos medios que se puedan combinar.'; err.classList.remove('hidden'); return; }
      save.disabled = true;
      try {
        await api('/owner/payments', { method: 'PATCH', body: { methods: [...on], combo_options: on.has('combinado') ? [...combo] : [] } });
        await act(async () => {}, 'Métodos de pago guardados');
      } catch (e) { save.disabled = false; if (e.message !== 'sesión') { err.textContent = Object.values(e.details || {}).join(' ') || e.message; err.classList.remove('hidden'); } }
    };
    box.replaceChildren(...[h('h2', {}, 'Métodos de pago'),
      h('p', { class: 'muted' }, premium
        ? 'Estos son los medios de pago que ven tus clientes al hacer un pedido, y también se muestran en tu menú.'
        : 'Estos medios de pago se muestran en tu menú para que tus clientes sepan cómo pueden pagar.'),
      h('p', { class: 'hint' }, 'Se aplican apenas guardás (no hace falta publicar). La plataforma no cobra por internet: el pago se hace en el local o al recibir.'),
      !configured && h('p', { class: 'lock-note' }, 'Todavía no configuraste tus medios de pago: tus clientes no ven ninguno en el menú.'),
      main, comboBox, err, h('div', { class: 'actions' }, save)].flat(Infinity).filter(Boolean));
  }).catch((e) => { if (e.message !== 'sesión') box.replaceChildren(h('p', { class: 'form-error' }, e.message)); });
  return root;
}
