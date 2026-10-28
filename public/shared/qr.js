// Generador de códigos QR (modo bytes UTF-8, corrección de errores M, versiones 1–20).
// Sin dependencias. Basado en el algoritmo estándar ISO/IEC 18004.
// El QR solo contiene la dirección pública del restaurante, nunca el menú:
// por eso los cambios de productos, precios o diseño no lo invalidan.
const ECC_PER_BLOCK_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26];
const NUM_BLOCKS_M    = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16];
export const MAX_VERSION = 20;

const rawModules = (v) => {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
  return r;
};
const dataCodewords = (v) => Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK_M[v] * NUM_BLOCKS_M[v];

function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
  return z;
}
function rsDivisor(degree) {
  const r = new Array(degree - 1).fill(0); r.push(1);
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
    root = gfMul(root, 0x02);
  }
  return r;
}
function rsRemainder(data, divisor) {
  const r = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ r.shift(); r.push(0);
    divisor.forEach((c, i) => { r[i] ^= gfMul(c, factor); });
  }
  return r;
}

function utf8(text) { return [...new TextEncoder().encode(text)]; }

function buildDataBits(bytes, version) {
  const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(0b0100, 4);
  put(bytes.length, version <= 9 ? 8 : 16);
  bytes.forEach((b) => put(b, 8));
  const cap = dataCodewords(version) * 8;
  put(0, Math.min(4, cap - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const out = new Array(bits.length / 8).fill(0);
  bits.forEach((b, i) => { out[i >>> 3] |= b << (7 - (i & 7)); });
  return out;
}

function addEccAndInterleave(data, version) {
  const nb = NUM_BLOCKS_M[version], eccLen = ECC_PER_BLOCK_M[version];
  const raw = Math.floor(rawModules(version) / 8);
  const nShort = nb - (raw % nb), shortLen = Math.floor(raw / nb);
  const div = rsDivisor(eccLen);
  const blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1)); k += dat.length;
    const ecc = rsRemainder(dat, div);
    if (i < nShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const out = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= nShort) out.push(b[i]); });
  return out;
}

class Grid {
  constructor(version) {
    this.v = version; this.size = version * 4 + 17;
    this.m = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
    this.f = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
    this.drawFunctionPatterns();
  }
  setF(x, y, dark) { this.m[y][x] = dark; this.f[y][x] = true; }
  drawFunctionPatterns() {
    const s = this.size;
    for (let i = 0; i < s; i++) { this.setF(6, i, i % 2 === 0); this.setF(i, 6, i % 2 === 0); }
    this.finder(3, 3); this.finder(s - 4, 3); this.finder(3, s - 4);
    const pos = this.alignPositions(), n = pos.length;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      this.align(pos[i], pos[j]);
    }
    this.formatBits(0); this.versionBits();
  }
  alignPositions() {
    const v = this.v; if (v === 1) return [];
    const n = Math.floor(v / 7) + 2;
    const step = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2;
    const r = [6];
    for (let p = this.size - 7; r.length < n; p -= step) r.splice(1, 0, p);
    return r;
  }
  finder(x, y) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) this.setF(xx, yy, d !== 2 && d !== 4);
    }
  }
  align(x, y) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.setF(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }
  formatBits(mask) {
    const data = (0 << 3) | mask; // nivel M = 0
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412, bit = (i) => ((bits >>> i) & 1) !== 0, s = this.size;
    for (let i = 0; i <= 5; i++) this.setF(8, i, bit(i));
    this.setF(8, 7, bit(6)); this.setF(8, 8, bit(7)); this.setF(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.setF(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) this.setF(s - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.setF(8, s - 15 + i, bit(i));
    this.setF(8, s - 8, true);
  }
  versionBits() {
    if (this.v < 7) return;
    let rem = this.v;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.v << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const c = ((bits >>> i) & 1) !== 0, a = this.size - 11 + (i % 3), b = Math.floor(i / 3);
      this.setF(a, b, c); this.setF(b, a, c);
    }
  }
  drawCodewords(data) {
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < this.size; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? this.size - 1 - vert : vert;
        if (!this.f[y][x] && i < data.length * 8) { this.m[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; }
      }
    }
  }
  mask(k) {
    for (let y = 0; y < this.size; y++) for (let x = 0; x < this.size; x++) {
      let inv;
      switch (k) {
        case 0: inv = (x + y) % 2 === 0; break;
        case 1: inv = y % 2 === 0; break;
        case 2: inv = x % 3 === 0; break;
        case 3: inv = (x + y) % 3 === 0; break;
        case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: inv = ((x * y) % 2) + ((x * y) % 3) === 0; break;
        case 6: inv = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        default: inv = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
      }
      if (!this.f[y][x] && inv) this.m[y][x] = !this.m[y][x];
    }
  }
  penalty() {
    const s = this.size, m = this.m; let r = 0;
    const addH = (run, h) => { if (h[0] === 0) run += s; h.pop(); h.unshift(run); };
    const count = (h) => { const n = h[1]; const core = n > 0 && h[2] === n && h[3] === n * 3 && h[4] === n && h[5] === n;
      return (core && h[0] >= n * 4 && h[6] >= n ? 1 : 0) + (core && h[6] >= n * 4 && h[0] >= n ? 1 : 0); };
    const scan = (get) => {
      for (let a = 0; a < s; a++) {
        let color = false, run = 0; const h = [0, 0, 0, 0, 0, 0, 0];
        for (let b = 0; b < s; b++) {
          if (get(a, b) === color) { run++; if (run === 5) r += 3; else if (run > 5) r++; }
          else { addH(run, h); if (!color) r += count(h) * 40; color = get(a, b); run = 1; }
        }
        if (color) { addH(run, h); run = 0; }
        run += s; addH(run, h); r += count(h) * 40;
      }
    };
    scan((y, x) => m[y][x]); scan((x, y) => m[y][x]);
    for (let y = 0; y < s - 1; y++) for (let x = 0; x < s - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) r += 3; }
    let dark = 0; m.forEach((row) => row.forEach((c) => { if (c) dark++; }));
    r += (Math.ceil(Math.abs(dark * 20 - s * s * 10) / (s * s)) - 1) * 10;
    return r;
  }
}

// Devuelve una matriz de booleanos (true = módulo oscuro), sin zona de silencio.
export function encodeQr(text) {
  const bytes = utf8(String(text));
  let version = 1;
  while (version <= MAX_VERSION) {
    const need = 4 + (version <= 9 ? 8 : 16) + bytes.length * 8;
    if (need <= dataCodewords(version) * 8) break;
    version++;
  }
  if (version > MAX_VERSION) throw new Error('El texto es demasiado largo para el código QR.');
  const codewords = addEccAndInterleave(buildDataBits(bytes, version), version);
  const g = new Grid(version); g.drawCodewords(codewords);
  let best = 0, bestScore = Infinity;
  for (let k = 0; k < 8; k++) {
    g.mask(k); g.formatBits(k);
    const p = g.penalty();
    if (p < bestScore) { bestScore = p; best = k; }
    g.mask(k); // deshace la máscara
  }
  g.mask(best); g.formatBits(best);
  return g.m.map((row) => row.slice());
}
