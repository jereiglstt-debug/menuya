import { json, HttpError } from '../lib/http.js';
import { isSlugFormat } from '../lib/validate.js';
import { sanitizeDesign } from '../../public/shared/design.js';
import { designPermissions } from '../lib/plans.js';

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
  const s = v.snapshot;
  const perms = designPermissions(r.plan);
  return json({
    design: sanitizeDesign(s.design, perms),
    cover_url: perms.advanced ? db.publicUrl(s.cover_path) : null,
    title: s.title, description: s.description, logo_url: db.publicUrl(s.logo_path), published_at: v.published_at,
    categories: s.categories.map((c) => ({
      name: c.name,
      products: c.products.map((p) => ({ name: p.name, description: p.description, price_ars: p.price_ars, available: p.available, image_url: db.publicUrl(p.image_path) })),
    })),
  }, 200, { 'cache-control': 'public, max-age=30' });
}
