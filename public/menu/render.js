// Dibuja un menú a partir de datos en formato público. Lo usan la página
// pública y la vista previa del panel, así lo que se previsualiza es lo mismo
// que verán los clientes.
import { h, money } from '/shared/core.js';
import { resolveDesign, FONTS, fontHref, textOn } from '/shared/design.js';

// Carga la tipografía elegida (una sola vez por fuente).
function loadFont(key) {
  const id = `gf-${key}`;
  if (document.getElementById(id)) return;
  document.head.append(h('link', { id, rel: 'stylesheet', href: fontHref(key) }));
}
// Aplica el diseño con variables CSS (el CSP no permite style="" inline).
function applyDesign(el, raw) {
  const d = resolveDesign(raw || {});
  el.dataset.template = d.template; el.dataset.card = d.card_style;
  el.style.setProperty('--m-bg', d.bg); el.style.setProperty('--m-ink', d.ink);
  el.style.setProperty('--m-accent', d.accent); el.style.setProperty('--m-on-accent', textOn(d.accent));
  el.style.setProperty('--m-font', FONTS[d.font].css);
  loadFont(d.font);
}

export function renderMenu(d) {
  const cats = d.categories.filter((c) => c.products.length);
  const root = h('div', { class: 'menu' },
    d.cover_url && h('img', { class: 'm-cover', src: d.cover_url, alt: '' }),
    h('header', { class: 'm-head' },
      d.logo_url && h('img', { class: 'm-logo', src: d.logo_url, alt: '' }),
      h('h1', {}, d.title),
      d.description && h('p', { class: 'm-desc' }, d.description)),
    cats.length > 1 && h('nav', { class: 'm-nav', 'aria-label': 'Categorías' },
      cats.map((c, i) => h('a', { href: `#m-cat-${i}` }, c.name))),
    cats.map((c, i) => h('section', { class: 'm-cat', id: `m-cat-${i}` },
      h('h2', {}, c.name),
      h('ul', { class: 'm-list' }, c.products.map((p) => h('li', { class: `m-item${p.available ? '' : ' off'}` },
        p.image_url && h('img', { class: 'm-img', src: p.image_url, alt: p.name, loading: 'lazy', width: '96', height: '96' }),
        h('div', { class: 'm-body' },
          h('h3', {}, p.name),
          p.description && h('p', {}, p.description),
          !p.available && h('span', { class: 'm-tag' }, 'Agotado')),
        h('div', { class: 'm-price' }, money(p.price_ars))))))),
    !cats.length && h('p', { class: 'm-empty' }, 'Todavía no hay productos para mostrar.'));
  applyDesign(root, d.design);
  return root;
}
