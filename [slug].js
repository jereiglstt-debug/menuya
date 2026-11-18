// Menú público en /<slug>. Los archivos estáticos y las rutas del sistema
// pasan de largo (context.next()); solo los slugs válidos reciben la página
// del menú, que luego pide sus datos a /api/public/menu/<slug>.
import { RESERVED_SLUGS, isSlugFormat } from '../server/lib/validate.js';

export async function onRequest(context) {
  const slug = new URL(context.request.url).pathname.replace(/^\/+|\/+$/g, '');
  if (!isSlugFormat(slug) || RESERVED_SLUGS.has(slug)) return context.next();
  const shell = await context.env.ASSETS.fetch(new URL('/menu/', context.request.url));
  return new Response(shell.body, { status: shell.status, headers: shell.headers });
}
