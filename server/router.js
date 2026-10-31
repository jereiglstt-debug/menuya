import { createDb } from './lib/supabase.js';
import { errorResponse, HttpError } from './lib/http.js';
import * as admin from './handlers/admin.js';
import * as pub from './handlers/public.js';
import * as owner from './handlers/owner.js';
import { publicMenu } from './handlers/publicMenu.js';
import * as pubOrders from './handlers/publicOrders.js';
import * as ord from './handlers/orders.js';
import * as pay from './handlers/payments.js';

const ROUTES = [
  ['GET',   /^\/config$/,                          pub.config, false],
  ['GET',   /^\/health$/,                          pub.health],
  ['GET',   /^\/me$/,                              pub.me],
  ['GET',   /^\/admin\/restaurants$/,              admin.listRestaurants],
  ['POST',  /^\/admin\/restaurants$/,              admin.createRestaurant],
  ['GET',   /^\/admin\/restaurants\/([^/]+)$/,     admin.getRestaurantDetail],
  ['PATCH', /^\/admin\/restaurants\/([^/]+)$/,     admin.updateRestaurant],
  ['DELETE', /^\/admin\/restaurants\/([^/]+)$/,    admin.deleteRestaurant],
  ['PATCH', /^\/admin\/restaurants\/([^/]+)\/owner-email$/, admin.changeOwnerEmail],
  ['POST',  /^\/admin\/restaurants\/([^/]+)\/payments$/,    admin.registerPayment],
  ['POST',  /^\/admin\/restaurants\/([^/]+)\/access-link$/, admin.accessLink],
  ['GET',   /^\/admin\/audit$/,                    admin.listAudit],

  ['GET',    /^\/public\/menu\/([^/]+)$/,            publicMenu],
  ['POST',   /^\/public\/orders\/([^/]+)$/,          pubOrders.createOrder],
  ['GET',    /^\/public\/orders\/([^/]+)\/([^/]+)$/, pubOrders.trackOrder],

  ['GET',    /^\/owner\/payments$/,                  pay.getPayments],
  ['PATCH',  /^\/owner\/payments$/,                  pay.updatePayments],
  ['GET',    /^\/owner\/ordering$/,                  ord.getOrdering],
  ['PATCH',  /^\/owner\/ordering$/,                  ord.updateOrdering],
  ['POST',   /^\/owner\/tables$/,                    ord.createTables],
  ['PATCH',  /^\/owner\/tables\/([^/]+)$/,           ord.updateTable],
  ['DELETE', /^\/owner\/tables\/([^/]+)$/,           ord.deleteTable],
  ['GET',    /^\/owner\/orders$/,                    ord.listOrders],
  ['PATCH',  /^\/owner\/orders\/([^/]+)\/status$/,   ord.setOrderStatus],
  ['GET',    /^\/owner\/stats$/,                     ord.stats],

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
      return await handler({ request, env, db, params: { id: m[1], id2: m[2] } });
    }
    throw new HttpError(pathMatched ? 405 : 404, pathMatched ? 'Método no permitido.' : 'No encontrado.');
  } catch (err) {
    return errorResponse(err);
  }
}
