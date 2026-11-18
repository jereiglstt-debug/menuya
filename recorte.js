// Editor de fotos: encuadre (arrastrar) y tamaño (zoom) antes de subir.
// Devuelve un Blob ya recortado y comprimido (≤ 2 MB), o null si se cancela.
// El servidor vuelve a validar todo igual: esto es solo comodidad para el usuario.
import { h } from '/shared/core.js';

const MAX_BYTES = 2 * 1024 * 1024 - 64 * 1024;

function toBlob(canvas, type, q) {
  return new Promise((res) => canvas.toBlob(res, type, q));
}

async function render(bmp, view, st, outW, outH, wantPng) {
  // Intenta calidad/tamaño decrecientes hasta entrar en el límite.
  let w = outW; let hh = outH;
  for (let i = 0; i < 8; i++) {
    const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(hh);
    const g = c.getContext('2d');
    if (!wantPng) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
    g.imageSmoothingQuality = 'high';
    const k = c.width / view.w; const sc = st.scale * k;
    g.drawImage(bmp, c.width / 2 - st.cx * sc, c.height / 2 - st.cy * sc, bmp.width * sc, bmp.height * sc);
    const tries = wantPng ? [undefined] : [0.9, 0.8, 0.7];
    for (const q of tries) {
      const b = await toBlob(c, wantPng ? 'image/png' : 'image/jpeg', q);
      if (b && b.size <= MAX_BYTES) return b;
    }
    w *= 0.85; hh *= 0.85;
  }
  return null;
}

export async function cropImage({ file, aspect = 1, outW = 800, shape = 'rect', title = 'Ajustar foto' }) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { bmp = null; }
  if (!bmp) throw new Error('No se pudo leer la imagen. Probá con otra.');

  const size = Math.max(200, Math.min(340, window.innerWidth - 72));
  const view = aspect >= 1 ? { w: size, h: Math.round(size / aspect) } : { w: Math.round(size * aspect), h: size };
  const outH = Math.round(outW / aspect);
  const base = Math.max(view.w / bmp.width, view.h / bmp.height);
  const st = { zoom: 1, cx: bmp.width / 2, cy: bmp.height / 2, scale: base };

  const canvas = h('canvas', { class: 'crop-canvas', width: String(view.w), height: String(view.h), tabindex: '0', role: 'img', 'aria-label': 'Vista previa. Arrastrá para mover; usá el control de zoom para cambiar el tamaño.' });
  const g = canvas.getContext('2d');

  function clamp() {
    st.scale = base * st.zoom;
    const hw = view.w / 2 / st.scale; const hh = view.h / 2 / st.scale;
    st.cx = Math.min(bmp.width - hw, Math.max(hw, st.cx));
    st.cy = Math.min(bmp.height - hh, Math.max(hh, st.cy));
  }
  function draw() {
    clamp();
    g.fillStyle = '#fff'; g.fillRect(0, 0, view.w, view.h);
    g.drawImage(bmp, view.w / 2 - st.cx * st.scale, view.h / 2 - st.cy * st.scale, bmp.width * st.scale, bmp.height * st.scale);
    if (shape === 'circle') { // oscurece fuera del círculo
      g.save(); g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath();
      g.rect(0, 0, view.w, view.h);
      g.arc(view.w / 2, view.h / 2, Math.min(view.w, view.h) / 2, 0, Math.PI * 2, true);
      g.fill('evenodd'); g.restore();
    }
  }

  const zoom = h('input', { type: 'range', min: '1', max: '4', step: '0.01', value: '1', 'aria-label': 'Tamaño (zoom)', class: 'crop-zoom' });
  zoom.addEventListener('input', () => { st.zoom = Number(zoom.value); draw(); });

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY }; canvas.classList.add('grab'); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect(); const f = view.w / r.width;
    st.cx -= ((e.clientX - drag.x) * f) / st.scale; st.cy -= ((e.clientY - drag.y) * f) / st.scale;
    drag = { x: e.clientX, y: e.clientY }; draw();
  });
  const end = () => { drag = null; canvas.classList.remove('grab'); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    st.zoom = Math.min(4, Math.max(1, st.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))); zoom.value = String(st.zoom); draw();
  }, { passive: false });
  canvas.addEventListener('keydown', (e) => {
    const step = 20 / st.scale;
    const m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (m) { e.preventDefault(); st.cx += m[0]; st.cy += m[1]; draw(); }
    else if (e.key === '+' || e.key === '-') { st.zoom = Math.min(4, Math.max(1, st.zoom + (e.key === '+' ? 0.15 : -0.15))); zoom.value = String(st.zoom); draw(); }
  });

  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; bmp.close?.(); d.close(); resolve(v); };
    const err = h('div', { class: 'form-error hidden', role: 'alert' });
    const ok = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
      ok.disabled = true; err.classList.add('hidden');
      const wantPng = file.type === 'image/png' && shape === 'circle';
      const blob = await render(bmp, view, st, outW, outH, wantPng);
      if (!blob) { err.textContent = 'No se pudo preparar la imagen. Probá con otra más chica.'; err.classList.remove('hidden'); ok.disabled = false; return; }
      finish(blob);
    } }, 'Usar esta foto');
    const d = h('dialog', { class: 'crop-dlg' },
      h('h2', {}, title),
      h('p', { class: 'hint' }, 'Arrastrá la foto para encuadrarla y usá el control para agrandarla o achicarla.'),
      h('div', { class: 'crop-box' }, canvas),
      h('label', { for: 'crop-zoom' }, 'Tamaño'), zoom, err,
      h('div', { class: 'actions' }, ok, h('button', { class: 'btn', type: 'button', onclick: () => finish(null) }, 'Cancelar')));
    zoom.id = 'crop-zoom';
    d.addEventListener('close', () => { d.remove(); finish(null); });
    document.body.append(d); d.showModal(); draw(); canvas.focus();
  });
}
