// Mensajes de WhatsApp. NO es un pedido: se arma un texto y se abre
// WhatsApp para que el cliente lo envíe al local. No hay confirmación del
// local ni cobro dentro de la plataforma.
export const MAX_QTY = 20;
export const MAX_LINES = 40;
export const MAX_URL = 3000; // largo máximo del enlace ya codificado

const ars = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: Number.isInteger(+n) ? 0 : 2 }).format(n);

export function waLink(number, text) {
  if (!/^[0-9]{8,15}$/.test(String(number))) throw new Error('Número de WhatsApp inválido');
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

// Mensaje corto para consultar (Plan Básico).
export const inquiryMessage = (title) => `Hola, quiero consultar por el menú de ${title}.`;

export const orderTotal = (items) => items.reduce((s, i) => s + i.price_ars * i.qty, 0);

// items: [{ name, qty, price_ars }]. Los precios son los del menú publicado
// que el cliente está viendo; el local es quien confirma.
export function orderMessage({ title, items, customer = '', note = '' }) {
  const used = items.slice(0, MAX_LINES); // el total coincide con las líneas que se envían
  const lines = used.map((i) => `• ${i.qty} x ${i.name} — ${ars(i.price_ars * i.qty)}`);
  const total = orderTotal(used);
  const out = [`Hola, quiero hacer este pedido en ${title}:`, '', ...lines, '', `Total estimado: ${ars(total)}`];
  const c = String(customer).trim().slice(0, 60); const n = String(note).trim().slice(0, 300);
  if (c) out.push('', `Nombre: ${c}`);
  if (n) out.push('', `Aclaraciones: ${n}`);
  return out.join('\n');
}
