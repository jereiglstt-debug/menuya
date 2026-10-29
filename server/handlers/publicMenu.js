import { json, HttpError } from '../lib/http.js';
import { isSlugFormat } from '../lib/validate.js';
import { publicShape } from '../lib/publicShape.js';
import { orderingView } from '../lib/orders.js';
import { findTable } from './publicOrders.js';

// Menú público: sin sesión. Solo expone la ÚLTIMA instantánea publicada de
// restaurantes activos; el borrador nunca sale por aquí.
export async function publicMenu({ request, db, params }) {
  const slug = params.id;
  if (!isSlugFormat(slug)) throw new HttpError(404, 'Menú no disponible.');
  const [r] = await db.rest('restaurants', { query: { select: 'id,status,plan', slug: `eq.${slug}` } });
  if (!r || r.status !== 'activo') throw new HttpError(404, 'Menú no disponible.');
  const [v] = await db.rest('menu_versions', {
    query: { select: 'snapshot,published_at', restaurant_id: `eq.${r.id}`, order: 'version.desc', limit: '1' },
  });
  if (!v) throw new HttpError(404, 'Este menú todavía no fue publicado.');
  // Pedidos nativos (Premium): configuración EN VIVO; ?mesa=<id> identifica la mesa.
  const mesa = new URL(request.url).searchParams.get('mesa');
  const [row] = await db.rest('restaurant_ordering', { query: { select: '*', restaurant_id: `eq.${r.id}` } });
  const ordering = orderingView(row, r.plan, mesa ? await findTable(db, r.id, mesa) : null);
  return json({ ...publicShape(v.snapshot, r.plan, db, { ordering }), slug, published_at: v.published_at }, 200, { 'cache-control': 'public, max-age=30' });
}
