import { HttpError } from './http.js';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Se confía en el CONTENIDO del archivo, no en el nombre ni en el tipo declarado.
export function detectImageType(b) {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png';
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

export async function readImage(request) {
  const declared = (request.headers.get('content-type') || '').split(';')[0].trim();
  if (!TYPES[declared]) throw new HttpError(415, 'Formato no permitido. Usá JPG, PNG o WebP.');
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_IMAGE_BYTES) throw new HttpError(413, 'La imagen supera los 2 MB.');
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) throw new HttpError(400, 'No se recibió ninguna imagen.');
  if (bytes.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'La imagen supera los 2 MB.');
  const real = detectImageType(bytes);
  if (real !== declared) throw new HttpError(400, 'El archivo no es una imagen válida.');
  return { bytes, type: real, ext: TYPES[real] };
}

export const newImagePath = (restaurantId, ext) => `${restaurantId}/${crypto.randomUUID()}.${ext}`;
