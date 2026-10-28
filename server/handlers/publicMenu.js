import { json, HttpError } from '../lib/http.js';
import { isSlugFormat } from '../lib/validate.js';
import { publicShape } from '../lib/publicShape.js';

// Menú público: sin sesión. Solo expone la ÚLTIMA instantánea publicada de
// restaurantes activos; el borrador nunca sale por aquí.
export async function publicMenu({ db, params }) {
  const slug = params.id;
  if (!isSlugFormat(slug)) throw new HttpError(404, 'Menú no disponible.');
  const [r] = await db.rest('restaurants', { query: { select: 'id,status,plan', slug: `eq.${slug}` } });
  if (!r || r.status !== 'activo') throw new HttpError(404, 'Menú no disponible.');
  const [v] = await db.rest('menu_versions', {
    query: { select: 'snapshot,published_at', restaurant_id: `eq.${r.id}`, order: 'version.desc', limit: '1' },
  });
  if (!v) throw new HttpError(404, 'Este menú todavía no fue publicado.');
  return json({ ...publicShape(v.snapshot, r.plan, db), published_at: v.published_at }, 200, { 'cache-control': 'public, max-age=30' });
}
