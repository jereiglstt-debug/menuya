import { createDb } from './lib/supabase.js';
import { errorResponse, HttpError } from './lib/http.js';
import * as admin from './handlers/admin.js';
import * as pub from './handlers/public.js';
import * as owner from './handlers/owner.js';
import { publicMenu } from './handlers/publicMenu.js';

const ROUTES = [
  ['GET',   /^\/config$/,                          pub.config, false],
  ['GET',   /^\/health$/,                          pub.health],
  ['GET',   /^\/me$/,                              pub.me],
  ['GET',   /^\/admin\/restaurants$/,              admin.listRestaurants],
  ['POST',  /^\/admin\/restaurants$/,              admin.createRestaurant],
  ['GET',   /^\/admin\/restaurants\/([^/]+)$/,     admin.getRestaurantDetail],
  ['PATCH', /^\/admin\/restaurants\/([^/]+)$/,     admin.updateRestaurant],
  ['POST',  /^\/admin\/restaurants\/([^/]+)\/payments$/,    admin.registerPayment],
  ['POST',  /^\/admin\/restaurants\/([^/]+)\/access-link$/, admin.accessLink],
  ['GET',   /^\/admin\/audit$/,                    admin.listAudit],

  ['GET',    /^\/public\/menu\/([^/]+)$/,            publicMenu],

  ['GET',    /^\/owner\/menu$/,                      owner.getMenu],
  ['GET',    /^\/owner\/preview$/,                   owner.preview],
  ['PATCH',  /^\/owner\/settings$/,                  owner.updateSettings],
  ['POST',   /^\/owner\/logo$/,                      owner.uploadLogo],
  ['DELETE', /^\/owner\/logo$/,                      owner.deleteLogo],
  ['PATCH',  /^\/owner\/design$/,                    owner.updateDesign],
  ['POST',   /^\/owner\/cover$/,                     owner.uploadCover],
  ['DELETE', /^\/owner\/cover$/,                     owner.deleteCover],
  ['POST',   /^\/owner\/publish$/,                   owner.publish],
  ['POST',   /^\/owner\/categories$/,                owner.createCategory],
  ['POST',   /^\/owner\/categories\/reorder$/,       owner.reorderCategories],
  ['PATCH',  /^\/owner\/categories\/([^/]+)$/,      owner.updateCategory],
  ['DELETE', /^\/owner\/categories\/([^/]+)$/,      owner.deleteCategory],
  ['POST',   /^\/owner\/promotions$/,               owner.createPromotion],
  ['PATCH',  /^\/owner\/promotions\/([^/]+)$/,     owner.updatePromotion],
  ['DELETE', /^\/owner\/promotions\/([^/]+)$/,     owner.deletePromotion],
  ['POST',   /^\/owner\/products$/,                  owner.createProduct],
  ['POST',   /^\/owner\/products\/reorder$/,         owner.reorderProducts],
  ['PATCH',  /^\/owner\/products\/([^/]+)$/,        owner.updateProduct],
  ['DELETE', /^\/owner\/products\/([^/]+)$/,        owner.deleteProduct],
  ['POST',   /^\/owner\/products\/([^/]+)\/duplicate$/, owner.duplicateProduct],
  ['POST',   /^\/owner\/products\/([^/]+)\/image$/, owner.uploadProductImage],
  ['DELETE', /^\/owner\/products\/([^/]+)\/image$/, owner.deleteProductImage],
];

export async function handle(request, env, fetchImpl = fetch) {
  try {
    const path = new URL(request.url).pathname.replace(/^\/api/, '') || '/';
    let pathMatched = false;
    for (const [method, re, handler, needsDb = true] of ROUTES) {
      const m = path.match(re);
      if (!m) continue;
      pathMatched = true;
      if (request.method !== method) continue;
      const db = needsDb ? createDb(env, fetchImpl) : null;
      return await handler({ request, env, db, params: { id: m[1] } });
    }
    throw new HttpError(pathMatched ? 405 : 404, pathMatched ? 'Método no permitido.' : 'No encontrado.');
  } catch (err) {
    return errorResponse(err);
  }
}
