// Supabase simulado en memoria: suficiente para ejercitar el router real.
import { handle } from '../server/router.js';

export const ENV = {
  SUPABASE_URL: 'https://fake.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  SITE_URL: 'https://menuya.pages.dev',
};
const jwt = (u) => `aaa.${u}.zzz`;
export const ADMIN_TOKEN = jwt('admin');
export const OWNER_TOKEN = jwt('owner');

export function makeFake({ failInvite = false } = {}) {
  const state = {
    restaurants: [], owners: [], audit: [], deletedUsers: [],
    admins: ['u-admin'], rpcCalls: [],
  };
  const users = { admin: { id: 'u-admin', email: 'yo@x.com' }, owner: { id: 'u-owner', email: 'd@x.com' } };
  let n = 0;
  const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
  const reply = (data, status = 200) => new Response(data === null ? '' : JSON.stringify(data), { status });

  async function fetchImpl(url, init = {}) {
    const u = new URL(url);
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    const p = u.pathname;

    if (p === '/auth/v1/user') {
      const t = (init.headers.authorization || '').split('.')[1];
      return users[t] ? reply(users[t]) : reply({ msg: 'bad' }, 401);
    }
    if (p === '/auth/v1/admin/generate_link') {
      if (failInvite) return reply({ msg: 'boom' }, 500);
      if (state.owners.some((o) => o.email === body.email) && body.type === 'invite') return reply({ msg: 'already registered' }, 422);
      return reply({ action_link: `https://fake.supabase.co/verify?token=SECRET&type=${body.type}`, id: uuid() });
    }
    if (p.startsWith('/auth/v1/admin/users/') && method === 'DELETE') {
      state.deletedUsers.push(p.split('/').pop()); return reply(null, 200);
    }
    if (p === '/rest/v1/platform_admins') {
      const id = (u.searchParams.get('user_id') || '').replace('eq.', '');
      return reply(state.admins.includes(id) ? [{ user_id: id }] : []);
    }
    if (p === '/rest/v1/restaurants') {
      if (method === 'POST') {
        if (state.restaurants.some((r) => r.slug === body.slug)) return reply({ code: '23505' }, 409);
        const r = { id: uuid(), description: '', status: 'activo', created_at: new Date().toISOString(), ...body };
        state.restaurants.push(r); return reply([r], 201);
      }
      const id = (u.searchParams.get('id') || '').replace('eq.', '');
      if (method === 'DELETE') { state.restaurants = state.restaurants.filter((r) => r.id !== id); state.owners = state.owners.filter((o) => o.restaurant_id !== id); return reply(null, 204); }
      if (method === 'PATCH') { const r = state.restaurants.find((x) => x.id === id); Object.assign(r, body); return reply([r]); }
      const list = id ? state.restaurants.filter((r) => r.id === id) : state.restaurants;
      return reply(list.map((r) => ({ ...r, subscriptions: r.subscriptions || [], restaurant_owners: state.owners.filter((o) => o.restaurant_id === r.id) })));
    }
    if (p === '/rest/v1/restaurant_owners' && method === 'POST') { state.owners.push(body); return reply(null, 201); }
    if (p === '/rest/v1/audit_log' && method === 'POST') { state.audit.push(body); return reply(null, 201); }
    if (p === '/rest/v1/rpc/admin_register_payment') { state.rpcCalls.push(body); return reply(uuid()); }
    return reply({ msg: `sin ruta ${method} ${p}` }, 404);
  }

  const call = (method, path, { token, body } = {}) => handle(new Request(`https://menuya.pages.dev/api${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }), ENV, fetchImpl);
  return { state, call };
}
