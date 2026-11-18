-- =====================================================================
-- Migración 0009 — Cuentas corrientes de clientes (plan Premium)
--   * credit_accounts : clientes con cuenta corriente de cada restaurante
--                       (nombre, teléfono, código de 4 dígitos, límite opcional)
--   * credit_entries  : movimientos: "consumo" (suma deuda) y "pago" (resta).
--                       Nunca se borran: se ANULAN (voided_at) para dejar rastro.
--   * orders.credit_account_id + medio de pago 'cuenta_corriente'
--   * El medio de pago 'cuenta_corriente' se puede habilitar en
--     restaurant_payment_settings.methods
--   * create_order / set_order_status actualizados:
--       - al pasar un pedido a "en preparación" se carga su total a la cuenta
--       - si el pedido se cancela después, ese cargo se anula
--   * credit_balances(): saldo y última fecha por cuenta
-- Todas las escrituras las hace el servidor (service_role); el plan Premium se
-- exige en el servidor. No se cobra nada online: es solo un registro interno.
-- =====================================================================

create table public.credit_accounts (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 80),
  phone         text not null default '' check (char_length(phone) <= 20),
  code          text not null check (code ~ '^[0-9]{4}$'),
  credit_limit  numeric(12,2) check (credit_limit is null or (credit_limit >= 0 and credit_limit <= 100000000)),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint credit_accounts_id_restaurant_unique unique (id, restaurant_id),
  constraint credit_accounts_code_unique unique (restaurant_id, code)
);
create index credit_accounts_restaurant_idx on public.credit_accounts (restaurant_id, name);
create trigger credit_accounts_updated_at before update on public.credit_accounts
  for each row execute function public.set_updated_at();

create table public.credit_entries (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  account_id    uuid not null,
  kind          text not null check (kind in ('consumo','pago')),
  amount        numeric(12,2) not null check (amount > 0 and amount <= 100000000),
  description   text not null default '' check (char_length(description) <= 200),
  method        text check (method is null or method in ('efectivo','transferencia','debito','credito','otro')),
  occurred_on   date not null default ((now() at time zone 'America/Argentina/Buenos_Aires')::date),
  order_id      uuid,
  voided_at     timestamptz,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  foreign key (account_id, restaurant_id) references public.credit_accounts (id, restaurant_id) on delete cascade,
  foreign key (order_id, restaurant_id)   references public.orders (id, restaurant_id)
);
create index credit_entries_account_idx on public.credit_entries (account_id, occurred_on desc, created_at desc);
create index credit_entries_restaurant_idx on public.credit_entries (restaurant_id);
-- Un pedido se carga una sola vez a una cuenta.
create unique index credit_entries_order_once on public.credit_entries (order_id) where order_id is not null;

-- Pedidos: cuenta a la que se cargan y nuevo medio de pago.
alter table public.orders add column credit_account_id uuid;
alter table public.orders add constraint orders_credit_account_fk
  foreign key (credit_account_id, restaurant_id) references public.credit_accounts (id, restaurant_id);
alter table public.orders drop constraint orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('efectivo','transferencia','tarjeta','debito','credito','combinado','cuenta_corriente'));

-- Métodos de pago del local: se permite 'cuenta_corriente'. Se busca la restricción
-- vieja por su contenido (su nombre lo genera Postgres) y se reemplaza.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.restaurant_payment_settings'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%methods <@%'
  loop
    execute format('alter table public.restaurant_payment_settings drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.restaurant_payment_settings add constraint payment_settings_methods_check
  check (methods <@ array['efectivo','debito','credito','combinado','cuenta_corriente'] and cardinality(methods) >= 1);

-- create_order: igual que en 0006, más p_credit (cuenta del cliente, ya verificada por el servidor).
drop function public.create_order(uuid,text,uuid,text,text,text,text,text,numeric,jsonb,text,text[]);
create or replace function public.create_order(
  p_restaurant uuid, p_type text, p_table uuid, p_name text, p_phone text, p_address text,
  p_note text, p_payment text, p_fee numeric, p_items jsonb, p_token text, p_combo text[] default null,
  p_credit uuid default null
) returns jsonb language plpgsql security definer
set search_path = public
as $$
declare
  v_number   integer;
  v_id       uuid;
  v_label    text;
  v_subtotal numeric(12,2);
  v_fee      numeric(12,2) := case when p_type = 'delivery' then coalesce(p_fee, 0) else 0 end;
begin
  perform 1 from public.restaurants where id = p_restaurant for update;
  if not found then raise exception 'Restaurante inexistente' using errcode = 'P0002'; end if;

  if p_table is not null then
    select label into v_label from public.restaurant_tables
    where id = p_table and restaurant_id = p_restaurant and active;
    if not found then raise exception 'Mesa inexistente' using errcode = 'P0002'; end if;
  end if;

  if p_credit is not null then
    perform 1 from public.credit_accounts where id = p_credit and restaurant_id = p_restaurant and active;
    if not found then raise exception 'Cuenta inexistente' using errcode = 'P0002'; end if;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 40 then
    raise exception 'Pedido inválido' using errcode = 'P0001';
  end if;

  select coalesce(sum((i->>'price')::numeric * (i->>'qty')::int), 0) into v_subtotal
  from jsonb_array_elements(p_items) i;

  select coalesce(max(number), 0) + 1 into v_number from public.orders where restaurant_id = p_restaurant;

  insert into public.orders (restaurant_id, number, tracking_token, type, table_id, table_label,
    customer_name, customer_phone, address, note, payment_method, payment_combo, credit_account_id,
    subtotal, delivery_fee, total)
  values (p_restaurant, v_number, p_token, p_type, p_table, v_label,
    coalesce(p_name, ''), coalesce(p_phone, ''), coalesce(p_address, ''), coalesce(p_note, ''),
    p_payment, p_combo, p_credit, v_subtotal, v_fee, v_subtotal + v_fee)
  returning id into v_id;

  insert into public.order_items (order_id, restaurant_id, product_id, name, unit_price, qty)
  select v_id, p_restaurant, nullif(i->>'product_id', '')::uuid, i->>'name', (i->>'price')::numeric, (i->>'qty')::int
  from jsonb_array_elements(p_items) i;

  insert into public.order_status_history (order_id, restaurant_id, status) values (v_id, p_restaurant, 'nuevo');

  return jsonb_build_object('id', v_id, 'number', v_number);
end $$;
revoke all on function public.create_order(uuid,text,uuid,text,text,text,text,text,numeric,jsonb,text,text[],uuid) from public, anon, authenticated;

-- set_order_status: igual que en 0005 + cargo/anulación en la cuenta corriente.
create or replace function public.set_order_status(p_restaurant uuid, p_order uuid, p_to text, p_actor uuid)
returns void language plpgsql security definer
set search_path = public
as $$
declare
  v_from text; v_pm text; v_acc uuid; v_total numeric(12,2); v_num integer;
begin
  select status, payment_method, credit_account_id, total, number
    into v_from, v_pm, v_acc, v_total, v_num
  from public.orders
  where id = p_order and restaurant_id = p_restaurant for update;
  if not found then raise exception 'Pedido inexistente' using errcode = 'P0002'; end if;

  if not (
       (v_from = 'nuevo'          and p_to in ('en_preparacion','cancelado'))
    or (v_from = 'en_preparacion' and p_to in ('listo','cancelado'))
    or (v_from = 'listo'          and p_to in ('entregado','cancelado'))
  ) then
    raise exception 'No se puede pasar el pedido de "%" a "%".', v_from, p_to using errcode = 'P0001';
  end if;

  if p_to = 'en_preparacion' and v_pm = 'cuenta_corriente' then
    if v_acc is null then
      raise exception 'Elegí a qué cuenta corriente se carga este pedido.' using errcode = 'P0001';
    end if;
    if v_total > 0 then
      insert into public.credit_entries (restaurant_id, account_id, kind, amount, description, order_id, created_by)
      values (p_restaurant, v_acc, 'consumo', v_total, 'Pedido #' || v_num, p_order, p_actor)
      on conflict do nothing;
    end if;
  end if;

  if p_to = 'cancelado' then
    update public.credit_entries set voided_at = now()
    where order_id = p_order and restaurant_id = p_restaurant and voided_at is null;
  end if;

  update public.orders set status = p_to where id = p_order and restaurant_id = p_restaurant;
  insert into public.order_status_history (order_id, restaurant_id, status, changed_by)
  values (p_order, p_restaurant, p_to, p_actor);
end $$;
revoke all on function public.set_order_status(uuid,uuid,text,uuid) from public, anon, authenticated;

-- Saldo de cada cuenta del restaurante (consumos − pagos, sin contar lo anulado).
create or replace function public.credit_balances(p_restaurant uuid)
returns table (account_id uuid, balance numeric, last_on date)
language sql stable security definer
set search_path = public
as $$
  select a.id,
         coalesce(sum(case e.kind when 'consumo' then e.amount else -e.amount end) filter (where e.voided_at is null), 0),
         max(e.occurred_on) filter (where e.voided_at is null)
  from public.credit_accounts a
  left join public.credit_entries e on e.account_id = a.id and e.restaurant_id = a.restaurant_id
  where a.restaurant_id = p_restaurant
  group by a.id
$$;
revoke all on function public.credit_balances(uuid) from public, anon, authenticated;

alter table public.credit_accounts enable row level security;
alter table public.credit_entries  enable row level security;
revoke all on public.credit_accounts, public.credit_entries from anon, authenticated;
grant select on public.credit_accounts, public.credit_entries to authenticated;
create policy propietario_ve_sus_cuentas on public.credit_accounts for select to authenticated
  using (exists (select 1 from public.restaurant_owners o where o.restaurant_id = credit_accounts.restaurant_id and o.user_id = auth.uid()));
create policy propietario_ve_sus_movimientos on public.credit_entries for select to authenticated
  using (exists (select 1 from public.restaurant_owners o where o.restaurant_id = credit_entries.restaurant_id and o.user_id = auth.uid()));
