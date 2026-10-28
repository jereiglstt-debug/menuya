// Endpoints del propietario. Regla de oro: toda consulta lleva
// restaurant_id = el restaurante de la SESIÓN. Un id ajeno simplemente
// "no existe" para quien lo pide (404), nunca se lee ni se modifica.
import { HttpError, readJson, json } from '../lib/http.js';
import { requireOwner } from '../lib/auth.js';
import { requireFeature, designPermissions, featuresFor } from '../lib/plans.js';
import { validateDesign, sanitizeDesign } from '../../public/shared/design.js';
import { publicShape } from '../lib/publicShape.js';

const MAX_PROMOS = 10;
import { readImage, newImagePath } from '../lib/images.js';
import {
  isUuid, validateCategoryInput, validateProductInput, validateSettingsInput, validateIdList, validatePromotionInput,
} from '../lib/validate.js';

const PROMO_SELECT = 'id,title,description,active';
const PROD_SELECT = 'id,category_id,name,description,price_ars,image_path,available,featured,position';

async function ctx(request, db) {
  const c = await requireOwner(request, db);
  requireFeature(c.restaurant, 'catalogo');
  return c;
}
const own = (rid, id) => ({ id: `eq.${id}`, restaurant_id: `eq.${rid}` });
function needId(id) { if (!isUuid(id)) throw new HttpError(400, 'Identificador inválido.'); }
const notFound = (what) => new HttpError(404, `${what} no encontrad${what.endsWith('a') ? 'a' : 'o'}.`);

async function nextPosition(db, table, filter) {
  const rows = await db.rest(table, { query: { select: 'position', ...filter, order: 'position.desc', limit: '1' } });
  return (rows[0]?.position ?? 0) + 1;
}
async function queueImage(db, rid, path) {
  if (!path) return;
  try { await db.rest('pending_image_deletes', { method: 'POST', body: { path, restaurant_id: rid } }); }
  catch (e) { if (e.status !== 409) throw e; }
}
async function ensureSettings(db, r) {
  const rows = await db.rest('menu_settings', { query: { select: 'title,description,logo_path,cover_path,design,whatsapp', restaurant_id: `eq.${r.id}` } });
  if (rows.length) return rows[0];
  const [row] = await db.rest('menu_settings', { method: 'POST', returning: true, body: { restaurant_id: r.id, title: r.name, description: r.description ?? '' } });
  return row;
}
const hasCover = (r) => designPermissions(r.plan).advanced;
const withUrl = (db, p) => ({ ...p, image_url: db.publicUrl(p.image_path) });

// ---------------- lectura ----------------
export async function getMenu({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const settings = await ensureSettings(db, r);
  const [cats, prods, versions, promos] = await Promise.all([
    db.rest('categories', { query: { select: 'id,name,position', restaurant_id: `eq.${r.id}`, order: 'position.asc,created_at.asc' } }),
    db.rest('products', { query: { select: PROD_SELECT, restaurant_id: `eq.${r.id}`, order: 'position.asc,created_at.asc' } }),
    db.rest('menu_versions', { query: { select: 'version,published_at', restaurant_id: `eq.${r.id}`, order: 'version.desc', limit: '1' } }),
    db.rest('promotions', { query: { select: PROMO_SELECT, restaurant_id: `eq.${r.id}`, order: 'created_at.asc' } }),
  ]);
  const last = versions[0] ?? null;
  const unpublished = last
    ? !!r.draft_changed_at && new Date(r.draft_changed_at) > new Date(last.published_at)
    : cats.length > 0 || prods.length > 0;
  return json({
    restaurant: { name: r.name, slug: r.slug, plan: r.plan },
    settings: { title: settings.title, description: settings.description, logo_url: db.publicUrl(settings.logo_path), whatsapp: settings.whatsapp ?? null },
    promotions: promos,
    design: sanitizeDesign(settings.design, designPermissions(r.plan)),
    cover_url: hasCover(r) ? db.publicUrl(settings.cover_path) : null,
    capabilities: { design: designPermissions(r.plan), features: featuresFor(r.plan) },
    categories: cats.map((c) => ({ ...c, products: prods.filter((p) => p.category_id === c.id).map((p) => withUrl(db, p)) })),
    status: { version: last?.version ?? null, last_published_at: last?.published_at ?? null, unpublished_changes: unpublished },
  });
}

// ---------------- categorías ----------------
export async function createCategory({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const v = validateCategoryInput(await readJson(request));
  if (!v.ok) throw new HttpError(400, 'Revisá los datos.', v.errors);
  const position = await nextPosition(db, 'categories', { restaurant_id: `eq.${r.id}` });
  const [category] = await db.rest('categories', { method: 'POST', returning: true, body: { restaurant_id: r.id, ...v.value, position } });
  return json({ category: { ...category, products: [] } }, 201);
}

export async function updateCategory({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db); needId(params.id);
  const v = validateCategoryInput(await readJson(request));
  if (!v.ok) throw new HttpError(400, 'Revisá los datos.', v.errors);
  const rows = await db.rest('categories', { method: 'PATCH', query: own(r.id, params.id), body: v.value, returning: true });
  if (!rows.length) throw notFound('Categoría');
  return json({ category: rows[0] });
}

export async function deleteCategory({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db); needId(params.id);
  const prods = await db.rest('products', { query: { select: 'image_path', category_id: `eq.${params.id}`, restaurant_id: `eq.${r.id}` } });
  const rows = await db.rest('categories', { method: 'DELETE', query: own(r.id, params.id), returning: true });
  if (!rows.length) throw notFound('Categoría');
  for (const p of prods) await queueImage(db, r.id, p.image_path);
  return json({ ok: true });
}

export async function reorderCategories({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const { ids } = await readJson(request);
  if (!validateIdList(ids)) throw new HttpError(400, 'Lista de categorías inválida.');
  await db.rpc('reorder_categories', { p_restaurant: r.id, p_ids: ids });
  return json({ ok: true });
}

// ---------------- productos ----------------
async function assertCategory(db, rid, categoryId) {
  const rows = await db.rest('categories', { query: { select: 'id', ...own(rid, categoryId) } });
  if (!rows.length) throw notFound('Categoría');
}
async function getProduct(db, rid, id) {
  needId(id);
  const rows = await db.rest('products', { query: { select: PROD_SELECT, ...own(rid, id) } });
  if (!rows.length) throw notFound('Producto');
  return rows[0];
}

export async function createProduct({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const v = validateProductInput(await readJson(request));
  if (!v.ok) throw new HttpError(400, 'Revisá los datos.', v.errors);
  if (v.value.featured) requireFeature(r, 'destacados');
  await assertCategory(db, r.id, v.value.category_id);
  const position = await nextPosition(db, 'products', { category_id: `eq.${v.value.category_id}`, restaurant_id: `eq.${r.id}` });
  const [product] = await db.rest('products', { method: 'POST', returning: true, body: { restaurant_id: r.id, available: true, featured: false, description: '', ...v.value, position } });
  return json({ product: withUrl(db, product) }, 201);
}

export async function updateProduct({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db);
  const before = await getProduct(db, r.id, params.id);
  const v = validateProductInput(await readJson(request), { partial: true });
  if (!v.ok) throw new HttpError(400, 'Revisá los datos.', v.errors);
  if (!Object.keys(v.value).length) throw new HttpError(400, 'No hay cambios para guardar.');
  if (v.value.featured === true) requireFeature(r, 'destacados'); // quitar un destacado siempre se puede
  const changes = { ...v.value };
  if (changes.category_id && changes.category_id !== before.category_id) {
    await assertCategory(db, r.id, changes.category_id);
    changes.position = await nextPosition(db, 'products', { category_id: `eq.${changes.category_id}`, restaurant_id: `eq.${r.id}` });
  }
  const rows = await db.rest('products', { method: 'PATCH', query: own(r.id, params.id), body: changes, returning: true });
  return json({ product: withUrl(db, rows[0]) });
}

export async function deleteProduct({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db);
  const p = await getProduct(db, r.id, params.id);
  await db.rest('products', { method: 'DELETE', query: own(r.id, params.id) });
  await queueImage(db, r.id, p.image_path);
  return json({ ok: true });
}

export async function duplicateProduct({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db);
  const p = await getProduct(db, r.id, params.id);
  let image_path = null;
  if (p.image_path) {
    const to = newImagePath(r.id, p.image_path.split('.').pop());
    if (await db.storageCopy(p.image_path, to)) image_path = to; // copia propia: borrar una no afecta a la otra
  }
  const position = await nextPosition(db, 'products', { category_id: `eq.${p.category_id}`, restaurant_id: `eq.${r.id}` });
  const [copy] = await db.rest('products', { method: 'POST', returning: true, body: {
    restaurant_id: r.id, category_id: p.category_id, name: `${p.name} (copia)`.slice(0, 80),
    description: p.description, price_ars: p.price_ars, available: p.available, featured: p.featured, image_path, position,
  } });
  return json({ product: withUrl(db, copy) }, 201);
}

export async function reorderProducts({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const { category_id, ids } = await readJson(request);
  if (!isUuid(category_id) || !validateIdList(ids)) throw new HttpError(400, 'Lista de productos inválida.');
  await assertCategory(db, r.id, category_id);
  await db.rpc('reorder_products', { p_restaurant: r.id, p_category: category_id, p_ids: ids });
  return json({ ok: true });
}

// ---------------- imágenes ----------------
export async function uploadProductImage({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db);
  const p = await getProduct(db, r.id, params.id);
  const img = await readImage(request);
  const path = newImagePath(r.id, img.ext);
  await db.storageUpload(path, img.bytes, img.type);
  try {
    const rows = await db.rest('products', { method: 'PATCH', query: own(r.id, p.id), body: { image_path: path }, returning: true });
    await queueImage(db, r.id, p.image_path);
    return json({ product: withUrl(db, rows[0]) });
  } catch (e) { await db.storageDelete([path]).catch(() => {}); throw e; }
}

export async function deleteProductImage({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db);
  const p = await getProduct(db, r.id, params.id);
  await db.rest('products', { method: 'PATCH', query: own(r.id, p.id), body: { image_path: null } });
  await queueImage(db, r.id, p.image_path);
  return json({ ok: true });
}

export async function uploadLogo({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const s = await ensureSettings(db, r);
  const img = await readImage(request);
  const path = newImagePath(r.id, img.ext);
  await db.storageUpload(path, img.bytes, img.type);
  try {
    await db.rest('menu_settings', { method: 'PATCH', query: { restaurant_id: `eq.${r.id}` }, body: { logo_path: path } });
    await queueImage(db, r.id, s.logo_path);
    return json({ logo_url: db.publicUrl(path) });
  } catch (e) { await db.storageDelete([path]).catch(() => {}); throw e; }
}

export async function deleteLogo({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const s = await ensureSettings(db, r);
  await db.rest('menu_settings', { method: 'PATCH', query: { restaurant_id: `eq.${r.id}` }, body: { logo_path: null } });
  await queueImage(db, r.id, s.logo_path);
  return json({ ok: true });
}

export async function updateSettings({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  await ensureSettings(db, r);
  const v = validateSettingsInput(await readJson(request));
  if (!v.ok) throw new HttpError(400, 'Revisá los datos.', v.errors);
  if (!Object.keys(v.value).length) throw new HttpError(400, 'No hay cambios para guardar.');
  if (v.value.whatsapp !== undefined) requireFeature(r, 'whatsapp_mensaje');
  await db.rest('menu_settings', { method: 'PATCH', query: { restaurant_id: `eq.${r.id}` }, body: v.value });
  return json({ ok: true });
}

// ---------------- diseño y portada ----------------
export async function updateDesign({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  await ensureSettings(db, r);
  const v = validateDesign(await readJson(request), designPermissions(r.plan));
  if (v.forbidden.length) throw new HttpError(403, 'Tu plan actual no incluye esta función.', { forbidden: v.forbidden });
  if (!v.ok) throw new HttpError(400, 'Revisá los datos.', v.errors);
  await db.rest('menu_settings', { method: 'PATCH', query: { restaurant_id: `eq.${r.id}` }, body: { design: v.value } });
  return json({ design: sanitizeDesign(v.value, designPermissions(r.plan)) });
}

export async function uploadCover({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  requireFeature(r, 'personalizacion_avanzada');
  const s = await ensureSettings(db, r);
  const img = await readImage(request);
  const path = newImagePath(r.id, img.ext);
  await db.storageUpload(path, img.bytes, img.type);
  try {
    await db.rest('menu_settings', { method: 'PATCH', query: { restaurant_id: `eq.${r.id}` }, body: { cover_path: path } });
    await queueImage(db, r.id, s.cover_path);
    return json({ cover_url: db.publicUrl(path) });
  } catch (e) { await db.storageDelete([path]).catch(() => {}); throw e; }
}

export async function deleteCover({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const s = await ensureSettings(db, r);
  await db.rest('menu_settings', { method: 'PATCH', query: { restaurant_id: `eq.${r.id}` }, body: { cover_path: null } });
  await queueImage(db, r.id, s.cover_path);
  return json({ ok: true });
}

// ---------------- promociones (Profesional+) ----------------
export async function createPromotion({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  requireFeature(r, 'promociones');
  const v = validatePromotionInput(await readJson(request));
  if (!v.ok) throw new HttpError(400, 'Revisá los datos.', v.errors);
  const existing = await db.rest('promotions', { query: { select: 'id', restaurant_id: `eq.${r.id}` } });
  if (existing.length >= MAX_PROMOS) throw new HttpError(400, `Podés tener hasta ${MAX_PROMOS} promociones. Borrá alguna para crear otra.`);
  const [promotion] = await db.rest('promotions', { method: 'POST', returning: true, body: { restaurant_id: r.id, description: '', active: true, ...v.value } });
  return json({ promotion: { id: promotion.id, title: promotion.title, description: promotion.description, active: promotion.active } }, 201);
}
export async function updatePromotion({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db); needId(params.id);
  requireFeature(r, 'promociones');
  const v = validatePromotionInput(await readJson(request), { partial: true });
  if (!v.ok) throw new HttpError(400, 'Revisá los datos.', v.errors);
  if (!Object.keys(v.value).length) throw new HttpError(400, 'No hay cambios para guardar.');
  const rows = await db.rest('promotions', { method: 'PATCH', query: own(r.id, params.id), body: v.value, returning: true });
  if (!rows.length) throw notFound('Promoción');
  return json({ promotion: { id: rows[0].id, title: rows[0].title, description: rows[0].description, active: rows[0].active } });
}
export async function deletePromotion({ request, db, params }) {
  const { restaurant: r } = await ctx(request, db); needId(params.id);
  const rows = await db.rest('promotions', { method: 'DELETE', query: own(r.id, params.id), returning: true });
  if (!rows.length) throw notFound('Promoción');
  return json({ ok: true });
}

// ---------------- vista previa y publicación ----------------
// Misma forma que el menú público, pero armada desde el BORRADOR.
export async function preview({ request, db }) {
  const { restaurant: r } = await ctx(request, db);
  const s = await ensureSettings(db, r);
  const [cats, prods, promos] = await Promise.all([
    db.rest('categories', { query: { select: 'id,name', restaurant_id: `eq.${r.id}`, order: 'position.asc,created_at.asc' } }),
    db.rest('products', { query: { select: PROD_SELECT, restaurant_id: `eq.${r.id}`, order: 'position.asc,created_at.asc' } }),
    db.rest('promotions', { query: { select: PROMO_SELECT, restaurant_id: `eq.${r.id}`, order: 'created_at.asc' } }),
  ]);
  return json(publicShape({
    title: s.title || r.name, description: s.description || r.description || '', logo_path: s.logo_path, cover_path: s.cover_path,
    design: s.design, whatsapp: s.whatsapp, promotions: promos.filter((p) => p.active),
    categories: cats.map((c) => ({ name: c.name, products: prods.filter((p) => p.category_id === c.id) })),
  }, r.plan, db));
}

async function cleanupImages(db, rid) {
  const pending = await db.rest('pending_image_deletes', { query: { select: 'path', restaurant_id: `eq.${rid}` } });
  if (!pending.length) return;
  const refs = new Set();
  (await db.rest('products', { query: { select: 'image_path', restaurant_id: `eq.${rid}` } })).forEach((p) => p.image_path && refs.add(p.image_path));
  (await db.rest('menu_settings', { query: { select: 'logo_path,cover_path', restaurant_id: `eq.${rid}` } })).forEach((s) => { if (s.logo_path) refs.add(s.logo_path); if (s.cover_path) refs.add(s.cover_path); });
  const [v] = await db.rest('menu_versions', { query: { select: 'snapshot', restaurant_id: `eq.${rid}`, order: 'version.desc', limit: '1' } });
  if (v) {
    if (v.snapshot.logo_path) refs.add(v.snapshot.logo_path);
    if (v.snapshot.cover_path) refs.add(v.snapshot.cover_path);
    for (const c of v.snapshot.categories) for (const p of c.products) if (p.image_path) refs.add(p.image_path);
  }
  // Solo se borra lo que ya nadie usa y que pertenece a este restaurante.
  const doomed = pending.map((p) => p.path).filter((p) => !refs.has(p) && p.startsWith(`${rid}/`));
  await db.storageDelete(doomed);
  for (const { path } of pending) await db.rest('pending_image_deletes', { method: 'DELETE', query: { path: `eq.${path}`, restaurant_id: `eq.${rid}` } });
}

export async function publish({ request, db }) {
  const { user, restaurant: r } = await ctx(request, db);
  const version = await db.rpc('publish_menu', { p_restaurant: r.id, p_actor: user.id });
  try { await cleanupImages(db, r.id); } catch (e) { console.error('Limpieza de imágenes falló:', e?.message); } // no afecta a la publicación
  return json({ version });
}
