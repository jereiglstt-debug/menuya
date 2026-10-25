// Página de invitación / recuperación: Supabase redirige aquí con el token
// de sesión temporal en el fragmento (#access_token=...). Nunca viaja al servidor.
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.hash.slice(1));
const token = params.get('access_token');
history.replaceState(null, '', location.pathname); // ocultar el token de la barra y del historial

function fail(msg) { const e = $('error'); e.textContent = msg; e.classList.remove('hidden'); }

if (!token) {
  $('form').classList.add('hidden');
  fail(params.get('error_code') === 'otp_expired'
    ? 'Este enlace venció o ya fue usado. Pedile al administrador uno nuevo.'
    : 'El enlace no es válido. Abrilo desde el mensaje que recibiste o pedí uno nuevo.');
} else {
  const cfg = await (await fetch('/api/config')).json();
  $('form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    $('error').classList.add('hidden');
    const pw = $('pw').value;
    if (pw.length < 10) return fail('La contraseña debe tener al menos 10 caracteres.');
    if (pw !== $('pw2').value) return fail('Las contraseñas no coinciden.');
    $('go').disabled = true;
    const res = await fetch(`${cfg.supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: { apikey: cfg.supabaseAnonKey, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    if (!res.ok) {
      $('go').disabled = false;
      const d = await res.json().catch(() => ({}));
      return fail(/weak|short|least/i.test(d.msg || '')
        ? 'Esa contraseña es demasiado débil. Probá con una más larga.'
        : 'No pudimos guardar la contraseña. El enlace pudo haber vencido: pedí uno nuevo.');
    }
    const me = await fetch('/api/me', { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => ({}));
    $('form').classList.add('hidden');
    $('intro').textContent = '¡Listo! Tu contraseña quedó guardada.';
    const a = document.createElement('a');
    a.className = 'btn primary';
    a.href = me.role === 'admin' ? '/admin/' : '/panel/';
    a.textContent = 'Ir a mi panel';
    $('ok').append(a);
    $('ok').classList.remove('hidden');
  });
}
