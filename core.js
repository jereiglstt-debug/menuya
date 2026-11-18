// Utilidades compartidas por el panel del propietario y el menú público.
// Todo el contenido dinámico se inserta con textContent (nunca innerHTML).
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}
export const money = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: Number.isInteger(+n) ? 0 : 2 }).format(n);

export function toast(msg) {
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t); setTimeout(() => t.remove(), 4000);
}

// Sesión contra Supabase Auth (GoTrue por REST). Se guarda solo en sessionStorage.
export function createSession(cfg, key, onExpire) {
  let s = JSON.parse(sessionStorage.getItem(key) || 'null');
  const save = (v) => { s = v; v ? sessionStorage.setItem(key, JSON.stringify(v)) : sessionStorage.removeItem(key); };
  async function token(grant, body) {
    const res = await fetch(`${cfg.supabaseUrl}/auth/v1/token?grant_type=${grant}`, {
      method: 'POST', headers: { apikey: cfg.supabaseAnonKey, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = d.error_code || ''; const text = `${d.msg || d.message || ''}`;
      let error = 'Correo o contraseña incorrectos.';
      if (res.status === 429) error = 'Demasiados intentos. Esperá unos minutos.';
      else if (code === 'email_not_confirmed') error = 'Tu usuario todavía no está confirmado. Pedile ayuda al administrador.';
      else if (res.status === 404 || res.status === 405) error = 'No se pudo conectar con el servicio de ingreso (revisá la configuración del servidor).';
      else if (res.status === 401 || res.status === 403 || /api key/i.test(text)) error = 'La clave pública configurada no es válida.';
      else if (res.status >= 500) error = 'El servicio de ingreso no responde. Probá de nuevo en unos minutos.';
      return { error };
    }
    save({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in - 30) * 1000 });
    return {};
  }
  async function api(path, { method = 'GET', body, raw, type } = {}) {
    if (s && Date.now() > s.expires_at) {
      const r = await token('refresh_token', { refresh_token: s.refresh_token });
      if (r.error) { save(null); onExpire('Tu sesión venció. Volvé a ingresar.'); throw new Error('sesión'); }
    }
    const headers = { authorization: `Bearer ${s?.access_token}` };
    let b;
    if (raw) { headers['content-type'] = type; b = raw; } else if (body !== undefined) { headers['content-type'] = 'application/json'; b = JSON.stringify(body); }
    const res = await fetch(`/api${path}`, { method, headers, body: b });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { save(null); onExpire('Tu sesión venció. Volvé a ingresar.'); throw new Error('sesión'); }
    if (!res.ok) throw Object.assign(new Error(data.error || 'Error inesperado'), { details: data.details, status: res.status });
    return data;
  }
  return { api, login: (email, password) => token('password', { email, password }), logout: () => save(null), has: () => !!s };
}
