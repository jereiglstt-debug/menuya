// Visor 3D / realidad aumentada de un platillo. El visor (model-viewer de Google) pesa
// ~1 MB, así que se descarga SOLO cuando alguien toca "Ver", nunca al abrir el menú.
// Android abre la cámara con Scene Viewer; iPhone abre Quick Look (AR Quick Look de Apple).
// El archivo del visor vive en /vendor/ porque la política de seguridad solo permite
// scripts del propio sitio.
import { h } from '/shared/core.js';

const VIEWER_SRC = '/vendor/model-viewer.min.js';
let loading = null;
export function loadViewer(src = VIEWER_SRC) {
  if (customElements.get('model-viewer')) return Promise.resolve();
  loading ||= import(src).then(() => customElements.whenDefined('model-viewer'));
  loading.catch(() => { loading = null; }); // permite reintentar si falló
  return loading;
}

export async function openViewer(dlg, p, { src } = {}) {
  const status = h('p', { class: 'm-ar-status', role: 'status' }, 'Cargando el modelo 3D…');
  const stage = h('div', { class: 'm-ar-stage' }, status);
  const close = h('button', { class: 'm-btn alt', onclick: () => dlg.close() }, 'Cerrar');
  dlg.replaceChildren(h('h2', {}, p.name), stage,
    h('p', { class: 'm-ar-hint' }, 'Tocá “Ver en mi mesa” para ver el plato en tamaño real con la cámara. Con un dedo podés girarlo.'),
    h('div', { class: 'm-cart-actions' }, close));
  if (!dlg.open) dlg.showModal();
  try {
    await loadViewer(src);
  } catch {
    status.textContent = 'No se pudo cargar el visor 3D. Revisá tu conexión e intentá de nuevo.';
    return;
  }
  const arBtn = h('button', { slot: 'ar-button', class: 'm-btn m-ar-btn', type: 'button' }, 'Ver en mi mesa');
  const viewer = h('model-viewer', {
    class: 'm-ar-viewer', src: p.model_url, alt: `Modelo 3D de ${p.name}`,
    ar: true, 'ar-modes': 'scene-viewer quick-look', 'ar-scale': 'fixed', 'ar-placement': 'floor',
    'camera-controls': true, 'touch-action': 'pan-y', 'shadow-intensity': '1', 'environment-image': 'neutral', 'interaction-prompt': 'none',
  }, arBtn);
  viewer.addEventListener('load', () => { status.remove(); });
  viewer.addEventListener('error', () => {
    viewer.remove();
    stage.replaceChildren(h('p', { class: 'm-ar-status', role: 'alert' }, 'No se pudo mostrar este modelo.'));
  });
  stage.append(viewer);
  return viewer;
}
