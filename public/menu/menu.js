import { h } from '/shared/core.js';
import { renderMenu } from '/menu/render.js';

const root = document.getElementById('root');
const slug = location.pathname.replace(/^\/+|\/+$/g, '');
const msg = (t, d) => root.replaceChildren(h('main', { class: 'm-msg' }, h('h1', {}, t), h('p', {}, d)));

try {
  const res = await fetch(`/api/public/menu/${encodeURIComponent(slug)}`);
  if (res.status === 404) msg('Menú no disponible', 'Este menú no existe o todavía no fue publicado.');
  else if (!res.ok) msg('No pudimos cargar el menú', 'Probá de nuevo en unos minutos.');
  else {
    const data = await res.json();
    document.title = data.title;
    const el = renderMenu(data);
    root.replaceChildren(el);
    // El fondo del diseño cubre toda la pantalla, no solo la columna del menú.
    document.documentElement.style.setProperty('background', el.style.getPropertyValue('--m-bg'));
  }
} catch {
  msg('Sin conexión', 'Revisá tu conexión a internet y volvé a intentar.');
}
