export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const SECURITY_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...SECURITY_HEADERS, ...extraHeaders } });
}

const MAX_BODY = 32 * 1024;

export async function readJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    throw new HttpError(415, 'El contenido debe ser JSON.');
  }
  const text = await request.text();
  if (text.length > MAX_BODY) throw new HttpError(413, 'La solicitud es demasiado grande.');
  try {
    const body = JSON.parse(text);
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw new HttpError(400, 'El JSON enviado no es válido.');
  }
}

// Los errores internos se registran sin datos sensibles y se devuelven genéricos.
export function errorResponse(err) {
  if (err instanceof HttpError) {
    return json({ error: err.message, details: err.details }, err.status);
  }
  console.error('Error interno:', err?.name, err?.message);
  return json({ error: 'Ocurrió un error inesperado. Intentá de nuevo.' }, 500);
}
