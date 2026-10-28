import { HttpError } from './http.js';

export async function authenticate(request, db) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)$/);
  if (!match) throw new HttpError(401, 'Iniciá sesión para continuar.');
  const user = await db.getUser(match[1]);
  if (!user) throw new HttpError(401, 'Tu sesión venció. Volvé a iniciar sesión.');
  return user;
}

// La condición de administrador se verifica SIEMPRE en base de datos.
export async function requireAdmin(request, db) {
  const user = await authenticate(request, db);
  const rows = await db.rest('platform_admins', {
    query: { select: 'user_id', user_id: `eq.${user.id}` },
  });
  if (!rows?.length) throw new HttpError(403, 'No tenés permisos de administrador.');
  return user;
}

// El restaurante SIEMPRE se deriva de la sesión; ningún identificador de
// restaurante enviado por el cliente se usa para decidir a qué datos accede.
export async function requireOwner(request, db) {
  const user = await authenticate(request, db);
  const owners = await db.rest('restaurant_owners', { query: { select: 'restaurant_id', user_id: `eq.${user.id}` } });
  if (!owners?.length) throw new HttpError(403, 'Tu cuenta no está asociada a ningún restaurante.');
  const rows = await db.rest('restaurants', {
    query: { select: 'id,slug,name,description,plan,status,draft_changed_at', id: `eq.${owners[0].restaurant_id}` },
  });
  if (!rows?.length) throw new HttpError(403, 'Tu cuenta no está asociada a ningún restaurante.');
  if (rows[0].status === 'suspendido') throw new HttpError(403, 'Tu cuenta está suspendida. Comunicate con el administrador.');
  return { user, restaurant: rows[0] };
}
