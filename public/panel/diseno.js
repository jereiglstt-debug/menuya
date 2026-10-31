// Pestaña "Diseño". La interfaz solo muestra como disponible lo que el plan
// permite (S.capabilities, calculado por el servidor); el servidor vuelve a
// validar todo al guardar, así que ocultar controles NO es la protección.
import { h } from '/shared/core.js';
import { renderMenu } from '/menu/render.js';
import { cropImage } from '/panel/recorte.js';
import { TEMPLATES, FONTS, CARD_STYLES, resolveDesign, validateDesign } from '/shared/design.js';

let D = null; // borrador de diseño en pantalla (se conserva entre redibujados)
export const resetDesign = () => { D = null; };

const SAMPLE = [{ name: 'Ejemplo', products: [
  { name: 'Plato de la casa', description: 'Así se verá la descripción de un producto.', price_ars: 9500, available: true, image_url: null },
  { name: 'Postre del día', description: '', price_ars: 4200, available: true, image_url: null },
  { name: 'Agotado hoy', description: '', price_ars: 3000, available: false, image_url: null }] }];

export function designTab({ S, api, act, toast, checkFile, IMG_TYPES, confirmDlg }) {
  const perms = S.capabilities.design;
  if (!D) D = { ...S.design };
  const preview = h('div', { class: 'preview-frame design-prev' });
  const errBox = h('div', { class: 'form-error hidden', role: 'alert' });
  const saveBtn = h('button', { class: 'btn primary' }, 'Guardar diseño');

  const data = () => ({
    title: S.settings.title || S.restaurant.name, description: S.settings.description, logo_url: S.settings.logo_url,
    cover_url: S.cover_url, design: D,
    promotions: S.capabilities.features.includes('promociones') ? S.promotions.filter((p) => p.active) : [],
    categories: S.categories.some((c) => c.products.length)
      ? S.categories.map((c) => ({ name: c.name, products: c.products.map((p) => ({ ...p, featured: p.featured && S.capabilities.features.includes('destacados') })) })) : SAMPLE,
  });
  function refresh() {
    preview.replaceChildren(renderMenu(data()));
    const v = validateDesign(D, perms);
    const msgs = Object.values(v.errors);
    errBox.classList.toggle('hidden', !msgs.length); errBox.textContent = msgs.join(' ');
    saveBtn.disabled = !v.ok;
  }
  const set = (k, val) => { D = { ...D, [k]: val }; refresh(); };

  // Plantillas: solo se ofrecen las del plan.
  const tpl = h('div', { class: 'opt-grid', role: 'radiogroup', 'aria-label': 'Plantilla' },
    Object.entries(TEMPLATES).map(([key, t]) => {
      const locked = !perms.templates.includes(key);
      const b = h('button', { type: 'button', role: 'radio', class: `opt${D.template === key ? ' on' : ''}${locked ? ' locked' : ''}`,
        'aria-checked': String(D.template === key), disabled: locked, onclick: () => { set('template', key); tpl.querySelectorAll('.opt').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); }); } },
        h('strong', {}, t.label), locked && h('span', { class: 'hint' }, 'Plan Profesional'));
      return b;
    }));

  function colorField(key, label, adv) {
    if (adv && !perms.advanced) return h('div', { class: 'lock-note' }, `${label}: disponible desde el plan Profesional.`);
    const r = resolveDesign(D)[key];
    const input = h('input', { type: 'color', id: `c-${key}`, value: r, 'aria-label': label, onchange: () => set(key, input.value) });
    return h('div', { class: 'field-inline' }, h('label', { for: `c-${key}` }, label), input,
      h('button', { type: 'button', class: 'btn small', onclick: () => { set(key, null); input.value = resolveDesign(D)[key]; } }, 'Restaurar'));
  }
  function selectField(key, label, table, fmt) {
    if (!perms.advanced) return h('div', { class: 'lock-note' }, `${label}: disponible desde el plan Profesional.`);
    const sel = h('select', { id: `s-${key}`, onchange: () => set(key, sel.value || null) },
      h('option', { value: '' }, 'Según la plantilla'),
      Object.entries(table).map(([k, v]) => h('option', { value: k, selected: D[key] === k }, fmt(v))));
    return h('div', {}, h('label', { for: `s-${key}` }, label), sel);
  }

  const file = h('input', { type: 'file', accept: IMG_TYPES.join(','), class: 'hidden', 'aria-label': 'Elegir portada', onchange: async () => {
    const f = file.files[0]; if (!f) return;
    const bad = checkFile(f); if (bad) { file.value = ''; return toast(bad); }
    let blob; try { blob = await cropImage({ file: f, aspect: 2, outW: 1280, title: 'Ajustar portada' }); } catch (e) { file.value = ''; return toast(e.message); }
    file.value = ''; if (!blob) return;
    await act(() => api('/owner/cover', { method: 'POST', raw: blob, type: blob.type }), 'Portada actualizada en el borrador');
  } });
  const cover = perms.advanced
    ? h('div', {}, h('p', { class: 'm0' }, 'Imagen de portada (fondo detrás del logo y el nombre)'),
        h('button', { class: 'btn small', onclick: () => file.click() }, S.cover_url ? 'Cambiar portada' : 'Subir portada'), file,
        S.cover_url && h('button', { class: 'btn small danger ml', onclick: () => confirmDlg('¿Quitar la portada?', 'Dejará de mostrarse cuando publiques.', 'Quitar', () => act(() => api('/owner/cover', { method: 'DELETE' }), 'Portada quitada')) }, 'Quitar'),
        h('p', { class: 'hint' }, 'JPG, PNG o WebP, hasta 2 MB. Mejor si es apaisada.'))
    : h('div', { class: 'lock-note' }, 'Portada: disponible desde el plan Profesional.');

  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    try { await api('/owner/design', { method: 'PATCH', body: D }); resetDesign(); await act(async () => {}, 'Diseño guardado en el borrador. Publicá para que lo vean tus clientes.'); }
    catch (e) { if (e.message !== 'sesión') toast(e.message); saveBtn.disabled = false; }
  };

  refresh();
  return h('div', { class: 'design-grid' },
    h('section', { class: 'card' },
      h('h2', {}, 'Diseño de tu menú'),
      h('p', { class: 'muted' }, 'Los cambios se ven acá al instante, pero tus clientes los ven recién cuando publiques.'),
      h('h3', {}, 'Plantilla'), tpl,
      h('h3', {}, 'Colores'),
      colorField('accent', 'Color destacado', false), colorField('bg', 'Color de fondo', true), colorField('ink', 'Color del texto', true),
      h('h3', {}, 'Letra y tarjetas'),
      selectField('font', 'Tipografía', FONTS, (f) => f.label), selectField('card_style', 'Estilo de los productos', CARD_STYLES, (s) => s),
      h('h3', {}, 'Portada'), cover,
      errBox, h('div', { class: 'actions' }, saveBtn)),
    h('section', {}, h('h3', { class: 'm0 pad' }, 'Vista previa'), preview));
}
