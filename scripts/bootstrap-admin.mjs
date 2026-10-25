#!/usr/bin/env node
// Crea la cuenta del administrador principal SIN contraseña predeterminada.
// El script genera un enlace de invitación de un solo uso: abrilo y elegí
// tu propia contraseña. Ninguna contraseña pasa por variables ni archivos.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SITE_URL=... \
//   ADMIN_EMAIL=vos@correo.com node scripts/bootstrap-admin.mjs
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL, ADMIN_EMAIL } = process.env;
for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL, ADMIN_EMAIL })) {
  if (!v) { console.error(`Falta la variable ${k}.`); process.exit(1); }
}
const base = SUPABASE_URL.replace(/\/$/, '');
const headers = { apikey: SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json' };

const existing = await fetch(`${base}/rest/v1/platform_admins?select=user_id&limit=1`, { headers });
if (!existing.ok) { console.error('No se pudo consultar la base. ¿Aplicaste la migración 0001?'); process.exit(1); }
if ((await existing.json()).length) {
  console.error('Ya existe un administrador. Este script solo sirve para el primer ingreso.');
  console.error('Para recuperar el acceso usá "Olvidé mi contraseña" en Supabase Auth o generá un enlace de recuperación desde el panel de Supabase.');
  process.exit(1);
}

const gen = await fetch(`${base}/auth/v1/admin/generate_link`, {
  method: 'POST', headers,
  body: JSON.stringify({ type: 'invite', email: ADMIN_EMAIL.trim().toLowerCase(), redirect_to: `${SITE_URL}/establecer-contrasena.html` }),
});
const out = await gen.json();
if (!gen.ok) { console.error('No se pudo generar la invitación:', out.msg || out.message || gen.status); process.exit(1); }

const ins = await fetch(`${base}/rest/v1/platform_admins`, { method: 'POST', headers, body: JSON.stringify({ user_id: out.id }) });
if (!ins.ok) {
  await fetch(`${base}/auth/v1/admin/users/${out.id}`, { method: 'DELETE', headers });
  console.error('No se pudo registrar al administrador; se deshizo la operación.'); process.exit(1);
}
console.log('\nAdministrador creado. Abrí este enlace (un solo uso) para elegir tu contraseña:\n');
console.log(out.action_link, '\n');
console.log('No compartas ni guardes este enlace. Después ingresá en:', `${SITE_URL}/admin/`);
