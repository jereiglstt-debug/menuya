// Panel del propietario. Todo el contenido dinámico se inserta con
// textContent (nunca innerHTML). La seguridad real está en el servidor:
// aquí solo se refleja lo que el servidor ya permite.
import { h, money, toast, createSession } from '/shared/core.js';
import { renderMenu } from '/menu/render.js';
import { designTab } from '/panel/diseno.js';
import { qrTab } from '/panel/qrtab.js';
import { promosTab } from '/panel/promos.js';
import { pedidosTab, startOrderAlerts, stopOrderAlerts } from '/panel/pedidos.js';

const $app = document.getElementById('app');
const PLAN = { basico: 'Básico', profesional: 'Profesional', premium: 'Premium' };
const MAX_IMG = 2 * 1024 * 1024;
const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const cfg = await fetch('/api/config').then((r) => r.json()).catch(() => ({}));
if (!cfg.supabaseUrl) {
  $app.replaceChildren(h('main', { class: 'center-card' }, h('h1', {}, 'Falta configurar el servidor'),
    h('p', {}, 'El servicio todavía no está configurado. Avisale al administrador.')));
  throw new Error('config');
}
const session = createSession(cfg, 'owner-sess', (msg) => renderLogin(msg));
const api = session.api;
let S = null;
let TAB = 'menu';
let NEW_ORDERS = 0;
const TABS = [['menu', 'Menú'], ['pedidos', 'Pedidos'], ['promos', 'Promociones'], ['diseno', 'Diseño'], ['qr', 'Código QR']];

// ---------- login ----------
function renderLogin(msg) {
  stopOrderAlerts(); NEW_ORDERS = 0;
  const err = h('div', { class: `form-error ${msg ? '' : 'hidden'}`, role: 'alert' }, msg);
  const email = h('input', { id: 'e', type: 'email', autocomplete: 'username', required: true });
  const pw = h('input', { id: 'p', type: 'password', autocomplete: 'current-password', required: true });
  const btn = h('button', { class: 'btn primary', type: 'submit' }, 'Ingresar');
  $app.replaceChildren(h('main', { class: 'center-card' }, h('h1', {}, 'Mi menú'),
    h('p', { class: 'muted' }, 'Ingresá con tu correo y tu contraseña.'),
    h('form', { onsubmit: async (ev) => {
      ev.preventDefault(); btn.disabled = true; err.classList.add('hidden');
      const r = await session.login(email.value.trim(), pw.value);
      if (r.error) { err.textContent = r.error; err.classList.remove('hidden'); btn.disabled = false; return; }
      boot();
    } }, h('label', { for: 'e' }, 'Correo electrónico'), email, h('label', { for: 'p' }, 'Contraseña'), pw, err,
      h('div', { class: 'actions' }, btn))));
  email.focus();
}

// ---------- carga ----------
async function boot() {
  try { S = await api('/owner/menu'); render(); startAlerts(); }
  catch (e) {
    if (e.message === 'sesión') return;
    if (e.status === 403) { session.logout(); return renderLogin(e.message); }
    $app.replaceChildren(h('p', { class: 'empty' }, `No se pudo cargar tu menú: ${e.message}`));
  }
}
const tabLabel = (k, l) => (k === 'pedidos' && NEW_ORDERS ? `${l} (${NEW_ORDERS})` : l);
function startAlerts() {
  if (S?.capabilities.features.includes('pedidos_nativos')) startOrderAlerts(api, (n) => {
    NEW_ORDERS = n; const b = document.querySelector('.tab[data-k=pedidos]'); if (b) b.textContent = tabLabel('pedidos', 'Pedidos');
  });
}
async function reload() { S = await api('/owner/menu'); render(); }
// Ejecuta una acción y recarga; los errores se muestran, nunca se tragan.
async function act(fn, okMsg) {
  try { await fn(); await reload(); if (okMsg) toast(okMsg); }
  catch (e) { if (e.message !== 'sesión') toast(e.message); }
}

// ---------- diálogos ----------
function dialog(cls, ...kids) {
  const d = h('dialog', { class: cls }, ...kids);
  d.addEventListener('close', () => d.remove());
  document.body.append(d); d.showModal(); return d;
}
function confirmDlg(title, text, okLabel, onOk) {
  const d = dialog('', h('h2', {}, title), h('p', {}, text),
    h('div', { class: 'actions' },
      h('button', { class: 'btn danger', onclick: () => { d.close(); onOk(); } }, okLabel),
      h('button', { class: 'btn', autofocus: true, onclick: () => d.close() }, 'Cancelar')));
}
function inputDlg(title, label, value, okLabel, onOk) {
  const input = h('input', { id: 'dlg-in', maxlength: '60', value, required: true });
  const err = h('p', { class: 'field-error hidden' });
  const d = dialog('', h('h2', {}, title), h('form', { onsubmit: async (ev) => {
    ev.preventDefault();
    if (!input.value.trim()) { err.textContent = 'Escribí un nombre.'; err.classList.remove('hidden'); return; }
    d.close(); onOk(input.value.trim());
  } }, h('label', { for: 'dlg-in' }, label), input, err,
    h('div', { class: 'actions' }, h('button', { class: 'btn primary', type: 'submit' }, okLabel),
      h('button', { class: 'btn', type: 'button', onclick: () => d.close() }, 'Cancelar'))));
  input.focus(); input.select();
}

// ---------- arrastrar y soltar (y botones ↑ ↓ para teclado y celular) ----------
function makeSortable(list, itemSel, onReorder) {
  let dragged = null; let armed = null;
  // Solo se puede arrastrar tomando la manija (⋮⋮): se "arma" al presionarla.
  list.addEventListener('pointerdown', (e) => { armed = e.target.closest?.('.handle') ? e.target.closest(itemSel) : null; });
  list.addEventListener('dragstart', (e) => {
    const it = e.target;
    // e.target es el elemento arrastrado; ignora los de listas anidadas.
    if (!it.matches?.(itemSel) || it.parentElement !== list || armed !== it) { if (it.matches?.(itemSel) && it.parentElement === list) e.preventDefault(); return; }
    dragged = it; it.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', '');
  });
  list.addEventListener('dragover', (e) => {
    if (!dragged) return; e.preventDefault();
    const over = e.target.closest?.(itemSel);
    [...list.children].forEach((c) => c.classList.remove('drag-over'));
    if (over && over !== dragged && over.parentElement === list) over.classList.add('drag-over');
  });
  list.addEventListener('drop', (e) => {
    if (!dragged) return; e.preventDefault();
    const over = e.target.closest?.(itemSel);
    if (over && over !== dragged && over.parentElement === list) {
      const kids = [...list.children];
      if (kids.indexOf(dragged) < kids.indexOf(over)) over.after(dragged); else over.before(dragged);
      onReorder([...list.children].map((c) => c.dataset.id));
    }
  });
  list.addEventListener('dragend', () => { dragged?.classList.remove('dragging'); [...list.children].forEach((c) => c.classList.remove('drag-over')); dragged = null; armed = null; });
}
const move = (ids, id, dir) => {
  const i = ids.indexOf(id), j = i + dir;
  if (j < 0 || j >= ids.length) return null;
  const out = [...ids]; [out[i], out[j]] = [out[j], out[i]]; return out;
};

// ---------- vista principal ----------
function render() {
  const st = S.status;
  const published = st.version != null;
  const statusBar = h('div', { class: `status ${st.unpublished_changes ? 'pending' : 'synced'}`, role: 'status' },
    h('div', {},
      h('strong', {}, st.unpublished_changes ? 'Tenés cambios sin publicar' : published ? 'Tu menú está al día' : 'Todavía no publicaste tu menú'),
      h('span', { class: 'muted' }, st.unpublished_changes
        ? 'Tus clientes todavía ven la versión anterior.'
        : published ? `Versión ${st.version} publicada.` : 'Agregá productos y publicalo para que tus clientes lo vean.')),
    h('div', { class: 'acts' },
      h('button', { class: 'btn', onclick: openPreview }, 'Vista previa'),
      h('button', { class: 'btn primary', disabled: !st.unpublished_changes, onclick: (e) => doPublish(e.currentTarget) }, 'Publicar cambios')));

  $app.replaceChildren(
    h('header', { class: 'topbar' },
      h('div', {}, h('strong', {}, S.restaurant.name), ' ', h('span', { class: 'badge b-activo' }, `Plan ${PLAN[S.restaurant.plan]}`)),
      h('div', { class: 'who' },
        published && h('a', { class: 'btn small', href: `/${S.restaurant.slug}`, target: '_blank', rel: 'noopener' }, 'Ver menú público'),
        h('button', { class: 'btn small', onclick: () => { stopOrderAlerts(); NEW_ORDERS = 0; session.logout(); renderLogin(); } }, 'Salir'))),
    h('main', { class: 'wrap' }, statusBar,
      h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([k, l]) => h('button', { role: 'tab', 'aria-selected': String(TAB === k), class: `tab${TAB === k ? ' on' : ''}`, 'data-k': k, onclick: () => { TAB = k; render(); } }, tabLabel(k, l)))),
      TAB === 'menu' ? [businessCard(), menuSection()]
        : TAB === 'pedidos' ? pedidosTab({ S, api, confirmDlg, inputDlg })
        : TAB === 'promos' ? promosTab({ S, api, act, confirmDlg })
        : TAB === 'diseno' ? designTab({ S, api, act, toast, checkFile, IMG_TYPES, confirmDlg })
        : qrTab({ S, api })));
}

async function doPublish(btn) {
  if (btn) btn.disabled = true;
  try {
    const r = await api('/owner/publish', { method: 'POST' });
    await reload(); toast(`¡Listo! Publicaste la versión ${r.version}.`);
  } catch (e) { if (e.message !== 'sesión') { toast(e.message); if (btn) btn.disabled = false; } }
}

// ---------- negocio y logo ----------
function businessCard() {
  const title = h('input', { id: 'b-title', maxlength: '80', value: S.settings.title });
  const desc = h('textarea', { id: 'b-desc', maxlength: '500' }, S.settings.description);
  const wa = h('input', { id: 'b-wa', type: 'tel', inputmode: 'numeric', maxlength: '24', autocomplete: 'off', value: S.settings.whatsapp ?? '' });
  const file = h('input', { type: 'file', accept: IMG_TYPES.join(','), class: 'hidden', 'aria-label': 'Elegir logotipo', onchange: async () => {
    const f = file.files[0]; if (!f) return;
    const bad = checkFile(f); if (bad) return toast(bad);
    await act(() => api('/owner/logo', { method: 'POST', raw: f, type: f.type }), 'Logotipo actualizado');
  } });
  return h('section', { class: 'card' },
    h('div', { class: 'card-h' }, h('h2', {}, 'Tu negocio')),
    h('div', { class: 'logo-row' },
      h('div', { class: 'logo-box' }, S.settings.logo_url ? h('img', { src: S.settings.logo_url, alt: 'Logotipo' }) : 'Sin logo'),
      h('div', {}, h('button', { class: 'btn small', onclick: () => file.click() }, S.settings.logo_url ? 'Cambiar logotipo' : 'Subir logotipo'), file,
        S.settings.logo_url && h('button', { class: 'btn small danger ml', onclick: () => confirmDlg('¿Quitar el logotipo?', 'Dejará de mostrarse cuando publiques.', 'Quitar', () => act(() => api('/owner/logo', { method: 'DELETE' }), 'Logotipo quitado')) }, 'Quitar'),
        h('p', { class: 'hint' }, 'JPG, PNG o WebP. Hasta 2 MB.'))),
    h('label', { for: 'b-title' }, 'Nombre que se muestra en el menú'), title,
    h('label', { for: 'b-desc' }, 'Descripción (opcional)'), desc,
    h('label', { for: 'b-wa' }, 'WhatsApp del local (opcional)'), wa,
    h('p', { class: 'hint' }, 'Con código de país y sin el 0 ni el 15. Ejemplo: 5491122334455. Los clientes lo usan para escribirte' + (S.capabilities.features.includes('carrito') ? ' y para enviarte su pedido armado.' : '.')),
    h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: () => act(() => api('/owner/settings', { method: 'PATCH', body: { title: title.value, description: desc.value, whatsapp: wa.value } }), 'Datos guardados en el borrador') }, 'Guardar datos')));
}
function checkFile(f) {
  if (!IMG_TYPES.includes(f.type)) return 'Formato no permitido. Usá JPG, PNG o WebP.';
  if (f.size > MAX_IMG) return 'La imagen supera los 2 MB. Probá con una más liviana.';
  return null;
}

// ---------- categorías y productos ----------
function menuSection() {
  const cats = S.categories;
  const list = h('div', { id: 'cats' }, cats.map((c, i) => categoryCard(c, i, cats)));
  makeSortable(list, '.cat', (ids) => act(() => api('/owner/categories/reorder', { method: 'POST', body: { ids } })));
  return h('section', {},
    h('div', { class: 'card-h' }, h('h2', {}, 'Tu menú'),
      h('button', { class: 'btn primary', onclick: () => inputDlg('Nueva categoría', 'Nombre (por ejemplo: Pizzas)', '', 'Crear', (name) => act(() => api('/owner/categories', { method: 'POST', body: { name } }), 'Categoría creada')) }, 'Nueva categoría')),
    cats.length ? list : h('div', { class: 'card empty' }, 'Todavía no hay categorías. Creá la primera (por ejemplo “Entradas” o “Bebidas”) y después agregale productos.'));
}

function categoryCard(c, i, cats) {
  const ids = cats.map((x) => x.id);
  const upDown = (id, dir, path, extra = {}) => { const o = move(ids, id, dir); if (o) act(() => api(path, { method: 'POST', body: { ...extra, ids: o } })); };
  const plist = h('ul', { class: 'plist' }, c.products.map((p) => productRow(p, c)));
  makeSortable(plist, '.prow', (pids) => act(() => api('/owner/products/reorder', { method: 'POST', body: { category_id: c.id, ids: pids } })));
  return h('div', { class: 'cat', 'data-id': c.id, draggable: 'true' },
    h('div', { class: 'cat-h' },
      h('span', { class: 'handle', title: 'Arrastrar para ordenar', 'aria-hidden': 'true' }, '⋮⋮'),
      h('h3', {}, c.name),
      h('button', { class: 'btn small', 'aria-label': `Subir ${c.name}`, disabled: i === 0, onclick: () => upDown(c.id, -1, '/owner/categories/reorder') }, '↑'),
      h('button', { class: 'btn small', 'aria-label': `Bajar ${c.name}`, disabled: i === cats.length - 1, onclick: () => upDown(c.id, 1, '/owner/categories/reorder') }, '↓'),
      h('button', { class: 'btn small', onclick: () => inputDlg('Renombrar categoría', 'Nombre', c.name, 'Guardar', (name) => act(() => api(`/owner/categories/${c.id}`, { method: 'PATCH', body: { name } }), 'Categoría actualizada')) }, 'Renombrar'),
      h('button', { class: 'btn small danger', onclick: () => confirmDlg(`¿Eliminar “${c.name}”?`, c.products.length ? `Se van a eliminar también sus ${c.products.length} producto(s). Esta acción no se puede deshacer.` : 'Esta acción no se puede deshacer.', 'Eliminar', () => act(() => api(`/owner/categories/${c.id}`, { method: 'DELETE' }), 'Categoría eliminada')) }, 'Eliminar')),
    c.products.length ? plist : h('p', { class: 'muted pad' }, 'Esta categoría todavía no tiene productos.'),
    h('div', { class: 'add-row' }, h('button', { class: 'btn small', onclick: () => productDialog(null, c.id) }, '+ Agregar producto')));
}

function productRow(p, c) {
  const ids = c.products.map((x) => x.id);
  const reorder = (dir) => { const o = move(ids, p.id, dir); if (o) act(() => api('/owner/products/reorder', { method: 'POST', body: { category_id: c.id, ids: o } })); };
  const i = ids.indexOf(p.id);
  return h('li', { class: `prow${p.available ? '' : ' off'}`, 'data-id': p.id, draggable: 'true' },
    h('span', { class: 'handle', title: 'Arrastrar para ordenar', 'aria-hidden': 'true' }, '⋮⋮'),
    p.image_url ? h('img', { class: 'thumb', src: p.image_url, alt: '' }) : h('span', { class: 'thumb' }, 'Sin foto'),
    h('div', {}, h('div', { class: 'pname' }, p.name, p.featured && h('span', { class: 'tag-star' }, '★ Destacado'), !p.available && h('span', { class: 'tag-off' }, 'Agotado')), h('div', { class: 'pmeta' }, money(p.price_ars))),
    h('div', { class: 'pacts' },
      h('button', { class: 'btn small', 'aria-label': `Subir ${p.name}`, disabled: i === 0, onclick: () => reorder(-1) }, '↑'),
      h('button', { class: 'btn small', 'aria-label': `Bajar ${p.name}`, disabled: i === ids.length - 1, onclick: () => reorder(1) }, '↓'),
      h('button', { class: 'btn small', onclick: () => act(() => api(`/owner/products/${p.id}`, { method: 'PATCH', body: { available: !p.available } }), p.available ? 'Marcado como agotado' : 'Marcado como disponible') }, p.available ? 'Marcar agotado' : 'Marcar disponible'),
      h('button', { class: 'btn small', onclick: () => productDialog(p, c.id) }, 'Editar'),
      h('button', { class: 'btn small', onclick: () => act(() => api(`/owner/products/${p.id}/duplicate`, { method: 'POST' }), 'Producto duplicado') }, 'Duplicar'),
      h('button', { class: 'btn small danger', onclick: () => confirmDlg(`¿Eliminar “${p.name}”?`, 'Esta acción no se puede deshacer.', 'Eliminar', () => act(() => api(`/owner/products/${p.id}`, { method: 'DELETE' }), 'Producto eliminado')) }, 'Eliminar')));
}

// ---------- formulario de producto ----------
function productDialog(p, categoryId) {
  const f = {
    name: h('input', { id: 'f-name', maxlength: '80', required: true, value: p?.name ?? '' }),
    desc: h('textarea', { id: 'f-desc', maxlength: '300' }, p?.description ?? ''),
    price: h('input', { id: 'f-price', inputmode: 'decimal', required: true, value: p ? String(p.price_ars).replace('.', ',') : '', placeholder: '0' }),
    cat: h('select', { id: 'f-cat' }, S.categories.map((c) => h('option', { value: c.id, selected: c.id === (p?.category_id ?? categoryId) }, c.name))),
    avail: h('input', { id: 'f-av', type: 'checkbox', checked: p ? p.available : true }),
    feat: h('input', { id: 'f-ft', type: 'checkbox', checked: !!p?.featured }),
    file: h('input', { type: 'file', accept: IMG_TYPES.join(','), class: 'hidden', 'aria-label': 'Elegir foto' }),
  };
  const canFeature = S.capabilities.features.includes('destacados');
  let newFile = null; let removeImage = false;
  const prev = h('div', { class: 'img-prev' }, p?.image_url ? h('img', { src: p.image_url, alt: '' }) : 'Sin foto');
  const err = h('div', { class: 'form-error hidden', role: 'alert' });
  const fe = {}; const L = (k, id, text, el, hint) => { fe[k] = h('p', { class: 'field-error hidden' }); return h('div', {}, h('label', { for: id }, text), el, hint && h('p', { class: 'hint' }, hint), fe[k]); };
  let urlToRevoke = null;
  f.file.addEventListener('change', () => {
    const file = f.file.files[0]; if (!file) return;
    const bad = checkFile(file); if (bad) { toast(bad); f.file.value = ''; return; }
    newFile = file; removeImage = false;
    if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    urlToRevoke = URL.createObjectURL(file);
    prev.replaceChildren(h('img', { src: urlToRevoke, alt: '' }));
  });
  const btn = h('button', { class: 'btn primary', type: 'submit' }, p ? 'Guardar cambios' : 'Crear producto');
  const d = dialog('wide', h('h2', {}, p ? 'Editar producto' : 'Nuevo producto'),
    h('form', { onsubmit: async (ev) => {
      ev.preventDefault(); btn.disabled = true; err.classList.add('hidden'); Object.values(fe).forEach((e) => e.classList.add('hidden'));
      try {
        const body = { name: f.name.value, description: f.desc.value, price_ars: f.price.value.replace(/\./g, '').replace(',', '.'), category_id: f.cat.value, available: f.avail.checked };
        if (canFeature || p?.featured) body.featured = canFeature ? f.feat.checked : false;
        const saved = p ? (await api(`/owner/products/${p.id}`, { method: 'PATCH', body })).product : (await api('/owner/products', { method: 'POST', body })).product;
        if (newFile) await api(`/owner/products/${saved.id}/image`, { method: 'POST', raw: newFile, type: newFile.type });
        else if (removeImage && p?.image_url) await api(`/owner/products/${saved.id}/image`, { method: 'DELETE' });
        d.close(); await reload(); toast(p ? 'Producto actualizado' : 'Producto creado');
      } catch (e) {
        if (e.message === 'sesión') return;
        btn.disabled = false;
        const map = { name: 'name', description: 'desc', price_ars: 'price', category_id: 'cat' }; let shown = false;
        for (const [k, msg] of Object.entries(e.details || {})) if (fe[map[k]]) { fe[map[k]].textContent = msg; fe[map[k]].classList.remove('hidden'); shown = true; }
        if (!shown) { err.textContent = e.message; err.classList.remove('hidden'); }
      }
    } },
      L('name', 'f-name', 'Nombre', f.name),
      L('desc', 'f-desc', 'Descripción (opcional)', f.desc),
      h('div', { class: 'row' }, L('price', 'f-price', 'Precio (en pesos)', f.price, 'Por ejemplo: 9500 o 9500,50'), L('cat', 'f-cat', 'Categoría', f.cat)),
      h('label', {}, 'Foto'),
      h('div', { class: 'img-row' }, prev, h('div', {},
        h('button', { class: 'btn small', type: 'button', onclick: () => f.file.click() }, 'Elegir foto'), f.file,
        (p?.image_url) && h('button', { class: 'btn small danger ml', type: 'button', onclick: () => { removeImage = true; newFile = null; f.file.value = ''; prev.replaceChildren('Sin foto'); } }, 'Quitar foto'),
        h('p', { class: 'hint' }, 'JPG, PNG o WebP. Hasta 2 MB.'))),
      h('label', { class: 'check', for: 'f-av' }, f.avail, 'Disponible (si lo desmarcás se muestra como “Agotado”)'),
      canFeature ? h('label', { class: 'check', for: 'f-ft' }, f.feat, 'Producto destacado (aparece arriba, en “Destacados”)') : h('p', { class: 'lock-note' }, 'Destacados: disponible desde el plan Profesional.'), err,
      h('div', { class: 'actions' }, btn, h('button', { class: 'btn', type: 'button', onclick: () => d.close() }, 'Cancelar'))));
  d.addEventListener('close', () => { if (urlToRevoke) URL.revokeObjectURL(urlToRevoke); });
  f.name.focus();
}

// ---------- vista previa (borrador, con el mismo dibujo que el menú público) ----------
async function openPreview() {
  try {
    const data = await api('/owner/preview');
    const d = dialog('wide', h('div', { class: 'preview-bar' }, h('h2', { class: 'm0' }, 'Vista previa del borrador'),
      h('button', { class: 'btn small', onclick: () => d.close() }, 'Cerrar')),
      h('p', { class: 'muted' }, 'Así se verá tu menú cuando publiques. Tus clientes todavía no ven esto.'),
      h('div', { class: 'preview-frame' }, renderMenu(data)));
  } catch (e) { if (e.message !== 'sesión') toast(e.message); }
}

session.has() ? boot() : renderLogin();
