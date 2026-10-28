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
