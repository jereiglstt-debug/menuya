// Fuente única de verdad de planes y permisos. Toda función protegida
// del servidor debe pasar por requireFeature(); la interfaz solo refleja
// lo que el servidor ya decidió.
import { HttpError } from './http.js';

export const PLANS = ['basico', 'profesional', 'premium'];
const RANK = { basico: 1, profesional: 2, premium: 3 };

export const PLAN_LABELS = { basico: 'Básico', profesional: 'Profesional', premium: 'Premium' };

// feature -> plan mínimo que la incluye
export const FEATURES = {
  menu_publico: 'basico',
  catalogo: 'basico',
  borradores_y_publicacion: 'basico',
  plantillas_basicas: 'basico',
  colores_basicos: 'basico',
  qr_general: 'basico',
  whatsapp_mensaje: 'basico',

  plantillas_extra: 'profesional',
  personalizacion_avanzada: 'profesional',
  qr_personalizado: 'profesional',
  destacados: 'profesional',
  promociones: 'profesional',
  carrito: 'profesional',

  pedidos_nativos: 'premium',
  mesas_y_qr_mesa: 'premium',
  delivery: 'premium',
  take_away: 'premium',
  estadisticas: 'premium',
  notificaciones_panel: 'premium',
  notificaciones_whatsapp: 'premium',
};

export function isValidPlan(plan) {
  return PLANS.includes(plan);
}

export function hasFeature(plan, feature) {
  const min = FEATURES[feature];
  if (!min || !isValidPlan(plan)) return false; // función desconocida = denegada
  return RANK[plan] >= RANK[min];
}

export function featuresFor(plan) {
  return Object.keys(FEATURES).filter((f) => hasFeature(plan, f));
}

export function requireFeature(restaurant, feature) {
  if (!hasFeature(restaurant?.plan, feature)) {
    throw new HttpError(403, 'Tu plan actual no incluye esta función.', { feature });
  }
}
