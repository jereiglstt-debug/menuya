# Arquitectura (Etapa 1)

## Stack y por qué
| Capa | Servicio | Motivo / límite gratuito verificado |
|---|---|---|
| Frontend + API | Cloudflare Pages + Pages Functions | Archivos estáticos ilimitados. Las Functions cuentan como Workers: **100.000 solicitudes/día**, 10 ms de CPU por invocación. Sin tarjeta. |
| Base de datos + Auth + Imágenes | Supabase (Postgres, Auth, Storage) | 500 MB de base, 1 GB de archivos*, 5 GB de transferencia, 50.000 usuarios activos, 2 proyectos. Sin tarjeta. |
| Anti-pausa | GitHub Actions (cron) | Ver abajo. |

\* Las fuentes consultadas difieren entre 500 MB y 1 GB de almacenamiento de archivos. Confirmalo en tu panel de Supabase al crear el proyecto.

**Limitación crítica:** los proyectos gratuitos de Supabase **se pausan tras 7 días sin actividad** (los datos se conservan; la app queda caída hasta reactivarlo a mano). Mitigación incluida: `.github/workflows/keepalive.yml` consulta `/api/health` cada 3 días, y esa ruta hace una consulta real a la base. Es una mitigación, no una garantía: si GitHub deshabilita el workflow por inactividad del repositorio o falla, el proyecto podría pausarse. Para uso comercial serio conviene el plan Pro de Supabase (decisión tuya; no se contrata nada automáticamente).

Cloudflare R2 (alternativa de imágenes) se descartó: según lo verificado antes, exige cargar un medio de pago para activarse.

## Decisiones de diseño
- **Autenticación:** Supabase Auth gestiona hash de contraseñas, sesiones y límites de intentos. No se manejan contraseñas en el servidor propio (además, el hash costoso no cabría en 10 ms de CPU).
- **Sin contraseñas por mensaje:** altas e invitaciones usan enlaces de un solo uso (`generate_link`). El administrador los copia y los envía; no se guardan ni se auditan. Esto evita depender del correo de Supabase, muy limitado en el plan gratuito.
- **Multi-tenant:** una sola base; cada tabla de negocio lleva `restaurant_id`.
- **Doble barrera de seguridad:** (1) el servidor usa `service_role` y por eso **siempre** deriva el restaurante de la sesión, nunca de un parámetro del cliente; (2) RLS activado en todas las tablas, sin escritura para `anon`/`authenticated`.
- **Permisos por plan:** una sola tabla (`server/lib/plans.js`), verificada en el servidor con `requireFeature()`.
- **Slug inmutable:** un trigger impide cambiarlo, para no romper QR impresos.
- **Estado de cuenta derivado:** "vencida" se calcula por fecha; nunca queda desactualizado. Un restaurante vencido NO se suspende solo: la suspensión es decisión tuya.
- **Pago atómico:** `admin_register_payment` crea suscripción + pago + cambio de plan + auditoría en una transacción.

## Modelo de datos
**Etapa 2 (ya creado, migración 0001):** `platform_admins`, `restaurants`, `restaurant_owners`, `subscriptions`, `payments`, `audit_log`, vista `restaurant_account_state`.

**Etapas 3 y 4 (pendientes, migraciones 0002+):** `categories`, `products`, `product_images`, `menu_designs`, `menu_drafts`, `menu_versions` (publicación por instantánea con función transaccional), `tables`, `orders`, `order_items` (con nombre y precio históricos), `order_status_history`, `delivery_settings`, `payment_methods`, `whatsapp_settings`, `notifications`, secuencia de número de pedido por restaurante.
