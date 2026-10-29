// Forma ÚNICA del menú público. La usan el menú publicado (desde la
// instantánea) y la vista previa (desde el borrador), así lo que se
// previsualiza es lo que se publica. Las funciones de plan se aplican
// ACÁ, al mostrar: si un restaurante baja de plan, lo que ya no incluye
// deja de verse aunque siga guardado.
import { hasFeature, designPermissions } from './plans.js';
import { sanitizeDesign } from '../../public/shared/design.js';

export function publicShape(src, plan, db, opts = {}) {
  const ordering = opts.ordering || null; // solo Premium con pedidos; trae ids de producto
  const perms = designPermissions(plan);
  const featured = hasFeature(plan, 'destacados');
  return {
    title: src.title, description: src.description,
    logo_url: db.publicUrl(src.logo_path),
    cover_url: perms.advanced ? db.publicUrl(src.cover_path) : null,
    design: sanitizeDesign(src.design, perms),
    whatsapp: hasFeature(plan, 'whatsapp_mensaje') ? (src.whatsapp || null) : null,
    ordering,
    payments: opts.payments || null, // medios de pago (en vivo, todos los planes)
    ...(opts.preview ? { preview: true } : {}),
    cart: hasFeature(plan, 'carrito') && hasFeature(plan, 'whatsapp_mensaje') && !!src.whatsapp,
    promotions: hasFeature(plan, 'promociones') ? (src.promotions || []).map((p) => ({ title: p.title, description: p.description })) : [],
    categories: src.categories.map((c) => ({
      name: c.name,
      products: c.products.map((p) => ({
        ...(ordering ? { id: p.id } : {}),
        name: p.name, description: p.description, price_ars: p.price_ars, available: p.available,
        featured: featured && !!p.featured, image_url: db.publicUrl(p.image_path),
      })),
    })),
  };
}
