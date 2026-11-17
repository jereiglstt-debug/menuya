// Modelos 3D de los platillos (GLB). Igual que con las imágenes, se confía en el
// CONTENIDO del archivo y no en el nombre ni en el tipo declarado.
import { HttpError } from './http.js';

export const MAX_MODEL_BYTES = 8 * 1024 * 1024;
export const MODEL_TYPE = 'model/gltf-binary';
const DECLARED = new Set(['model/gltf-binary', 'application/octet-stream']);
// Extensiones que obligan al visor a bajar decodificadores de otro sitio (la política de
// seguridad del menú no lo permite). Se pide exportar el modelo sin esa compresión.
const UNSUPPORTED = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'];

const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const bad = (msg) => new HttpError(400, msg);

// Estructura de un GLB: cabecera de 12 bytes ("glTF", versión 2, largo total) y
// primer bloque JSON. Devuelve el JSON ya leído o lanza un error claro.
export function parseGlb(b) {
  if (b.length < 20 || u32(b, 0) !== 0x46546c67) throw bad('El archivo no es un modelo GLB válido.');
  if (u32(b, 4) !== 2) throw bad('Solo se admiten modelos GLB versión 2.');
  if (u32(b, 8) !== b.length) throw bad('El archivo GLB está incompleto o dañado.');
  const jsonLen = u32(b, 12);
  if (u32(b, 16) !== 0x4e4f534a || 20 + jsonLen > b.length) throw bad('El archivo GLB está dañado.');
  let doc;
  try { doc = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(b.subarray(20, 20 + jsonLen))); }
  catch { throw bad('El archivo GLB está dañado.'); }
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.meshes) || !doc.meshes.length) {
    throw bad('El modelo no contiene ninguna figura 3D.');
  }
  const needed = [...(doc.extensionsRequired || []), ...(doc.extensionsUsed || [])];
  const comp = UNSUPPORTED.find((e) => needed.includes(e));
  if (comp) throw bad('El modelo usa compresión (' + comp + ') que no es compatible. Exportalo como GLB sin comprimir.');
  // Un modelo no puede mandar al visitante a descargar archivos de otros sitios.
  const external = [...(doc.buffers || []), ...(doc.images || [])].some((x) => typeof x?.uri === 'string' && !x.uri.startsWith('data:'));
  if (external) throw bad('El modelo referencia archivos externos. Exportalo como un único GLB con todo incluido.');
  return doc;
}

export async function readModel(request, maxBytes = MAX_MODEL_BYTES) {
  const declared = (request.headers.get('content-type') || '').split(';')[0].trim();
  const mb = Math.round(maxBytes / 1048576);
  if (!DECLARED.has(declared)) throw new HttpError(415, 'Formato no permitido. Subí un archivo .glb.');
  const len = Number(request.headers.get('content-length') || 0);
  if (len > maxBytes) throw new HttpError(413, `El modelo supera los ${mb} MB.`);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) throw new HttpError(400, 'No se recibió ningún modelo.');
  if (bytes.length > maxBytes) throw new HttpError(413, `El modelo supera los ${mb} MB.`);
  parseGlb(bytes);
  return { bytes, type: MODEL_TYPE, ext: 'glb' };
}
