# MenúYa — Informe final

Fecha: 31/10/2026. Estado: listo para un piloto con restaurantes reales, con las salvedades de la sección 4.

## 1. Qué es
Plataforma multi-restaurante de menús digitales en pesos argentinos. Cada restaurante tiene su dirección pública `/<slug>`, un panel propio y planes Básico, Profesional y Premium. Las altas, los planes y los pagos los maneja el administrador a mano (no hay registro público ni cobro online).

Hosting gratuito: Cloudflare Pages + Functions, Supabase (Postgres, Auth, Storage) y GitHub Actions (una consulta cada 3 días para que Supabase no pause el proyecto).

## 2. Qué incluye (por plan)
| Función | Básico | Profesional | Premium |
|---|---|---|---|
| Menú con categorías, productos, fotos, logo, QR | Sí | Sí | Sí |
| Borrador / publicar (los clientes ven solo lo publicado) | Sí | Sí | Sí |
| Plantillas básicas y color destacado | Sí | Sí | Sí |
| Plantillas extra, colores de fondo/texto, tipografía, estilo de tarjeta | — | Sí | Sí |
| Portada como fondo del encabezado | — | Sí | Sí |
| Colores del nombre, promociones, categorías, precio y burbuja de platos | — | Sí | Sí |
| Destacados, promociones, carrito con envío por WhatsApp | — | Sí | Sí |
| Métodos de pago visibles (efectivo, débito, crédito, combinado) | Sí | Sí | Sí |
| Pedidos nativos, mesas con QR, estados, estadísticas, abierto/pausado/cerrado | — | — | Sí |
| Editor de fotos (encuadre y zoom) | Sí | Sí | Sí |

Administración: crear restaurante e invitar propietario, cambiar plan, suspender/reactivar, registrar pagos, generar enlaces de invitación/recuperación, **cambiar el correo del propietario**, **eliminar un restaurante** (con confirmación), registro de actividad.

## 3. Seguridad (cómo está resuelta)
- **Aislamiento entre restaurantes:** el servidor toma el restaurante de la sesión, nunca de lo que envía el navegador; toda consulta filtra por restaurante y un id ajeno responde 404. La base lo refuerza con RLS (solo el servidor escribe; un dueño solo lee lo suyo; el visitante anónimo no accede a nada).
- **Planes en el servidor:** lo que el plan no incluye se rechaza con 403 aunque se manipule la pantalla; lo publicado se recalcula con el plan vigente (si baja de plan, no queda nada de más).
- **Precios de pedidos:** siempre salen del último menú publicado, no de lo que manda el cliente.
- **Imágenes:** solo JPG/PNG/WebP, hasta 2 MB, validadas por tipo declarado y firma real del archivo en el servidor.
- **Navegador:** CSP estricta (sin scripts ni estilos en línea), HSTS, sin permitir iframes.
- **Anti-abuso básico:** campo trampa, máximo de pedidos pendientes por teléfono/mesa y por restaurante.
- **Privacidad:** los datos personales de los pedidos se borran a los 90 días (sección 4 sobre cómo verificarlo).
- Sin secretos en el código; las claves viven solo en las variables de Cloudflare.

## 4. Qué está verificado y qué no
**Automatizado (se re-ejecuta con `npm test` y `node test/e2e/navegador.mjs`):**
- 106 pruebas: planes, validaciones, administración (incluye cambio de correo y eliminación), propietario, diseño y colores, QR, WhatsApp, pedidos, métodos de pago y que **todas** las rutas `/owner/*` y `/admin/*` exijan sesión (401 sin token).
- 52 comprobaciones en un Chromium real contra un servidor simulado y la CSP real: flujo del propietario, menú público, carrito, pedidos con mesa, cola, estadísticas, editor de fotos (se decodifican las imágenes subidas y se comprueban sus medidas), portada detrás del logo y colores aplicados. Sin errores de consola ni de CSP.

**Contra Postgres real, ejecutado por vos:** `supabase/tests/aislamiento.sql` (resultado: AISLAMIENTO OK). Migraciones aplicadas por vos hasta la 0006, con el sistema funcionando en producción.

**Probado por vos a mano en producción:** catálogo, imágenes, publicar, diseño, portada, QR, destacados, promociones, WhatsApp, pedidos con mesas, métodos de pago, editor de fotos, portada como fondo, cambio de correo y eliminación en el panel de administración (según tu confirmación "funciona").

**Sin verificar todavía (pendiente tuyo):**
1. Migración `0007` (borrado a los 90 días) y la sección 8 de `supabase/tests/pedidos.sql`: no se pudieron correr fuera de Supabase. Ejecutalos y verificá `PEDIDOS OK`. Confirmá en Database → Cron que la tarea `purge_customer_data` exista.
2. `pedidos.sql` completo contra la base real (la confirmación de `PEDIDOS OK` no llegó).
3. Cambio de correo y eliminación contra Supabase Auth/Storage reales con datos reales: se probaron con simulación y con clics en el panel. Antes de borrar un cliente real, revisá en Supabase (Authentication y Storage) que desapareció su usuario y su carpeta de imágenes.
4. Uso con dedos en celulares reales (Android/iPhone): el arrastre del editor usa eventos de puntero y el zoom es solo con deslizador.
5. Carga: no se probó con muchos restaurantes o pedidos simultáneos.

## 5. Límites conocidos (decíselo al cliente antes de vender)
- **Sin avisos por WhatsApp ni correo:** los pedidos se ven en el panel, que se actualiza cada 15 segundos y avisa **solo con el panel abierto**.
- **Sin pagos online:** el cliente elige cómo pagará, pero el cobro se hace en el local o por fuera.
- **El carrito de Profesional/Premium sin pedidos nativos solo arma el mensaje de WhatsApp;** no crea pedidos en el sistema.
- **Personalización del QR (color/rótulo)** se hace en el navegador; el plan no se exige en el servidor.
- **Contraste del nombre sobre la portada:** no se valida (la portada puede ser cualquier foto).
- **Anti-abuso básico, no antifraude:** se recomienda una regla de Rate Limiting de Cloudflare sobre `/api/*`.
- **Sin copias de seguridad automáticas** en el plan gratuito de Supabase: exportá la base periódicamente hasta que pases a un plan pago.
- **Textos legales no incluidos:** términos y política de privacidad los tenés que redactar con un profesional; la Ley 25.326 puede exigir inscribir la base de datos.
- El borrado a los 90 días no alcanza a los mensajes que el cliente envió por WhatsApp.

## 6. Entregables
Código completo (`server/`, `public/`, `functions/`), 7 migraciones versionadas (`supabase/migrations/`), pruebas (`test/`, `supabase/tests/`), flujo de keepalive (`.github/workflows/`), `README.md` con la puesta en marcha paso a paso, `.env.example` y el manual `MANUAL-OPERACION.md`.
