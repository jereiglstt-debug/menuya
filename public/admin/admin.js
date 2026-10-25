// Panel de administración. Todo el contenido dinámico se inserta con
// textContent (nunca innerHTML) para evitar XSS.
const $app = document.getElementById('app');
const PLAN = { basico: 'Básico', profesional: 'Profesional', premium: 'Premium' };
const ESTADO = { activo: 'Activa', vencido: 'Vencida', suspendido: 'Suspendida', sin_suscripcion: 'Sin suscripción' };
const METODO = { efectivo: 'Efectivo', transferencia: 'Transferencia', otro: 'Otro' };

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}
const money = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
const fdate = (d) => (d ? d.split('-').reverse().join('/') : '—');
const badge = (estado) => h('span', { class: `badge b-${estado}` }, ESTADO[estado]);
const todayAR = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

function toast(msg) {
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t); setTimeout(() => t.remove(), 3500);
}

// ---------- sesión (GoTrue por REST) ----------
let cfg; let session = JSON.parse(sessionStorage.getItem('sess') || 'null');
const saveSession = (s) => { session = s; s ? sessionStorage.setItem('sess', JSON.stringify(s)) : sessionStorage.removeItem('sess'); };

async function tokenRequest(grant, body) {
  const res = await fetch(`${cfg.supabaseUrl}/auth/v1/token?grant_type=${grant}`, {
    method: 'POST', headers: { apikey: cfg.supabaseAnonKey, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = d.error_code || d.code || '';
    const text = `${d.msg || d.message || d.error_description || ''}`;
    let error = 'Correo o contraseña incorrectos.';
    if (res.status === 429) error = 'Demasiados intentos. Esperá unos minutos.';
    else if (code === 'email_not_confirmed' || /not confirmed/i.test(text)) error = 'El usuario existe pero no está confirmado. En Supabase marcá “Confirm user” o recrealo con “Auto Confirm User”.';
    else if (res.status === 401 || res.status === 403 || /api key|secret/i.test(text)) error = `La clave pública configurada en el servidor (SUPABASE_ANON_KEY) no es válida (HTTP ${res.status}). Revisá que sea la clave publishable/anon y no la secreta.`;
    else if (res.status >= 500) error = 'Supabase no está respondiendo. Si el proyecto estaba pausado, reactivalo desde su panel.';
    return { error };
  }
  saveSession({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in - 30) * 1000 });
  return {};
}

async function api(path, { method = 'GET', body } = {}) {
  if (session && Date.now() > session.expires_at) {
    const r = await tokenRequest('refresh_token', { refresh_token: session.refresh_token });
    if (r.error) { saveSession(null); return renderLogin('Tu sesión venció. Volvé a ingresar.'), Promise.reject(new Error('sesión')); }
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers: { authorization: `Bearer ${session?.access_token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { saveSession(null); renderLogin('Tu sesión venció. Volvé a ingresar.'); throw new Error('sesión'); }
  if (!res.ok) throw Object.assign(new Error(data.error || 'Error'), { details: data.details, status: res.status });
  return data;
}

// ---------- login ----------
function renderLogin(msg) {
  const err = h('div', { class: `form-error ${msg ? '' : 'hidden'}`, role: 'alert' }, msg);
  const email = h('input', { id: 'e', type: 'email', autocomplete: 'username', required: true });
  const pw = h('input', { id: 'p', type: 'password', autocomplete: 'current-password', required: true });
  const btn = h('button', { class: 'btn primary', type: 'submit' }, 'Ingresar');
  const form = h('form', { onsubmit: async (ev) => {
    ev.preventDefault(); btn.disabled = true; err.classList.add('hidden');
    const r = await tokenRequest('password', { email: email.value.trim(), password: pw.value });
    if (r.error) { err.textContent = r.error; err.classList.remove('hidden'); btn.disabled = false; return; }
    boot();
  } },
    h('label', { for: 'e' }, 'Correo electrónico'), email,
    h('label', { for: 'p' }, 'Contraseña'), pw, err,
    h('div', { class: 'actions' }, btn));
  $app.replaceChildren(h('main', { class: 'center-card' }, h('h1', {}, 'Administración'), h('p', { class: 'muted' }, 'Ingresá con tu cuenta de administrador.'), form));
  email.focus();
}

// ---------- estado ----------
const S = { tab: 'restaurantes', list: [], selected: null, detail: null, filter: '', q: '' };

async function boot() {
  try {
    const me = await api('/me');
    if (me.role !== 'admin') { saveSession(null); return renderLogin('Esta cuenta no es de administrador.'); }
    S.email = me.email;
    await loadList(); render();
  } catch (e) { if (e.message !== 'sesión') $app.replaceChildren(h('p', { class: 'empty' }, `No se pudo cargar el panel: ${e.message}`)); }
}
async function loadList() { S.list = (await api('/admin/restaurants')).restaurants; }
async function select(id) { S.selected = id; S.detail = await api(`/admin/restaurants/${id}`); render(); }

function render() {
  const tabBtn = (k, label) => h('button', { class: 'tab', role: 'tab', 'aria-selected': S.tab === k, onclick: () => { S.tab = k; render(); } }, label);
  $app.replaceChildren(
    h('header', { class: 'topbar' }, h('strong', {}, 'MenúYa · Administración'),
      h('nav', { role: 'tablist' }, tabBtn('restaurantes', 'Restaurantes'), tabBtn('actividad', 'Actividad')),
      h('div', { class: 'who' }, h('span', { class: 'muted' }, S.email),
        h('button', { class: 'btn small', onclick: () => { saveSession(null); renderLogin(); } }, 'Salir'))),
    S.tab === 'restaurantes' ? viewRestaurants() : h('main', { class: 'layout' }, h('section', { class: 'panel', id: 'audit' })));
  if (S.tab === 'actividad') viewAudit();
}

// ---------- restaurantes ----------
function viewRestaurants() {
  const rows = S.list.filter((r) => (!S.filter || r.estado_cuenta === S.filter)
    && (!S.q || `${r.name} ${r.slug} ${r.owner_email}`.toLowerCase().includes(S.q.toLowerCase())));
  const search = h('input', { type: 'search', placeholder: 'Buscar…', 'aria-label': 'Buscar restaurante', value: S.q,
    oninput: (e) => { S.q = e.target.value; const pos = e.target.selectionStart; render(); const n = document.querySelector('[type=search]'); n.focus(); n.setSelectionRange(pos, pos); } });
  const filter = h('select', { 'aria-label': 'Filtrar por estado', onchange: (e) => { S.filter = e.target.value; render(); } },
    h('option', { value: '' }, 'Todos'), ...Object.entries(ESTADO).map(([k, v]) => h('option', { value: k, selected: S.filter === k }, v)));
  const list = rows.length
    ? h('ul', { class: 'rlist' }, rows.map((r) => h('li', {}, h('button', { class: 'ritem', 'aria-current': S.selected === r.id, onclick: () => select(r.id) },
        h('span', { class: 't' }, r.name, badge(r.estado_cuenta)),
        h('span', { class: 's' }, `/${r.slug} · ${PLAN[r.plan]}`)))))
    : h('p', { class: 'empty' }, S.list.length ? 'Ningún restaurante coincide con la búsqueda.' : 'Todavía no creaste restaurantes. Empezá con “Nuevo restaurante”.');
  return h('main', { class: 'layout' },
    h('section', { class: 'panel' },
      h('div', { class: 'list-tools' }, search, filter),
      h('button', { class: 'btn primary', style: false, onclick: openCreate }, 'Nuevo restaurante'),
      h('div', { class: 'section' }, list)),
    h('section', { class: 'panel', 'aria-live': 'polite' }, S.detail ? viewDetail() : h('p', { class: 'empty' }, 'Elegí un restaurante para ver su cuenta, plan y pagos.')));
}

function viewDetail() {
  const { restaurant: r, payments } = S.detail;
  const url = `${location.origin}/${r.slug}`;
  const planSel = h('select', { id: 'plansel', 'aria-label': 'Plan' }, ...Object.entries(PLAN).map(([k, v]) => h('option', { value: k, selected: r.plan === k }, v)));
  const act = async (fn, okMsg) => { try { await fn(); await loadList(); await select(r.id); toast(okMsg); } catch (e) { if (e.message !== 'sesión') toast(e.message); } };
  return h('div', {},
    h('div', { class: 'list-tools' }, h('h2', {}, r.name), badge(r.estado_cuenta)),
    h('dl', { class: 'kv' },
      h('dt', {}, 'Dirección'), h('dd', {}, url),
      h('dt', {}, 'Propietario'), h('dd', {}, r.owner_email || '—'),
      h('dt', {}, 'Plan'), h('dd', {}, PLAN[r.plan]),
      h('dt', {}, 'Vigencia'), h('dd', {}, r.suscripcion ? `${fdate(r.suscripcion.starts_on)} al ${fdate(r.suscripcion.expires_on)}` : 'Sin pagos registrados'),
      h('dt', {}, 'Creado'), h('dd', {}, fdate(r.created_at.slice(0, 10)))),
    h('div', { class: 'actions' },
      h('div', {}, planSel),
      h('button', { class: 'btn', onclick: () => act(() => api(`/admin/restaurants/${r.id}`, { method: 'PATCH', body: { plan: planSel.value } }), 'Plan actualizado') }, 'Cambiar plan'),
      r.status === 'activo'
        ? h('button', { class: 'btn danger', onclick: () => confirmDlg(`¿Suspender “${r.name}”?`, 'Su menú público y su panel dejarán de funcionar hasta que la reactives.', 'Suspender', () => act(() => api(`/admin/restaurants/${r.id}`, { method: 'PATCH', body: { status: 'suspendido' } }), 'Cuenta suspendida')) }, 'Suspender')
        : h('button', { class: 'btn', onclick: () => act(() => api(`/admin/restaurants/${r.id}`, { method: 'PATCH', body: { status: 'activo' } }), 'Cuenta reactivada') }, 'Reactivar')),
    h('p', { class: 'hint' }, 'Nota: el plan también se actualiza al registrar un pago. La dirección no se puede cambiar para no romper los QR impresos.'),
    h('div', { class: 'section' }, h('h3', {}, 'Acceso del propietario'),
      h('p', { class: 'muted' }, 'Generá un enlace de un solo uso y envialo vos al propietario. Si todavía no aceptó la invitación usá “Invitación”; si olvidó su contraseña usá “Recuperación”.'),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => showLink(r, 'invite') }, 'Invitación'),
        h('button', { class: 'btn', onclick: () => showLink(r, 'recovery') }, 'Recuperación'))),
    h('div', { class: 'section' }, h('h3', {}, 'Registrar pago'), paymentForm(r, act)),
    h('div', { class: 'section' }, h('h3', {}, 'Pagos registrados'),
      payments.length ? h('div', { class: 'scroll' }, h('table', {},
        h('thead', {}, h('tr', {}, ['Fecha', 'Monto', 'Método', 'Nota'].map((t) => h('th', {}, t)))),
        h('tbody', {}, payments.map((p) => h('tr', {}, h('td', {}, fdate(p.paid_on)), h('td', {}, money(p.amount_ars)), h('td', {}, METODO[p.method]), h('td', {}, p.note || '—'))))))
        : h('p', { class: 'muted' }, 'Todavía no registraste pagos para este restaurante.')));
}

function paymentForm(r, act) {
  const t = todayAR();
  const next = new Date(Date.now() - 3 * 3600e3 + 30 * 864e5).toISOString().slice(0, 10);
  const f = {
    plan: h('select', { id: 'pplan' }, ...Object.entries(PLAN).map(([k, v]) => h('option', { value: k, selected: r.plan === k }, v))),
    amount: h('input', { id: 'pamt', type: 'number', min: '0', step: '0.01', inputmode: 'decimal', required: true }),
    paid: h('input', { id: 'ppaid', type: 'date', value: t, required: true }),
    method: h('select', { id: 'pmeth' }, ...Object.entries(METODO).map(([k, v]) => h('option', { value: k }, v))),
    from: h('input', { id: 'pfrom', type: 'date', value: t, required: true }),
    to: h('input', { id: 'pto', type: 'date', value: next, required: true }),
    note: h('input', { id: 'pnote', maxlength: '300' }),
  };
  const err = h('div', { class: 'form-error hidden', role: 'alert' });
  const L = (id, text, el) => h('div', {}, h('label', { for: id }, text), el);
  return h('form', { onsubmit: async (ev) => {
    ev.preventDefault(); err.classList.add('hidden');
    try {
      await api(`/admin/restaurants/${r.id}/payments`, { method: 'POST', body: { plan: f.plan.value, amount_ars: f.amount.value, paid_on: f.paid.value, method: f.method.value, starts_on: f.from.value, expires_on: f.to.value, note: f.note.value } });
      await loadList(); await select(r.id); toast('Pago registrado');
    } catch (e) { if (e.message === 'sesión') return; err.textContent = e.details ? Object.values(e.details).join(' ') : e.message; err.classList.remove('hidden'); }
  } },
    h('div', { class: 'row' }, L('pplan', 'Plan contratado', f.plan), L('pamt', 'Monto cobrado (ARS)', f.amount)),
    h('div', { class: 'row' }, L('ppaid', 'Fecha del pago', f.paid), L('pmeth', 'Método', f.method)),
    h('div', { class: 'row' }, L('pfrom', 'Inicio del período', f.from), L('pto', 'Vencimiento', f.to)),
    L('pnote', 'Nota (opcional)', f.note), err,
    h('div', { class: 'actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Registrar pago')));
}

// ---------- diálogos ----------
function dialog(...kids) {
  const d = h('dialog', {}, ...kids);
  d.addEventListener('close', () => d.remove());
  document.body.append(d); d.showModal(); return d;
}
function confirmDlg(title, text, okLabel, onOk) {
  const d = dialog(h('h2', {}, title), h('p', {}, text),
    h('div', { class: 'actions' },
      h('button', { class: 'btn danger', onclick: () => { d.close(); onOk(); } }, okLabel),
      h('button', { class: 'btn', onclick: () => d.close(), autofocus: true }, 'Cancelar')));
}
async function showLink(r, type) {
  try {
    const { link, email } = await api(`/admin/restaurants/${r.id}/access-link`, { method: 'POST', body: { type } });
    const input = h('input', { readonly: true, value: link, 'aria-label': 'Enlace de acceso' });
    const d = dialog(h('h2', {}, type === 'invite' ? 'Enlace de invitación' : 'Enlace de recuperación'),
      h('p', {}, `Enviáselo a ${email} por un medio de confianza. Funciona una sola vez y vence en poco tiempo. No se guarda: si lo perdés, generá otro.`),
      h('div', { class: 'linkbox' }, input, h('button', { class: 'btn', onclick: async () => { await navigator.clipboard.writeText(link).catch(() => input.select()); toast('Enlace copiado'); } }, 'Copiar')),
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: () => d.close() }, 'Listo')));
    input.select();
  } catch (e) {
    if (e.message === 'sesión') return;
    toast(e.status === 409 ? 'Ese propietario ya tiene cuenta: usá “Recuperación”.' : e.message);
  }
}
function openCreate() {
  const f = {
    name: h('input', { id: 'cname', required: true, maxlength: '80' }),
    slug: h('input', { id: 'cslug', required: true, maxlength: '40', autocapitalize: 'none', spellcheck: 'false' }),
    email: h('input', { id: 'cmail', type: 'email', required: true }),
    plan: h('select', { id: 'cplan' }, ...Object.entries(PLAN).map(([k, v]) => h('option', { value: k }, v))),
  };
  f.name.addEventListener('input', () => { if (!f.slug.dataset.touched) f.slug.value = f.name.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); });
  f.slug.addEventListener('input', () => { f.slug.dataset.touched = '1'; });
  const err = h('div', { class: 'form-error hidden', role: 'alert' });
  const fieldErr = {};
  const L = (id, text, el, hint) => { const e = h('p', { class: 'field-error hidden' }); fieldErr[id] = e; return h('div', {}, h('label', { for: id }, text), el, hint && h('p', { class: 'hint' }, hint), e); };
  const btn = h('button', { class: 'btn primary', type: 'submit' }, 'Crear restaurante');
  const d = dialog(h('h2', {}, 'Nuevo restaurante'),
    h('form', { onsubmit: async (ev) => {
      ev.preventDefault(); btn.disabled = true; err.classList.add('hidden'); Object.values(fieldErr).forEach((e) => e.classList.add('hidden'));
      try {
        const out = await api('/admin/restaurants', { method: 'POST', body: { name: f.name.value, slug: f.slug.value, owner_email: f.email.value, plan: f.plan.value } });
        d.close(); await loadList(); await select(out.restaurant.id);
        const input = h('input', { readonly: true, value: out.invite_link, 'aria-label': 'Enlace de invitación' });
        const d2 = dialog(h('h2', {}, 'Restaurante creado'),
          h('p', {}, `Enviá este enlace a ${out.restaurant.owner_email} para que elija su contraseña. Funciona una sola vez y no se vuelve a mostrar.`),
          h('div', { class: 'linkbox' }, input, h('button', { class: 'btn', onclick: async () => { await navigator.clipboard.writeText(out.invite_link).catch(() => input.select()); toast('Enlace copiado'); } }, 'Copiar')),
          h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: () => d2.close() }, 'Listo')));
        input.select();
      } catch (e) {
        if (e.message === 'sesión') return;
        btn.disabled = false;
        const map = { name: 'cname', slug: 'cslug', owner_email: 'cmail', plan: 'cplan' };
        let shown = false;
        for (const [k, msg] of Object.entries(e.details || {})) if (map[k]) { fieldErr[map[k]].textContent = msg; fieldErr[map[k]].classList.remove('hidden'); shown = true; }
        if (!shown) { err.textContent = e.message; err.classList.remove('hidden'); }
      }
    } },
      L('cname', 'Nombre del negocio', f.name),
      L('cslug', 'Dirección del menú', f.slug, `${location.host}/${f.slug.value || 'nombre-del-local'} — no se puede cambiar después.`),
      L('cmail', 'Correo del propietario', f.email), L('cplan', 'Plan', f.plan), err,
      h('div', { class: 'actions' }, btn, h('button', { class: 'btn', type: 'button', onclick: () => d.close() }, 'Cancelar'))));
  f.name.focus();
}

// ---------- actividad ----------
const ACCION = { restaurante_creado: 'Restaurante creado', plan_cambiado: 'Plan cambiado', cuenta_suspendida: 'Cuenta suspendida', cuenta_reactivada: 'Cuenta reactivada', datos_editados: 'Datos editados', pago_registrado: 'Pago registrado', invitacion_generada: 'Invitación generada', recuperacion_generada: 'Recuperación generada' };
async function viewAudit() {
  const box = document.getElementById('audit');
  box.replaceChildren(h('h2', {}, 'Actividad administrativa'), h('p', { class: 'muted' }, 'Cargando…'));
  try {
    const { events } = await api('/admin/audit?limit=100');
    box.replaceChildren(h('h2', {}, 'Actividad administrativa'),
      events.length ? h('div', { class: 'scroll' }, h('table', {},
        h('thead', {}, h('tr', {}, ['Fecha', 'Acción', 'Restaurante'].map((t) => h('th', {}, t)))),
        h('tbody', {}, events.map((e) => h('tr', {}, h('td', {}, new Date(e.created_at).toLocaleString('es-AR')), h('td', {}, ACCION[e.action] || e.action), h('td', {}, e.restaurants?.name || '—'))))))
        : h('p', { class: 'empty' }, 'Todavía no hay actividad registrada.'));
  } catch (e) { if (e.message !== 'sesión') box.append(h('p', { class: 'form-error' }, e.message)); }
}

// ---------- inicio ----------
cfg = await fetch('/api/config').then((r) => r.json()).catch(() => ({}));
if (!cfg.supabaseUrl) {
  $app.replaceChildren(h('main', { class: 'center-card' }, h('h1', {}, 'Falta configurar el servidor'),
    h('p', {}, cfg.missing ? `En Cloudflare faltan estas variables: ${cfg.missing.join(', ')}. Cargalas en Settings → Variables and secrets (en Production) y volvé a desplegar.` : 'No se pudo leer la configuración del servidor. Revisá que las variables estén cargadas en Cloudflare y que hayas vuelto a desplegar después.')));
} else {
  session ? boot() : renderLogin();
}
