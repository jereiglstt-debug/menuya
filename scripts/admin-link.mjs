#!/usr/bin/env node
// Genera un enlace de un solo uso para que un ADMINISTRADOR EXISTENTE elija
// (o restablezca) su contraseña. Solo funciona para correos registrados como
// administradores; no imprime nada para cualquier otro correo.
//
// Uso (mismas variables que bootstrap-admin.mjs):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL, ADMIN_EMAIL
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL, ADMIN_EMAIL } = process.env;
for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL, ADMIN_EMAIL })) {
  if (!v) { console.error(`Falta la variable ${k}.`); process.exit(1); }
}
if (/TU-PROYECTO|xxxx/i.test(SITE_URL)) { console.error('SITE_URL todavía tiene el texto de ejemplo. Usá la dirección real de tu sitio (https://....pages.dev).'); process.exit(1); }
let base, site;
try { base = new URL(SUPABASE_URL.trim()).origin; site = new URL(SITE_URL.trim()).origin; }
catch { console.error('SUPABASE_URL o SITE_URL no son URLs válidas.'); process.exit(1); }

const headers = { apikey: SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' };
if (SUPABASE_SERVICE_ROLE_KEY.split('.').length === 3) headers.authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
const email = ADMIN_EMAIL.trim().toLowerCase();
const redirect_to = `${site}/establecer-contrasena.html`;

async function gen(type) {
  const res = await fetch(`${base}/auth/v1/admin/generate_link`, { method: 'POST', headers, body: JSON.stringify({ type, email, redirect_to }) });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}
let r = await gen('recovery');
if (!r.ok) r = await gen('invite'); // por si nunca llegó a aceptar la invitación
if (!r.ok) { console.error(`No se pudo generar el enlace (HTTP ${r.status}): ${r.data.msg || r.data.message || ''}`); process.exit(1); }

const chk = await fetch(`${base}/rest/v1/platform_admins?select=user_id&user_id=eq.${encodeURIComponent(r.data.id)}`, { headers });
const rows = chk.ok ? await chk.json() : [];
if (!rows.length) { console.error('Ese correo no pertenece a un administrador. No se muestra ningún enlace.'); process.exit(1); }

console.log('\nAbrí este enlace (un solo uso, vence en poco tiempo) para elegir tu contraseña:\n');
console.log(r.data.action_link, '\n');
console.log('Después ingresá en:', `${site}/admin/`);
