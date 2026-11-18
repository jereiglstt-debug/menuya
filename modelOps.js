// Subida y retiro de modelos 3D. Lo usan el propietario (su restaurante, por sesión)
// y el administrador (cualquier restaurante). La regla de plan y el límite se
// aplican acá, en el servidor, sin importar quién llame.
import { HttpError } from './http.js';
import { requireFeature } from './plans.js';
import { readModel } from './models.js';
import { newImagePath } from './images.js';

export const DEFAULT_MODEL_LIMIT = 15;

export async function modelStatus(db, rid) {
  const [r] = await db.rest('restaurants', { query: { select: 'model_limit', id: `eq.${rid}` } });
  const rows = await db.rest('products', { query: { select: 'id,model_path', restaurant_id: `eq.${rid}` } });
  return { used: rows.filter((p) => p.model_path).length, limit: r?.model_limit ?? DEFAULT_MODEL_LIMIT };
}

async function queue(db, rid, path) {
  if (!path) return;
  try { await db.rest('pending_image_deletes', { method: 'POST', body: { path, restaurant_id: rid } }); }
  catch (e) { if (e.status !== 409) throw e; }
}

export async function attachModel({ db, restaurant, product, request }) {
  requireFeature(restaurant, 'modelos_3d');
  const m = await readModel(request);
  if (!product.model_path) {
    const { used, limit } = await modelStatus(db, restaurant.id);
    if (used >= limit) throw new HttpError(409, `Este restaurante ya tiene ${used} de ${limit} modelos 3D permitidos. Quitá uno para subir otro.`);
  }
  const path = newImagePath(restaurant.id, m.ext);
  await db.storageUpload(path, m.bytes, m.type);
  try {
    const rows = await db.rest('products', { method: 'PATCH', query: { id: `eq.${product.id}`, restaurant_id: `eq.${restaurant.id}` }, body: { model_path: path }, returning: true });
    await queue(db, restaurant.id, product.model_path);
    return rows[0];
  } catch (e) { await db.storageDelete([path]).catch(() => {}); throw e; }
}

export async function detachModel({ db, restaurant, product }) {
  await db.rest('products', { method: 'PATCH', query: { id: `eq.${product.id}`, restaurant_id: `eq.${restaurant.id}` }, body: { model_path: null } });
  await queue(db, restaurant.id, product.model_path);
}
