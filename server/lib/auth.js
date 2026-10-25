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
