// Dibuja un menú a partir de datos en formato público. Lo usan la página
// pública y la vista previa del panel, así lo que se previsualiza es lo mismo
// que verán los clientes.
import { h, money } from '/shared/core.js';
import { resolveDesign, FONTS, fontHref, textOn } from '/shared/design.js';
import { PAY_LABEL } from '/shared/pagos.js';
import { openOrderForm, openTracking, savedOrder } from '/menu/pedido.js';
import { waLink, inquiryMessage, orderMessage, orderTotal, MAX_QTY, MAX_LINES, MAX_URL } from '/shared/whatsapp.js';

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
  const ord = d.ordering || null; // pedidos nativos (Premium)
  const mode = ord ? (ord.state === 'abierto' ? 'native' : 'none') : (d.cart && d.whatsapp ? 'wa' : 'none');
  const cartOn = mode !== 'none';
  const barOn = cartOn || !!ord; // con pedidos nativos, el seguimiento sigue disponible aunque el local pause
  const cart = new Map(); // clave de producto -> { name, price_ars, qty }
  const bar = h('div', { class: 'm-bar hidden' });
  const dlg = h('dialog', { class: 'm-cart', 'aria-label': 'Tu pedido' });

  const items = () => [...cart.values()];
  const count = () => items().reduce((s, i) => s + i.qty, 0);
  function refreshBar() {
    if (!barOn) return;
    const saved = ord ? savedOrder(d.slug) : null;
    bar.classList.toggle('hidden', cart.size === 0 && !saved);
    if (cart.size === 0 && saved) { bar.replaceChildren(h('button', { class: 'm-btn alt', onclick: showTracking }, `Ver el estado de mi pedido #${saved.number}`)); return; }
    bar.replaceChildren(h('button', { class: 'm-btn', onclick: openCart }, `Ver mi pedido · ${count()} ${count() === 1 ? 'producto' : 'productos'} · ${money(orderTotal(items()))}`));
  }
  function showTracking() {
    openTracking({ dlg, slug: d.slug, onNew: () => { dlg.close(); refreshBar(); } });
    if (!dlg.open) dlg.showModal();
  }
  function add(key, p) {
    const cur = cart.get(key);
    if (cur) { if (cur.qty >= MAX_QTY) return; cur.qty += 1; }
    else if (cart.size >= MAX_LINES) return;
    else cart.set(key, { id: p.id, name: p.name, price_ars: p.price_ars, qty: 1 });
    refreshBar();
  }
  function openCart() {
    if (mode === 'native') {
      openOrderForm({ dlg, d, ord, cart, paint: refreshBar, onPlaced: () => { showTracking(); refreshBar(); } });
      if (cart.size && !dlg.open) dlg.showModal();
      return;
    }
    const customer = h('input', { id: 'm-cust', maxlength: '60', autocomplete: 'name' });
    const note = h('textarea', { id: 'm-note', maxlength: '300', rows: '2' });
    const list = h('ul', { class: 'm-cart-list' });
    const total = h('p', { class: 'm-cart-total' });
    const warn = h('p', { class: 'm-cart-warn hidden', role: 'alert' });
    const send = h('a', { class: 'm-btn', target: '_blank', rel: 'noopener noreferrer' }, 'Enviar por WhatsApp');
    function paint() {
      if (!cart.size) { dlg.close(); refreshBar(); return; }
      list.replaceChildren(...[...cart.entries()].map(([key, i]) => h('li', {},
        h('span', { class: 'm-cart-name' }, i.name),
        h('span', { class: 'm-qty' },
          h('button', { class: 'm-q', 'aria-label': `Quitar uno de ${i.name}`, onclick: () => { i.qty -= 1; if (i.qty <= 0) cart.delete(key); paint(); } }, '−'),
          h('strong', {}, String(i.qty)),
          h('button', { class: 'm-q', 'aria-label': `Agregar uno de ${i.name}`, disabled: i.qty >= MAX_QTY, onclick: () => { i.qty += 1; paint(); } }, '+')),
        h('span', { class: 'm-cart-sub' }, money(i.price_ars * i.qty)))));
      total.textContent = `Total estimado: ${money(orderTotal(items()))}`;
      const link = waLink(d.whatsapp, orderMessage({ title: d.title, items: items(), customer: customer.value, note: note.value }));
      const tooLong = link.length > MAX_URL;
      warn.textContent = 'El pedido es muy largo para enviarlo por WhatsApp. Sacá algunos productos o acortá las aclaraciones.';
      warn.classList.toggle('hidden', !tooLong);
      if (tooLong) { send.removeAttribute('href'); send.setAttribute('aria-disabled', 'true'); } else { send.setAttribute('href', link); send.removeAttribute('aria-disabled'); }
      refreshBar();
    }
    customer.addEventListener('input', paint); note.addEventListener('input', paint);
    dlg.replaceChildren(
      h('h2', {}, 'Tu pedido'), list, total,
      h('label', { for: 'm-cust' }, 'Tu nombre (opcional)'), customer,
      h('label', { for: 'm-note' }, 'Aclaraciones (opcional)'), note,
      h('p', { class: 'm-cart-hint' }, 'Esto no es un pedido confirmado: se abre WhatsApp con un mensaje ya escrito para que se lo envíes al local, que te confirma.'),
      warn,
      h('div', { class: 'm-cart-actions' }, send, h('button', { class: 'm-btn alt', onclick: () => dlg.close() }, 'Seguir mirando el menú')));
    paint();
    if (cart.size && !dlg.open) dlg.showModal();
  }

  const item = (p, key) => h('li', { class: `m-item${p.available ? '' : ' off'}` },
    p.image_url && h('img', { class: 'm-img', src: p.image_url, alt: p.name, loading: 'lazy', width: '96', height: '96' }),
    h('div', { class: 'm-body' },
      h('h3', {}, p.name),
      p.description && h('p', {}, p.description),
      !p.available && h('span', { class: 'm-tag' }, 'Agotado'),
      cartOn && p.available && h('button', { class: 'm-add', 'aria-label': `Agregar ${p.name} al pedido`, onclick: () => add(key, p) }, 'Agregar')),
    h('div', { class: 'm-price' }, money(p.price_ars)));

  const featured = cats.flatMap((c, ci) => c.products.map((p, pi) => ({ p, key: `${ci}:${pi}` }))).filter((x) => x.p.featured);
  const promos = d.promotions || [];

  const root = h('div', { class: 'menu' },
    // La portada es el FONDO del encabezado: queda detrás del logo y del nombre.
    h('header', { class: d.cover_url ? 'm-head m-hero' : 'm-head' },
      d.cover_url && h('img', { class: 'm-cover', src: d.cover_url, alt: '' }),
      h('div', { class: 'm-head-in' },
        d.logo_url && h('img', { class: 'm-logo', src: d.logo_url, alt: '' }),
        h('h1', {}, d.title),
        d.description && h('p', { class: 'm-desc' }, d.description))),
    promos.length > 0 && h('section', { class: 'm-promos', 'aria-label': 'Promociones' },
      promos.map((pr) => h('div', { class: 'm-promo' }, h('strong', {}, pr.title), pr.description && h('span', {}, pr.description)))),
    (cats.length > 1 || featured.length > 0) && h('nav', { class: 'm-nav', 'aria-label': 'Categorías' },
      featured.length > 0 && h('a', { href: '#m-destacados' }, '★ Destacados'),
      cats.map((c, i) => h('a', { href: `#m-cat-${i}` }, c.name))),
    featured.length > 0 && h('section', { class: 'm-cat m-featured', id: 'm-destacados' },
      h('h2', {}, '★ Destacados'),
      h('ul', { class: 'm-list' }, featured.map((x) => item(x.p, x.key)))),
    cats.map((c, ci) => h('section', { class: 'm-cat', id: `m-cat-${ci}` },
      h('h2', {}, c.name),
      h('ul', { class: 'm-list' }, c.products.map((p, pi) => item(p, `${ci}:${pi}`))))),
    !cats.length && h('p', { class: 'm-empty' }, 'Todavía no hay productos para mostrar.'),
    d.payments && d.payments.methods.length > 0 && h('footer', { class: 'm-pay' },
      h('strong', {}, 'Medios de pago: '),
      d.payments.methods.map((m) => PAY_LABEL[m]).join(' · '),
      d.payments.methods.includes('combinado') && d.payments.combo_options.length >= 2 && h('span', { class: 'm-pay-combo' }, ` (en “Combinado” podés usar: ${d.payments.combo_options.map((m) => PAY_LABEL[m]).join(' + ')})`)),
    barOn && bar, barOn && dlg,
    ord && ord.state !== 'abierto' && h('div', { class: 'm-closed', role: 'status' }, ord.state === 'pausado' ? 'Los pedidos están pausados por un momento. Podés ver el menú igual.' : 'Ahora no estamos recibiendo pedidos. Podés ver el menú igual.'),
    !cartOn && !ord && d.whatsapp && h('div', { class: 'm-bar' },
      h('a', { class: 'm-btn', href: waLink(d.whatsapp, inquiryMessage(d.title)), target: '_blank', rel: 'noopener noreferrer' }, 'Consultar por WhatsApp')));
  refreshBar();
  applyDesign(root, d.design);
  return root;
}
