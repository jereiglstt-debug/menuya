// Etiquetas de medios de pago (iguales en el panel y en el menú).
export const PAY_LABEL = {
  efectivo: 'Efectivo', debito: 'Tarjeta de débito', credito: 'Tarjeta de crédito', combinado: 'Combinado',
  transferencia: 'Transferencia', tarjeta: 'Tarjeta', // solo pedidos viejos
};
export const BASE = ['efectivo', 'debito', 'credito'];
export const payText = (method, combo) => (method === 'combinado' && combo?.length ? `Combinado (${combo.map((c) => PAY_LABEL[c]).join(' + ')})` : PAY_LABEL[method] || method);
