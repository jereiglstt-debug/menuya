// Pestaña "Código QR". El QR contiene solo la dirección pública del menú.
// Los colores y el rótulo se aplican en este navegador: el plan se refleja
// en la interfaz pero NO puede imponerse desde el servidor (lo dice el README).
import { h } from '/shared/core.js';
import { drawQr, qrColorsError } from '/shared/qrdraw.js';

export function qrTab({ S, api }) {
  const url = `${location.origin}/${S.restaurant.slug}`;
  const custom = !!S.capabilities.features.qr_personalizado;
  const st = { fg: '#000000', bg: '#ffffff', label: '' };
  const canvas = h('canvas', { class: 'qr-canvas', role: 'img', 'aria-label': `Código QR de ${url}` });
  const err = h('div', { class: 'form-error hidden', role: 'alert' });
  const dl = h('button', { class: 'btn primary' }, 'Descargar PNG');
  function refresh() {
    const e = qrColorsError(st.fg, st.bg);
    err.classList.toggle('hidden', !e); err.textContent = e || ''; dl.disabled = !!e;
    if (!e) drawQr(canvas, url, st);
  }
  dl.onclick = () => canvas.toBlob((b) => {
    const a = h('a', { href: URL.createObjectURL(b), download: `qr-${S.restaurant.slug}.png` });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');

  let opts = h('p', { class: 'lock-note' }, 'Colores y rótulo personalizados: disponibles desde el plan Profesional.');
  if (custom) {
    const fg = h('input', { type: 'color', id: 'q-fg', value: st.fg, onchange: () => { st.fg = fg.value; refresh(); } });
    const bg = h('input', { type: 'color', id: 'q-bg', value: st.bg, onchange: () => { st.bg = bg.value; refresh(); } });
    const lab = h('input', { id: 'q-lab', maxlength: '40', placeholder: 'Por ejemplo: Escaneá y mirá el menú', oninput: () => { st.label = lab.value.trim(); refresh(); } });
    opts = h('div', {}, h('div', { class: 'field-inline' }, h('label', { for: 'q-fg' }, 'Color del código'), fg),
      h('div', { class: 'field-inline' }, h('label', { for: 'q-bg' }, 'Color de fondo'), bg),
      h('label', { for: 'q-lab' }, 'Texto debajo del código (opcional)'), lab);
  }
  refresh();
  return h('section', { class: 'card' },
    h('h2', {}, 'Código QR de tu menú'),
    h('p', { class: 'muted' }, 'Imprimilo y ponelo en las mesas o en la puerta. Apunta siempre a:'),
    h('p', {}, h('code', {}, url)),
    !S.status.version && h('p', { class: 'hint' }, 'Todavía no publicaste tu menú: hasta entonces, quien escanee verá “menú no disponible”.'),
    h('div', { class: 'qr-wrap' }, canvas), opts, err,
    h('p', { class: 'hint' }, 'Probá escanearlo con tu celular antes de imprimirlo en cantidad. Imprimilo de al menos 3 × 3 cm.'),
    h('div', { class: 'actions' }, dl),
    S.capabilities.features.includes('mesas_y_qr_mesa') && tablesQr(S, api));
}

// Un QR por mesa (Plan Premium): al escanearlo, el pedido queda asociado a esa mesa.
function tablesQr(S, api) {
  const box = h('div', { class: 'qr-tables' }, h('p', { class: 'hint' }, 'Cargando mesas…'));
  api('/owner/ordering').then(({ tables }) => {
    const act = tables.filter((t) => t.active);
    box.replaceChildren(...(act.length ? act.map((t) => {
      const c = h('canvas', { class: 'qr-canvas small', role: 'img', 'aria-label': `QR de ${t.label}` });
      drawQr(c, `${location.origin}/${S.restaurant.slug}?mesa=${t.id}`, { label: t.label });
      return h('div', { class: 'qr-table' }, c, h('button', { class: 'btn small', onclick: () => c.toBlob((b) => {
        const a = h('a', { href: URL.createObjectURL(b), download: `qr-${S.restaurant.slug}-${t.label.replace(/[^a-z0-9]+/gi, '-')}.png` });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }, 'image/png') }, `Descargar ${t.label}`));
    }) : [h('p', { class: 'hint' }, 'Todavía no tenés mesas. Creálas en Pedidos → Mesas.')]));
  }).catch(() => box.replaceChildren(h('p', { class: 'hint' }, 'No se pudieron cargar las mesas.')));
  return h('div', { class: 'qr-tables-wrap' }, h('h3', {}, 'QR por mesa'),
    h('p', { class: 'muted' }, 'Cada mesa tiene su propio código. Imprimilos y ponelos en la mesa correspondiente.'), box);
}
