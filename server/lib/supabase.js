// Cliente mínimo de Supabase sin dependencias (PostgREST + GoTrue por fetch).
// La clave service_role SOLO se usa aquí, en el servidor.
import { HttpError } from './http.js';

export function createDb(env, fetchImpl = fetch) {
  const base = env.SUPABASE_URL?.replace(/\/$/, '');
  if (!base || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_ANON_KEY) {
    throw new HttpError(500, 'El servidor no está configurado correctamente.');
  }
  const svc = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'content-type': 'application/json',
  };

  async function call(url, init) {
    let res;
    try {
      res = await fetchImpl(url, init);
    } catch {
      throw new HttpError(502, 'No se pudo conectar con la base de datos.');
    }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    return { res, data };
  }

  function dbError(res, data) {
    const code = data?.code;
    if (code === '23505') return new HttpError(409, 'Ya existe un registro con ese valor.');
    if (code === '23514' || code === '23502') return new HttpError(400, 'Los datos no cumplen las reglas de validación.');
    if (code === 'P0001') return new HttpError(400, data.message);
    if (code === 'P0002') return new HttpError(404, 'No se encontró el registro.');
    console.error('Error de base de datos:', res.status, code);
    return new HttpError(500, 'Error al acceder a los datos.');
  }

  return {
    // query: objeto {col: 'eq.valor', select: '...', order: '...'}
    async rest(table, { method = 'GET', query = {}, body, returning = false } = {}) {
      const qs = new URLSearchParams(query).toString();
      const headers = { ...svc };
      if (returning) headers.prefer = 'return=representation';
      const { res, data } = await call(`${base}/rest/v1/${table}${qs ? `?${qs}` : ''}`, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) throw dbError(res, data);
      return data;
    },

    async rpc(fn, args) {
      const { res, data } = await call(`${base}/rest/v1/rpc/${fn}`, {
        method: 'POST', headers: svc, body: JSON.stringify(args),
      });
      if (!res.ok) throw dbError(res, data);
      return data;
    },

    // Valida un token de sesión contra Supabase Auth.
    async getUser(accessToken) {
      const { res, data } = await call(`${base}/auth/v1/user`, {
        headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${accessToken}` },
      });
      return res.ok && data?.id ? data : null;
    },

    // type: 'invite' | 'recovery'. Devuelve el enlace seguro de un solo uso.
    async generateLink(type, email, redirectTo) {
      const { res, data } = await call(`${base}/auth/v1/admin/generate_link`, {
        method: 'POST', headers: svc,
        body: JSON.stringify({ type, email, redirect_to: redirectTo }),
      });
      if (!res.ok) {
        const msg = data?.msg || data?.message || '';
        if (/already.*registered|exists/i.test(msg)) throw new HttpError(409, 'Ese correo ya tiene una cuenta.');
        console.error('Error al generar enlace:', res.status);
        throw new HttpError(502, 'No se pudo generar el enlace de acceso.');
      }
      return { link: data.action_link, userId: data.id ?? data.user?.id };
    },

    async deleteUser(userId) {
      await call(`${base}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: svc });
    },
  };
}
