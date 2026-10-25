-- =====================================================================
-- Migración 0001 — Núcleo de la plataforma (multi-tenant)
-- Administradores, restaurantes, propietarios, suscripciones, pagos
-- registrados a mano y auditoría.
--
-- Modelo de seguridad:
--  * Toda escritura pasa por las funciones de servidor con la clave
--    service_role. Los roles anon/authenticated NO escriben nada.
--  * RLS está activado en todas las tablas como defensa en profundidad:
--    un propietario solo puede LEER su propio restaurante.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- utilidades ------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- administradores de plataforma -----------------------------
create table public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

-- ---------- restaurantes ----------------------------------------------
create table public.restaurants (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 500),
  plan        text not null default 'basico'
              check (plan in ('basico','profesional','premium')),
  status      text not null default 'activo'
              check (status in ('activo','suspendido')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- 3 a 40 caracteres, minúsculas/números/guiones, sin guion al inicio o fin
  constraint slug_formato check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$'),
  constraint slug_sin_guiones_dobles check (slug !~ '--'),
  constraint slug_no_reservado check (slug not in (
    'admin','api','panel','login','logout','assets','static','app','www',
    'mesa','menu','pedido','pedidos','establecer-contrasena','recuperar',
    'health','favicon','robots','sitemap','soporte','ayuda'
  ))
);

create trigger restaurants_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();

-- El slug es inmutable: los QR impresos apuntan a él y no deben romperse.
create or replace function public.restaurants_slug_inmutable()
returns trigger language plpgsql as $$
begin
  if new.slug is distinct from old.slug then
    raise exception 'La dirección URL (slug) de un restaurante no se puede cambiar.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger restaurants_slug_inmutable before update on public.restaurants
  for each row execute function public.restaurants_slug_inmutable();

-- ---------- propietarios (uno por restaurante) ------------------------
create table public.restaurant_owners (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  email         text not null check (email = lower(email)),
  created_at    timestamptz not null default now()
);

-- ---------- suscripciones y pagos manuales ----------------------------
-- Una fila por período contratado. El estado "vencida" se deriva de la
-- fecha: no se guarda para que nunca quede desactualizado.
create table public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  plan          text not null check (plan in ('basico','profesional','premium')),
  starts_on     date not null,
  expires_on    date not null,
  created_at    timestamptz not null default now(),
  constraint periodo_valido check (expires_on >= starts_on)
);
create index subscriptions_restaurant_idx on public.subscriptions (restaurant_id, expires_on desc);

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  amount_ars      numeric(12,2) not null check (amount_ars >= 0),
  paid_on         date not null,
  method          text not null default 'otro'
                  check (method in ('efectivo','transferencia','otro')),
  note            text not null default '' check (char_length(note) <= 300),
  recorded_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index payments_restaurant_idx on public.payments (restaurant_id, paid_on desc);

-- ---------- auditoría ---------------------------------------------------
create table public.audit_log (
  id            bigint generated always as identity primary key,
  actor_id      uuid references auth.users(id) on delete set null,
  action        text not null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  details       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- ---------- vista de estado de cuenta ----------------------------------
-- estado_cuenta: suspendido | sin_suscripcion | vencido | activo
create or replace view public.restaurant_account_state
with (security_invoker = true) as
select
  r.id as restaurant_id,
  case
    when r.status = 'suspendido' then 'suspendido'
    when s.expires_on is null then 'sin_suscripcion'
    when s.expires_on < current_date then 'vencido'
    else 'activo'
  end as estado_cuenta,
  s.expires_on as vence_el
from public.restaurants r
left join lateral (
  select expires_on from public.subscriptions
  where restaurant_id = r.id
  order by expires_on desc limit 1
) s on true;

-- ---------- registrar pago: operación atómica ---------------------------
-- Crea la suscripción, el pago, aplica el plan y deja constancia en la
-- auditoría dentro de una sola transacción.
create or replace function public.admin_register_payment(
  p_actor      uuid,
  p_restaurant uuid,
  p_plan       text,
  p_amount     numeric,
  p_paid_on    date,
  p_method     text,
  p_note       text,
  p_starts_on  date,
  p_expires_on date
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_sub uuid;
  v_pay uuid;
begin
  if not exists (select 1 from public.restaurants where id = p_restaurant) then
    raise exception 'Restaurante inexistente' using errcode = 'P0002';
  end if;

  insert into public.subscriptions (restaurant_id, plan, starts_on, expires_on)
  values (p_restaurant, p_plan, p_starts_on, p_expires_on)
  returning id into v_sub;

  insert into public.payments
    (restaurant_id, subscription_id, amount_ars, paid_on, method, note, recorded_by)
  values
    (p_restaurant, v_sub, p_amount, p_paid_on, p_method, coalesce(p_note, ''), p_actor)
  returning id into v_pay;

  update public.restaurants set plan = p_plan where id = p_restaurant;

  insert into public.audit_log (actor_id, action, restaurant_id, details)
  values (p_actor, 'pago_registrado', p_restaurant, jsonb_build_object(
    'payment_id', v_pay, 'plan', p_plan, 'amount_ars', p_amount,
    'starts_on', p_starts_on, 'expires_on', p_expires_on));

  return v_pay;
end $$;

revoke all on function public.admin_register_payment(uuid,uuid,text,numeric,date,text,text,date,date)
  from public, anon, authenticated;

-- ---------- RLS ---------------------------------------------------------
alter table public.platform_admins   enable row level security;
alter table public.restaurants       enable row level security;
alter table public.restaurant_owners enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.payments          enable row level security;
alter table public.audit_log         enable row level security;

-- Sin privilegios para anon; authenticated solo lectura (filtrada por RLS).
revoke all on all tables in schema public from anon, authenticated;
grant select on public.restaurants, public.restaurant_owners,
  public.subscriptions, public.restaurant_account_state to authenticated;
grant execute on function public.is_platform_admin() to authenticated;

create policy admins_ven_restaurantes on public.restaurants
  for select to authenticated using (public.is_platform_admin());
create policy propietario_ve_su_restaurante on public.restaurants
  for select to authenticated using (
    exists (select 1 from public.restaurant_owners o
            where o.restaurant_id = restaurants.id and o.user_id = auth.uid()));

create policy propietario_ve_su_registro on public.restaurant_owners
  for select to authenticated using (user_id = auth.uid() or public.is_platform_admin());

create policy admins_ven_suscripciones on public.subscriptions
  for select to authenticated using (public.is_platform_admin());
create policy propietario_ve_su_suscripcion on public.subscriptions
  for select to authenticated using (
    exists (select 1 from public.restaurant_owners o
            where o.restaurant_id = subscriptions.restaurant_id and o.user_id = auth.uid()));

-- platform_admins, payments y audit_log: sin políticas = nadie salvo
-- service_role (que ignora RLS) puede leerlas o escribirlas.
