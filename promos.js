// Pestaña "Promociones": banners de texto que se muestran arriba del menú
// (Plan Profesional o superior; el servidor vuelve a comprobarlo).
import { h } from '/shared/core.js';

export function promosTab({ S, api, act, confirmDlg }) {
  if (!S.capabilities.features.includes('promociones')) {
    return h('section', { class: 'card' }, h('h2', {}, 'Promociones'),
      h('p', { class: 'lock-note' }, 'Las promociones visuales están disponibles desde el plan Profesional.'));
  }
  const title = h('input', { id: 'pr-t', maxlength: '60' });
  const desc = h('input', { id: 'pr-d', maxlength: '200' });
  const err = h('div', { class: 'form-error hidden', role: 'alert' });
  const add = h('button', { class: 'btn primary' }, 'Agregar promoción');
  add.onclick = async () => {
    err.classList.add('hidden');
    if (!title.value.trim()) { err.textContent = 'Escribí un título.'; err.classList.remove('hidden'); return; }
    add.disabled = true;
    try { await api('/owner/promotions', { method: 'POST', body: { title: title.value, description: desc.value } }); await act(async () => {}, 'Promoción agregada al borrador'); }
    catch (e) { add.disabled = false; if (e.message !== 'sesión') { err.textContent = e.message; err.classList.remove('hidden'); } }
  };
  return h('div', {},
    h('section', { class: 'card' },
      h('h2', {}, 'Promociones'),
      h('p', { class: 'muted' }, 'Se muestran como banners arriba del menú. Son solo texto: no cambian los precios. Podés tener hasta 10. Se ven recién cuando publiques.'),
      S.promotions.length ? S.promotions.map((p) => h('div', { class: `promo-row${p.active ? '' : ' off'}` },
        h('div', {}, h('strong', {}, p.title), !p.active && h('span', { class: 'tag-off' }, 'Oculta'), p.description && h('div', { class: 'pmeta' }, p.description)),
        h('div', { class: 'pacts' },
          h('button', { class: 'btn small', onclick: () => act(() => api(`/owner/promotions/${p.id}`, { method: 'PATCH', body: { active: !p.active } }), p.active ? 'Promoción oculta' : 'Promoción visible') }, p.active ? 'Ocultar' : 'Mostrar'),
          h('button', { class: 'btn small danger', onclick: () => confirmDlg(`¿Eliminar “${p.title}”?`, 'Esta acción no se puede deshacer.', 'Eliminar', () => act(() => api(`/owner/promotions/${p.id}`, { method: 'DELETE' }), 'Promoción eliminada')) }, 'Eliminar'))))
        : h('p', { class: 'empty' }, 'Todavía no creaste promociones.')),
    h('section', { class: 'card' }, h('h3', {}, 'Nueva promoción'),
      h('label', { for: 'pr-t' }, 'Título (por ejemplo: 2x1 en pizzas los martes)'), title,
      h('label', { for: 'pr-d' }, 'Detalle (opcional)'), desc, err,
      h('div', { class: 'actions' }, add)));
}
