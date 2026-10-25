import { createDb } from './lib/supabase.js';
import { errorResponse, HttpError } from './lib/http.js';
import * as admin from './handlers/admin.js';
import * as pub from './handlers/public.js';

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
