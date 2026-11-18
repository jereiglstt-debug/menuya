// Dibuja un código QR en un <canvas>. El QR solo contiene la dirección pública.
import { encodeQr } from '/shared/qr.js';
import { contrast, luminance, isHex } from '/shared/design.js';

export const QUIET = 4; // módulos de margen blanco exigidos por el estándar

// Para que los lectores lo escaneen: módulos OSCUROS sobre fondo CLARO y buen contraste.
export function qrColorsError(fg, bg) {
  if (!isHex(fg) || !isHex(bg)) return 'Elegí colores válidos.';
  if (luminance(fg) >= luminance(bg)) return 'El código debe ser más oscuro que el fondo, o muchos celulares no lo leerán.';
  if (contrast(fg, bg) < 4) return 'Hay poco contraste entre el código y el fondo. Elegí un color más oscuro o un fondo más claro.';
  return null;
}

// opts: { fg, bg, label, minPx }. Devuelve la cantidad de módulos del código.
export function drawQr(canvas, text, { fg = '#000000', bg = '#ffffff', label = '', minPx = 1000 } = {}) {
  const m = encodeQr(text);
  const n = m.length;
  const total = n + QUIET * 2;
  const px = Math.max(4, Math.ceil(minPx / total)); // píxeles por módulo, entero (bordes nítidos)
  const side = total * px;
  const labelH = label ? Math.round(side * 0.16) : 0;
  canvas.width = side; canvas.height = side + labelH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = fg;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (m[y][x]) ctx.fillRect((x + QUIET) * px, (y + QUIET) * px, px, px);
  }
  if (label) {
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let size = Math.round(labelH * 0.5);
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    while (ctx.measureText(label).width > side * 0.9 && size > 12) { size -= 2; ctx.font = `700 ${size}px system-ui, sans-serif`; }
    ctx.fillText(label, side / 2, side + labelH * 0.45);
  }
  return n;
}
