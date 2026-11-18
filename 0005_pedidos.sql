-- =====================================================================
-- Migración 0005 — Pedidos nativos (Plan Premium)
--   * restaurant_ordering : estado abierto/pausado/cerrado y reglas (EN VIVO,
--                           no pasa por borrador/publicación)
--   * restaurant_tables   : mesas (cada una con su QR)
--   * orders / order_items / order_status_history
--   * create_order / set_order_status : operaciones atómicas
-- Todas las escrituras las hace el servidor (service_role). El plan Premium
-- se exige en el servidor. Los precios los fija el servidor desde el menú
-- PUBLICADO: nunca se confía en precios enviados por el cliente.
-- =====================================================================

create table public.restaurant_ordering (
  restaurant_id     uuid primary key references public.restaurants(id) on delete cascade,
  state             text not null default 'cerrado' check (state in ('abierto','pausado','cerrado')),
  accept_mesa       boolean not null default true,
  accept_take_away  boolean not null default true,
  accept_delivery   boolean not null default false,
  delivery_fee      numeric(12,2) not null default 0 check (delivery_fee >= 0 and delivery_fee <= 1000000),
  payment_methods   text[] not null default array['efectivo']
                    check (payment_methods <@ array['efectivo','transferencia','tarjeta']
                           and cardinality(payment_methods) >= 1),
  updated_at        timestamptz not null default now()
);
create trigger restaurant_ordering_updated_at before update on public.restaurant_ordering
  for each row execute function public.set_updated_at();

create table public.restaurant_tables (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  label         text not null check (char_length(label) between 1 and 30),
  position      integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint tables_id_restaurant_unique unique (id, restaurant_id),
  constraint tables_label_unique unique (restaurant_id, label)
);
create index tables_restaurant_idx on public.restaurant_tables (restaurant_id, position);

create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  number         integer not null,
  tracking_token text not null unique check (char_length(tracking_token) >= 20),
  type           text not null check (type in ('mesa','take_away','delivery')),
  status         text not null default 'nuevo'
                 check (status in ('nuevo','en_preparacion','listo','entregado','cancelado')),
  table_id       uuid,
  table_label    text,
  customer_name  text not null default '' check (char_length(customer_name) <= 60),
  customer_phone text not null default '' check (char_length(customer_phone) <= 20),
  address        text not null default '' check (char_length(address) <= 200),
  note           text not null default '' check (char_length(note) <= 300),
  payment_method text check (payment_method in ('efectivo','transferencia','tarjeta')),
  subtotal       numeric(12,2) not null check (subtotal >= 0),
  delivery_fee   numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total          numeric(12,2) not null check (total >= 0 and total <= 20000000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint orders_number_unique unique (restaurant_id, number),
  constraint orders_id_restaurant_unique unique (id, restaurant_id),
  -- si se borra la mesa, el pedido queda (con la etiqueta guardada)
  constraint orders_table_same_restaurant foreign key (table_id, restaurant_id)
    references public.restaurant_tables (id, restaurant_id) on delete no action
);
create index orders_restaurant_status_idx on public.orders (restaurant_id, status, created_at desc);
create index orders_restaurant_created_idx on public.orders (restaurant_id, created_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null,
  restaurant_id uuid not null,
  product_id    uuid,
  name          text not null check (char_length(name) between 1 and 80),
  unit_price    numeric(12,2) not null check (unit_price >= 0),
  qty           integer not null check (qty between 1 and 20),
  created_at    timestamptz not null default now(),
  foreign key (order_id, restaurant_id) references public.orders (id, restaurant_id) on delete cascade
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_restaurant_idx on public.order_items (restaurant_id, created_at desc);

create table public.order_status_history (
  id            bigint generated always as identity primary key,
  order_id      uuid not null,
  restaurant_id uuid not null,
  status        text not null check (status in ('nuevo','en_preparacion','listo','entregado','cancelado')),
  changed_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  foreign key (order_id, restaurant_id) references public.orders (id, restaurant_id) on delete cascade
);
create index order_history_order_idx on public.order_status_history (order_id, id);

-- Crear pedido (atómico): numera por restaurante, guarda ítems e historial.
-- El servidor ya validó plan, estado, mesa y precios; acá se garantiza la integridad.
create or replace function public.create_order(
  p_restaurant uuid, p_type text, p_table uuid, p_name text, p_phone text, p_address text,
  p_note text, p_payment text, p_fee numeric, p_items jsonb, p_token text
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
  perform 1 from public.restaurants where id = p_restaurant for update; -- serializa la numeración
  if not found then raise exception 'Restaurante inexistente' using errcode = 'P0002'; end if;

  if p_table is not null then
    select label into v_label from public.restaurant_tables
    where id = p_table and restaurant_id = p_restaurant and active;
    if not found then raise exception 'Mesa inexistente' using errcode = 'P0002'; end if;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 40 then
    raise exception 'Pedido inválido' using errcode = 'P0001';
  end if;

  select coalesce(sum((i->>'price')::numeric * (i->>'qty')::int), 0) into v_subtotal
  from jsonb_array_elements(p_items) i;

  select coalesce(max(number), 0) + 1 into v_number from public.orders where restaurant_id = p_restaurant;

  insert into public.orders (restaurant_id, number, tracking_token, type, table_id, table_label,
    customer_name, customer_phone, address, note, payment_method, subtotal, delivery_fee, total)
  values (p_restaurant, v_number, p_token, p_type, p_table, v_label,
    coalesce(p_name, ''), coalesce(p_phone, ''), coalesce(p_address, ''), coalesce(p_note, ''),
    p_payment, v_subtotal, v_fee, v_subtotal + v_fee)
  returning id into v_id;

  insert into public.order_items (order_id, restaurant_id, product_id, name, unit_price, qty)
  select v_id, p_restaurant, nullif(i->>'product_id', '')::uuid, i->>'name', (i->>'price')::numeric, (i->>'qty')::int
  from jsonb_array_elements(p_items) i;

  insert into public.order_status_history (order_id, restaurant_id, status) values (v_id, p_restaurant, 'nuevo');

  return jsonb_build_object('id', v_id, 'number', v_number);
end $$;

-- Cambiar estado (atómico) con transiciones válidas.
create or replace function public.set_order_status(p_restaurant uuid, p_order uuid, p_to text, p_actor uuid)
returns void language plpgsql security definer
set search_path = public
as $$
declare v_from text;
begin
  select status into v_from from public.orders
  where id = p_order and restaurant_id = p_restaurant for update;
  if not found then raise exception 'Pedido inexistente' using errcode = 'P0002'; end if;

  if not (
       (v_from = 'nuevo'          and p_to in ('en_preparacion','cancelado'))
    or (v_from = 'en_preparacion' and p_to in ('listo','cancelado'))
    or (v_from = 'listo'          and p_to in ('entregado','cancelado'))
  ) then
    raise exception 'No se puede pasar el pedido de "%" a "%".', v_from, p_to using errcode = 'P0001';
  end if;

  update public.orders set status = p_to where id = p_order and restaurant_id = p_restaurant;
  insert into public.order_status_history (order_id, restaurant_id, status, changed_by)
  values (p_order, p_restaurant, p_to, p_actor);
end $$;

revoke all on function public.create_order(uuid,text,uuid,text,text,text,text,text,numeric,jsonb,text) from public, anon, authenticated;
revoke all on function public.set_order_status(uuid,uuid,text,uuid) from public, anon, authenticated;

alter table public.restaurant_ordering    enable row level security;
alter table public.restaurant_tables      enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.order_status_history   enable row level security;

revoke all on public.restaurant_ordering, public.restaurant_tables, public.orders,
  public.order_items, public.order_status_history from anon, authenticated;
grant select on public.restaurant_ordering, public.restaurant_tables, public.orders,
  public.order_items, public.order_status_history to authenticated;

create policy propietario_ve_su_ordering on public.restaurant_ordering for select to authenticated
  using (exists (select 1 from public.restaurant_owners o where o.restaurant_id = restaurant_ordering.restaurant_id and o.user_id = auth.uid()));
create policy propietario_ve_sus_mesas on public.restaurant_tables for select to authenticated
  using (exists (select 1 from public.restaurant_owners o where o.restaurant_id = restaurant_tables.restaurant_id and o.user_id = auth.uid()));
create policy propietario_ve_sus_pedidos on public.orders for select to authenticated
  using (exists (select 1 from public.restaurant_owners o where o.restaurant_id = orders.restaurant_id and o.user_id = auth.uid()));
create policy propietario_ve_sus_items on public.order_items for select to authenticated
  using (exists (select 1 from public.restaurant_owners o where o.restaurant_id = order_items.restaurant_id and o.user_id = auth.uid()));
create policy propietario_ve_su_historial on public.order_status_history for select to authenticated
  using (exists (select 1 from public.restaurant_owners o where o.restaurant_id = order_status_history.restaurant_id and o.user_id = auth.uid()));
create policy admins_ven_pedidos on public.orders for select to authenticated using (public.is_platform_admin());
