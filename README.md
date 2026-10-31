# MenúYa — menús digitales multi-restaurante

**Estado: Etapas 1 y 2 desplegadas y verificadas en producción. Etapa 3 (primera tanda: panel del propietario, catálogo, imágenes, borrador/publicación, menú público) construida y probada con pruebas simuladas; falta verificarla en el entorno real.** Pendientes: diseño/plantillas y QR (Etapa 3, tanda 2), WhatsApp y carrito (Etapa 4), pedidos Premium (Etapa 4).

## Qué funciona (probado con pruebas automatizadas simuladas)
Autorización de admin, creación de restaurante con invitación segura y rollback, slug único e inmutable, cambio de plan, suspensión, registro de pagos, auditoría, validaciones, permisos por plan. `npm test` → 26 pruebas.

## Qué NO está verificado
Todo lo que depende de servicios reales: RLS en Supabase real, formato exacto de respuestas de GoTrue/PostgREST, el panel en un navegador, despliegue y HTTPS. Las pruebas usan un Supabase simulado construido a partir de la documentación.

## Despliegue (≈20 min, todo gratuito, sin tarjeta)
1. **Supabase**: crear cuenta y un proyecto en supabase.com. Elegí una contraseña de base larga y guardala.
2. En *SQL Editor* pegá y ejecutá `supabase/migrations/0001_plataforma.sql`.
3. En *Authentication → Providers → Email*: desactivá "Allow new users to sign up" (**imprescindible: evita el registro público**) y subí la longitud mínima de contraseña a 10.
4. En *Authentication → URL Configuration*: agregá `https://TU-PROYECTO.pages.dev/establecer-contrasena.html` a *Redirect URLs* (y ponelo también como Site URL).
5. En *Project Settings → API Keys* copiá: Project URL, la clave **publishable** (`sb_publishable_...`, o `anon`) y la clave **secret** (`sb_secret_...`, o `service_role`). Ambos tipos de clave funcionan. Variables: `SUPABASE_ANON_KEY` = la publishable, `SUPABASE_SERVICE_ROLE_KEY` = la secret.
6. **GitHub**: subí esta carpeta a un repositorio (el `.gitignore` ya excluye secretos).
7. **Cloudflare**: Workers & Pages → Create → Pages → conectar el repositorio. Build command: vacío. Output directory: `public`.
8. En el proyecto de Pages → *Settings → Variables and secrets*, agregá: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (como **Secret**) y `SITE_URL` (la URL `.pages.dev` final). Volvé a desplegar.
9. **Primer administrador** (en tu computadora, con Node 20+):
   ```
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SITE_URL=https://TU-PROYECTO.pages.dev \
   ADMIN_EMAIL=vos@correo.com node scripts/bootstrap-admin.mjs
   ```
   **Windows:** esa sintaxis solo sirve en Mac/Linux. En PowerShell usá `$env:SUPABASE_URL="..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."; $env:SITE_URL="..."; $env:ADMIN_EMAIL="..."; node scripts/bootstrap-admin.mjs`.
   Abre el enlace que imprime, elegí tu contraseña y entrá en `/admin/`. No hay contraseña predeterminada.
   Si el enlace no funcionó o ya se usó, generá otro con `node scripts/admin-link.mjs` (mismas variables). `SITE_URL` debe ser tu dirección real, nunca el texto de ejemplo.
10. **Anti-pausa**: en GitHub → Settings → Secrets → Actions, creá `SITE_URL`. El workflow `keepalive` se ejecuta solo.
11. Recomendado: en Cloudflare → Security → WAF, una regla de *Rate limiting* sobre `/api/*` (el plan gratuito incluye una).

## Uso diario
*Nuevo restaurante* → completar nombre, dirección, correo y plan → copiar el enlace de invitación y enviárselo al propietario → registrar pagos en su ficha (esto fija plan y vigencia).

## Desarrollo local
`cp .env.example .dev.vars`, completar, `npm install`, `npm run dev`, `npm test`.


## Etapa 3 (primera tanda): cómo activarla
1. **Base de datos:** en el SQL Editor de Supabase pegá y ejecutá `supabase/migrations/0002_catalogo.sql` completo. Debe terminar sin errores en rojo.
2. **Almacenamiento:** en *Storage* debe aparecer un bucket llamado `menu-images` (la migración lo crea). Si no aparece, creálo a mano como *Public* con límite de 2 MB y tipos `image/jpeg, image/png, image/webp`.
3. **Verificar aislamiento:** pegá y ejecutá `supabase/tests/aislamiento.sql`. Tiene que terminar mostrando `AISLAMIENTO OK`. No deja datos (hace rollback).
4. **Desplegar:** subí los archivos nuevos a GitHub; Cloudflare despliega solo. No hay variables nuevas.
5. **Probar:** entrá a `/panel/` con la cuenta de un propietario de prueba, creá una categoría y un producto con foto, mirá la *Vista previa*, tocá *Publicar cambios* y abrí `/<direccion-del-local>`.

## Etapa 3 (segunda tanda): diseño y código QR — cómo activarla

1. En Supabase → SQL Editor, pegá y ejecutá `supabase/migrations/0003_diseno.sql` (agrega `design` y `cover_path` y actualiza `publish_menu`). Debe decir "Success".
2. Subí los archivos a GitHub (rama `main`) y esperá el deploy nuevo en Cloudflare. **No uses "Retry deployment" en deploys viejos.**
3. En el panel aparecen las pestañas **Menú · Diseño · Código QR**.

Qué se aplica en el servidor (probado con tests automáticos): plantillas por plan, colores/tipografía/tarjetas/portada solo Profesional+, contraste mínimo, saneo al bajar de plan, limpieza de portadas reemplazadas.
Qué NO puede imponer el servidor: los colores y el texto del QR se dibujan en el navegador; el plan solo se refleja en la interfaz. El QR en sí solo contiene la URL pública.
Sin verificar por mí: el aspecto visual real en navegador, `0003_diseno.sql` en Postgres real, y el escaneo con tu celular.

## Etapa 4 (primera tanda): destacados, promociones, carrito y WhatsApp — cómo activarla

1. Ejecutá `supabase/migrations/0004_destacados_promos_whatsapp.sql` en el SQL Editor de Supabase.
2. Subí los archivos a GitHub (`main`) y esperá el deploy nuevo (sin "Retry deployment" en deploys viejos).
3. En el panel: cargá el WhatsApp en **Tu negocio**; las **Promociones** tienen su pestaña; el “Producto destacado” está en el formulario de producto.

| Función | Plan | Dónde se exige |
|---|---|---|
| Botón “Consultar por WhatsApp” (mensaje preparado) | Básico+ | servidor (nunca se muestra sin número) |
| Productos destacados | Profesional+ | servidor (403 al marcar) y al mostrar |
| Promociones visuales (hasta 10, solo texto) | Profesional+ | servidor (403) y al mostrar |
| Carrito + mensaje de pedido organizado | Profesional+ | al mostrar el menú (requiere WhatsApp cargado) |

Importante y honesto: el carrito **no crea pedidos** en la plataforma. Arma un texto y abre WhatsApp; el local lo confirma. Los precios del mensaje son los del menú publicado que vio el cliente. Los pedidos nativos, mesas y delivery son de Premium y vienen en la siguiente tanda.
Las promociones no cambian precios (son banners de texto) y se ordenan por antigüedad.

Cómo se probó: tests automáticos (`npm test`), más `node test/e2e/navegador.mjs` (Chromium real, CSP de producción, servidor simulado). No verificado: `0004` en Postgres real, ni que WhatsApp abra bien en tu celular.

## Etapa 4 (segunda tanda): pedidos nativos — Plan Premium — cómo activarla

1. En Supabase → SQL Editor ejecutá `supabase/migrations/0005_pedidos.sql` (Success).
2. **Verificación real de la base (recomendado):** pegá `supabase/tests/pedidos.sql` en el SQL Editor. Debe terminar en `PEDIDOS OK`. (Se deshace solo; no deja datos.) Si da error, copiame el mensaje.
3. Subí los archivos a GitHub (`main`) y esperá el deploy nuevo (sin "Retry deployment" en deploys viejos).
4. En el panel de un restaurante **Premium**: pestaña **Pedidos → Mesas** (crear), **Ajustes** (tipos de pedido y envío; los medios de pago están en la pestaña **Métodos de pago**) y botón **Abrir** arriba. Los QR por mesa se descargan en **Código QR**.

### Qué hace
- Cliente: arma el pedido en el menú, elige **Mesa** (solo si entró por el QR de una mesa), **Take Away** o **Delivery**, y sigue el estado en su pantalla (se actualiza cada 10 s).
- Dueño: **cola** de pedidos (nuevo → en preparación → listo → entregado, o cancelado), historial de estados, **mesas**, **estado abierto / pausado / cerrado**, **estadísticas básicas** (pedidos, entregados, ventas entregadas, ticket promedio, por tipo, por día, productos más pedidos).
- Avisos de pedido nuevo: **solo dentro del panel y mientras esté abierto** (consulta cada 15 s; insignia en la pestaña, aviso y sonido opcional).

### Reglas que aplica el servidor (probadas con tests automáticos)
- Solo Premium crea o recibe pedidos; si un local baja de plan, deja de aceptarlos y desaparece del menú.
- **Los precios salen del menú PUBLICADO**, no del navegador. Productos agotados o que ya no existen se rechazan.
- Estado del local: `cerrado` (por defecto) o `pausado` → 409; el menú se sigue viendo.
- Mesa: debe ser una mesa activa del mismo local. Las mesas con pedidos no se borran, se **archivan** (su QR deja de funcionar).
- Transiciones de estado válidas (no se salta pasos; entregado y cancelado son finales), validadas también en la base.
- El seguimiento se consulta con un código largo y aleatorio y **no devuelve nombre, teléfono ni dirección**.
- Aislamiento entre locales: todo se filtra por el restaurante de la sesión; ids ajenos dan 404.

### Lo que NO hace (dicho con honestidad)
- **No cobra online.** El pago es en el local o al recibir (efectivo, débito, crédito o combinado; ver más abajo); la plataforma solo registra qué eligió el cliente.
- **No envía avisos por WhatsApp.** La notificación automática por WhatsApp exige la API oficial de WhatsApp Business (con aprobación y costo de Meta); no es gratis, así que no la implementé ni la muestro como si existiera. El plan lista `notificaciones_whatsapp` pero no tiene función detrás.
- **Anti-abuso básico, no antifraude:** campo trampa, tope de 3 pedidos pendientes por teléfono/mesa y 100 por local. Para más protección recomiendo una regla de *Rate Limiting* en Cloudflare para `/api/public/orders/*`.
- **Datos personales:** los pedidos guardan nombre, teléfono y dirección del cliente. Todavía no hay borrado automático por antigüedad; hay que definir un plazo (por ejemplo 90 días) y agregarlo. Decisión pendiente tuya.
- El estado del cliente se actualiza consultando cada 10 s (no hay conexión en tiempo real).
- Los días de las estadísticas se agrupan en horario de Argentina.

### Cómo se probó
- `npm test`: automáticos con una base simulada en memoria (las funciones SQL reimplementadas en JS).
- `node test/e2e/navegador.mjs`: Chromium real contra el servidor simulado, con el CSP de producción: pedido del cliente, errores por campo, cola con aviso por sondeo, cambio de estado, seguimiento, pausa, mesas, QR por mesa, estadísticas.
- QR de mesa decodificado con OpenCV.
- **No verificado por mí:** `0005_pedidos.sql` y `pedidos.sql` en un Postgres real (los corrés vos), el comportamiento en celulares reales, y la carga con muchos pedidos.


## Métodos de pago (migración 0006) — todos los planes

1. Ejecutá `supabase/migrations/0006_metodos_pago.sql` en el SQL Editor (después de la 0005).
2. Volvé a pegar `supabase/tests/pedidos.sql` (ahora también verifica pagos combinados); debe decir `PEDIDOS OK`.
3. Subí los archivos a GitHub (`main`) y esperá el deploy (sin "Retry deployment" en deploys viejos).

**Qué hace:** nueva pestaña **Métodos de pago** en el panel de **todos** los planes (al final de la barra de pestañas). El local elige entre **Efectivo, Tarjeta de débito, Tarjeta de crédito y Combinado**; si habilita “Combinado” elige **cuáles se pueden combinar** (al menos dos). Es configuración **en vivo**: se aplica al guardar, sin publicar.
- **Básico y Profesional:** los medios elegidos se muestran al pie del menú público (informativo).
- **Premium:** además son las opciones que ve el cliente al pedir (por mesa, Take Away o Delivery). Con “Combinado” el cliente marca cuáles usa (mínimo dos, solo entre las habilitadas). En mesa, elegir el pago es opcional (se puede definir al final); en Take Away y Delivery es obligatorio. El servidor valida todo y la cola del dueño muestra, por ejemplo, “Combinado (Efectivo + Tarjeta de débito)”.
- No cobra online: solo informa y registra la elección.

**Cambios respecto de la versión anterior (importante):** la lista pasó a ser exactamente la que pediste, por lo que **“Transferencia” ya no es una opción**. Lo que había configurado se migra solo: “Tarjeta” pasa a Débito + Crédito, y si un local quedaba sin nada queda en Efectivo. Los pedidos ya hechos conservan su medio original. Si querés sumar Transferencia u otro medio, es un cambio chico.
Un local que nunca configuró nada: no muestra medios en el menú y, si es Premium, sus pedidos aceptan solo Efectivo hasta que configure.

**Cómo se probó:** tests automáticos (`npm test`: validación, combinaciones, planes, aislamiento, cambios en vivo) y navegador real (`node test/e2e/navegador.mjs`: pestaña en Básico y Premium, error de combinado con menos de dos, pedido por mesa con combinado, y la cola mostrándolo). **No verificado por mí:** la migración 0006 y `pedidos.sql` en un Postgres real.

## Etapa 4d — Editor de fotos, portada como fondo y administración

No requiere migración nueva. Subí los archivos a `main`, esperá el deploy de Cloudflare y recargá con Ctrl+Shift+R (o ventana privada).

- **Editor de fotos** (`public/panel/recorte.js`): al elegir logotipo, foto de un plato o portada se abre un editor para encuadrar (arrastrar) y cambiar el tamaño (zoom). La imagen se recorta y comprime en el navegador (logo 600×600, plato 900×900, portada 1280×640) y se sube igual que antes; el servidor sigue validando tipo, firma real y 2 MB. Si cancelás, no se sube nada. Se puede mover con el teclado (flechas, + y −).
- **Portada**: ahora es el fondo del encabezado, detrás del logo y del nombre (con una capa oscura para que se lea el texto). Sin portada, el encabezado queda como antes.
- **Administrador → Cambiar correo** (`PATCH /api/admin/restaurants/:id/owner-email`): cambia el correo de la cuenta del propietario (queda confirmado) y el registrado en el sistema. La contraseña no cambia; si no la recuerda, generá un enlace de “Recuperación”. Queda auditado (correo anterior y nuevo).
- **Administrador → Eliminar restaurante** (`DELETE /api/admin/restaurants/:id`): hay que escribir la dirección (slug) para confirmar. Borra menú, versiones, pedidos, mesas, pagos, las imágenes del almacenamiento y la cuenta del propietario (nunca una cuenta de administrador). Es irreversible. Queda un registro de auditoría con nombre, dirección y propietario.

Verificado: 99 pruebas automáticas (`npm test`), prueba de navegador `node test/e2e/navegador.mjs` (recorte con dimensiones reales de lo subido, portada detrás de logo/nombre, sin errores de CSP) y prueba de navegador del panel admin contra una API simulada.
No verificado: borrado real de usuarios/imágenes y cambio de correo contra Supabase real (el servidor usa los endpoints admin de GoTrue/Storage, probados solo con simulación), y comportamiento con dedos en teléfonos reales (el arrastre usa eventos de puntero; el zoom es con el control deslizante, sin pellizco).
