// Mundo simulado: PostgREST + Storage + Auth en memoria. Las funciones SQL
// (publish_menu, reorder_*) están reimplementadas en JS para probar el FLUJO
// del servidor; el SQL real solo se puede verificar contra Postgres.
import { handle } from '../server/router.js';

export const ENV = { SUPABASE_URL: 'https://fake.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x', SITE_URL: 'https://menuya.pages.dev' };
export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6]);
export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);

export function makeWorld() {
  const t = { restaurants: [], restaurant_owners: [], platform_admins: [], categories: [], products: [], menu_settings: [], menu_versions: [], pending_image_deletes: [], audit_log: [], promotions: [],
    restaurant_ordering: [], restaurant_payment_settings: [], restaurant_tables: [], orders: [], order_items: [], order_status_history: [] };
  const storage = new Map(); const users = {}; let tick = 0;
  const now = () => new Date(Date.UTC(2026, 9, 28, 12, 0, tick++)).toISOString();
  const reply = (d, s = 200) => new Response(d === undefined ? null : JSON.stringify(d), { status: s });
  const touch = (rid) => { const r = t.restaurants.find((x) => x.id === rid); if (r) r.draft_changed_at = now(); };

  function addUser(name) { users[name] = { id: `u-${name}`, email: `${name}@x.com` }; return `aaa.${name}.zzz`; }
  function addRestaurant(slug, owner, { plan = 'basico', status = 'activo' } = {}) {
    const r = { id: crypto.randomUUID(), slug, name: `Local ${slug}`, description: '', plan, status, draft_changed_at: null };
    t.restaurants.push(r);
    if (owner) t.restaurant_owners.push({ restaurant_id: r.id, user_id: users[owner].id, email: users[owner].email });
    return r;
  }
  const match = (row, u) => { for (const [k, v] of u.searchParams) { if (['select', 'order', 'limit'].includes(k)) continue; if (v.startsWith('eq.') && String(row[k]) !== v.slice(3)) return false; if (v.startsWith('in.(') && !v.slice(4, -1).split(',').includes(String(row[k]))) return false; if (v.startsWith('gte.') && !(String(row[k]) >= v.slice(4))) return false; } return true; };
  const sorted = (rows, order) => { if (!order) return rows; const [col, dir] = order.split(',')[0].split('.'); return [...rows].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === 'desc' ? -1 : 1)); };

  function rpc(fn, a) {
    if (fn === 'reorder_categories' || fn === 'reorder_products') {
      const rows = fn === 'reorder_categories' ? t.categories.filter((c) => c.restaurant_id === a.p_restaurant)
        : t.products.filter((p) => p.restaurant_id === a.p_restaurant && p.category_id === a.p_category);
      const ok = a.p_ids.length === rows.length && a.p_ids.every((id) => rows.some((r) => r.id === id));
      if (!ok) return reply({ code: 'P0001', message: 'La lista no coincide con la actual.' }, 400);
      a.p_ids.forEach((id, i) => { rows.find((r) => r.id === id).position = i + 1; });
      touch(a.p_restaurant); return reply(undefined, 204);
    }
    if (fn === 'publish_menu') {
      const r = t.restaurants.find((x) => x.id === a.p_restaurant);
      const prods = t.products.filter((p) => p.restaurant_id === r.id);
      if (!prods.length) return reply({ code: 'P0001', message: 'Agregá al menos un producto antes de publicar.' }, 400);
      const s = t.menu_settings.find((x) => x.restaurant_id === r.id);
      const snapshot = {
        title: s?.title || r.name, description: s?.description || r.description, logo_path: s?.logo_path ?? null, cover_path: s?.cover_path ?? null, design: s?.design ?? {}, whatsapp: s?.whatsapp ?? null,
        promotions: t.promotions.filter((x) => x.restaurant_id === r.id && x.active).map(({ title, description }) => ({ title, description })),
        categories: sorted(t.categories.filter((c) => c.restaurant_id === r.id), 'position.asc')
          .filter((c) => prods.some((p) => p.category_id === c.id))
          .map((c) => ({ id: c.id, name: c.name, products: sorted(prods.filter((p) => p.category_id === c.id), 'position.asc').map(({ id, name, description, price_ars, image_path, available, featured }) => ({ id, name, description, price_ars, image_path, available, featured: !!featured })) })),
      };
      const version = Math.max(0, ...t.menu_versions.filter((v) => v.restaurant_id === r.id).map((v) => v.version)) + 1;
      t.menu_versions.push({ restaurant_id: r.id, version, snapshot, published_at: now() });
      return reply(version);
    }
    if (fn === 'create_order') {
      const r = t.restaurants.find((x) => x.id === a.p_restaurant);
      if (!r) return reply({ code: 'P0002' }, 404);
      let label = null;
      if (a.p_table) { const tb = t.restaurant_tables.find((x) => x.id === a.p_table && x.restaurant_id === r.id && x.active); if (!tb) return reply({ code: 'P0002' }, 404); label = tb.label; }
      if (!Array.isArray(a.p_items) || a.p_items.length < 1 || a.p_items.length > 40) return reply({ code: 'P0001', message: 'Pedido inválido' }, 400);
      if (t.orders.some((o) => o.tracking_token === a.p_token)) return reply({ code: '23505' }, 409);
      const subtotal = a.p_items.reduce((x, i) => x + i.price * i.qty, 0);
      const fee = a.p_type === 'delivery' ? (a.p_fee || 0) : 0;
      const number = Math.max(0, ...t.orders.filter((o) => o.restaurant_id === r.id).map((o) => o.number)) + 1;
      const o = { id: crypto.randomUUID(), restaurant_id: r.id, number, tracking_token: a.p_token, type: a.p_type, status: 'nuevo', table_id: a.p_table ?? null, table_label: label,
        customer_name: a.p_name || '', customer_phone: a.p_phone || '', address: a.p_address || '', note: a.p_note || '', payment_method: a.p_payment ?? null, payment_combo: a.p_combo ?? null,
        subtotal, delivery_fee: fee, total: subtotal + fee, created_at: now() };
      t.orders.push(o);
      a.p_items.forEach((i) => t.order_items.push({ order_id: o.id, restaurant_id: r.id, product_id: i.product_id, name: i.name, unit_price: i.price, qty: i.qty, created_at: now() }));
      t.order_status_history.push({ order_id: o.id, restaurant_id: r.id, status: 'nuevo', created_at: now() });
      return reply({ id: o.id, number });
    }
    if (fn === 'set_order_status') {
      const o = t.orders.find((x) => x.id === a.p_order && x.restaurant_id === a.p_restaurant);
      if (!o) return reply({ code: 'P0002' }, 404);
      const ok = { nuevo: ['en_preparacion', 'cancelado'], en_preparacion: ['listo', 'cancelado'], listo: ['entregado', 'cancelado'] }[o.status]?.includes(a.p_to);
      if (!ok) return reply({ code: 'P0001', message: 'No se puede cambiar el estado.' }, 400);
      o.status = a.p_to; t.order_status_history.push({ order_id: o.id, restaurant_id: o.restaurant_id, status: a.p_to, changed_by: a.p_actor, created_at: now() });
      return reply(undefined, 204);
    }
    return reply({ message: 'rpc?' }, 404);
  }

  async function fetchImpl(url, init = {}) {
    const u = new URL(url); const method = init.method || 'GET'; const p = u.pathname;
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    if (p === '/auth/v1/user') { const n = (init.headers.authorization || '').split('.')[1]; return users[n] ? reply(users[n]) : reply({}, 401); }
    if (p.startsWith('/rest/v1/rpc/')) return rpc(p.split('/').pop(), body);
    if (p === '/storage/v1/object/copy') { const ok = storage.has(body.sourceKey); if (ok) storage.set(body.destinationKey, storage.get(body.sourceKey)); return reply({}, ok ? 200 : 404); }
    if (p === '/storage/v1/object/menu-images' && method === 'DELETE') { body.prefixes.forEach((x) => storage.delete(x)); return reply([]); }
    if (p.startsWith('/storage/v1/object/menu-images/') && method === 'POST') { const k = p.replace('/storage/v1/object/menu-images/', ''); if (storage.has(k)) return reply({}, 409); storage.set(k, body.length); return reply({ Key: k }); }
    const m = p.match(/^\/rest\/v1\/(\w+)$/); if (!m || !t[m[1]]) return reply({ message: 'sin ruta' }, 404);
    const tbl = m[1]; const rows = t[tbl]; const wantRows = /representation/.test(init.headers?.prefer || '');
    if (method === 'GET') { let r = sorted(rows.filter((x) => match(x, u)), u.searchParams.get('order')); if (u.searchParams.get('limit')) r = r.slice(0, +u.searchParams.get('limit')); return reply(r.map((x) => ({ ...x }))); }
    if (method === 'POST') {
      const row = { id: crypto.randomUUID(), created_at: now(), ...(tbl === 'products' ? { featured: false } : {}), ...(tbl === 'restaurant_tables' ? { active: true } : {}), ...(tbl === 'restaurant_ordering' ? { state: 'cerrado', accept_mesa: true, accept_take_away: true, accept_delivery: false, delivery_fee: 0 } : {}), ...body };
      if (tbl === 'pending_image_deletes' && rows.some((x) => x.path === body.path)) return reply({ code: '23505' }, 409);
      if (tbl === 'products' && !t.categories.some((c) => c.id === body.category_id && c.restaurant_id === body.restaurant_id)) return reply({ code: '23503' }, 409);
      rows.push(row); if (['categories', 'products', 'menu_settings', 'promotions'].includes(tbl)) touch(body.restaurant_id);
      return reply(wantRows ? [row] : undefined, 201);
    }
    if (method === 'PATCH') { const hit = rows.filter((x) => match(x, u)); hit.forEach((x) => { Object.assign(x, body); if (x.restaurant_id && tbl !== 'restaurants') touch(x.restaurant_id); }); return wantRows ? reply(hit.map((x) => ({ ...x }))) : reply(undefined, 204); }
    if (method === 'DELETE') {
      const hit = rows.filter((x) => match(x, u)); t[tbl] = rows.filter((x) => !hit.includes(x));
      if (tbl === 'categories') t.products = t.products.filter((pr) => !hit.some((c) => c.id === pr.category_id));
      hit.forEach((x) => x.restaurant_id && touch(x.restaurant_id));
      return wantRows ? reply(hit) : reply(undefined, 204);
    }
    return reply({}, 405);
  }

  async function call(token, method, path, body, { raw, type } = {}) {
    const headers = {}; if (token) headers.authorization = `Bearer ${token}`;
    let b;
    if (raw) { headers['content-type'] = type; b = raw; } else if (body !== undefined) { headers['content-type'] = 'application/json'; b = JSON.stringify(body); }
    const res = await handle(new Request(`https://menuya.pages.dev/api${path}`, { method, headers, body: b }), ENV, fetchImpl);
    return { status: res.status, body: await res.json().catch(() => null) };
  }
  return { t, storage, addUser, addRestaurant, call };
}
