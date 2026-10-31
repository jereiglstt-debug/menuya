# MenúYa — Manual de operación (administrador)

Panel de administración: `https://<tu-sitio>/admin/`. Entrá con tu cuenta de administrador.

## Dar de alta un restaurante
1. **Nuevo restaurante** → nombre, dirección (slug), plan y correo del propietario.
2. La dirección no se puede cambiar después (los QR impresos dejarían de funcionar): elegila bien.
3. Se muestra un **enlace de invitación de un solo uso**. Copialo y envíaselo vos al propietario (WhatsApp o correo). No se guarda: si se pierde, generá otro con "Invitación".
4. Registrá el primer pago (más abajo) para que figure como activo.

## Cobrar y renovar
- Registrar pago → plan, monto, fecha, método, vigencia (desde/hasta). El plan se actualiza solo.
- Estados: **activo**, **vencido** (pasó la vigencia), **sin suscripción**, **suspendido**.
- Un restaurante vencido **sigue funcionando** hasta que lo suspendas. Para cortar el servicio usá "Suspender": su menú y su panel dejan de funcionar; "Reactivar" lo devuelve.

## Cambiar plan
Elegí el plan y "Cambiar plan". Si baja de plan, lo que ya no incluye deja de mostrarse en el menú público (no se pierde: vuelve si sube otra vez).

## Acceso del propietario
- **Invitación:** si todavía no aceptó la primera invitación.
- **Recuperación:** si olvidó su contraseña.
- **Cambiar correo:** cuando cambia de mail. Su contraseña no cambia; si no la recuerda, generá "Recuperación" después.

## Eliminar un restaurante (irreversible)
"Zona peligrosa" → Eliminar → escribí la dirección. Borra menú, fotos, pedidos, mesas, pagos y la cuenta del propietario. Antes de hacerlo con un cliente real, ofrecele que se descargue lo que quiera. Después, comprobá en Supabase (Authentication y Storage) que no queden restos.

## Actualizar el sistema
1. Subí los archivos nuevos a GitHub (rama `main`).
2. Si hay migración nueva, ejecutala **antes** en Supabase → SQL Editor, en orden.
3. Esperá el despliegue en Cloudflare (puede tardar unos minutos en mostrarse). No uses "Retry deployment" en despliegues viejos.
4. Probá en ventana privada o con Ctrl+Shift+R.

## Si algo falla
- "Todo lo nuevo no aparece": caché del navegador → ventana privada.
- Despliegue que no llega: Cloudflare → Settings → Build (rama de producción `main` y despliegues automáticos activos).
- Supabase pausado: el flujo `keepalive` lo evita; si lo ves pausado, reanudalo desde el panel de Supabase.
- Un cliente no puede entrar: generá un enlace de "Recuperación".

## Rutina recomendada
- Semanal: mirar la pestaña **Actividad** y los vencimientos.
- Mensual: exportar una copia de la base (Supabase → Database → Backups o `pg_dump`) mientras estés en el plan gratuito.
- Activá la verificación en dos pasos en GitHub, Cloudflare y Supabase.
