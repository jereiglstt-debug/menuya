-- =====================================================================
-- Migración 0006 — Métodos de pago que acepta el local (todos los planes)
--   Opciones: efectivo, débito, crédito y "combinado" (el cliente elige
--   cuáles de las anteriores combina, entre las que el local habilitó).
--   Es una configuración EN VIVO (no pasa por borrador/publicación).
--   Solo informa y registra la elección del cliente: no cobra online.
-- Reemplaza a restaurant_ordering.payment_methods (de la migración 0005).
-- =====================================================================

create table public.restaurant_payment_settings (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  methods       text[] not null default array['efectivo']
                check (methods <@ array['efectivo','debito','credito','combinado']
                       and cardinality(methods) >= 1),
  combo_options text[] not null default '{}'
                check (combo_options <@ array['efectivo','debito','credito']),
  updated_at    timestamptz not null default now(),
  constraint combinado_requiere_dos check (
    not ('combinado' = any(methods)) or cardinality(combo_options) >= 2)
);
create trigger payment_settings_updated_at before update on public.restaurant_payment_settings
  for each row execute function public.set_updated_at();

-- Migra lo que ya estaba configurado: tarjeta → débito + crédito; transferencia
-- ya no existe como opción (si quedaba vacío, queda solo efectivo).
insert into public.restaurant_payment_settings (restaurant_id, methods)
select o.restaurant_id,
  coalesce(nullif(array(
    select m from unnest(array['efectivo','debito','credito']) m
    where (m = 'efectivo' and 'efectivo' = any(o.payment_methods))
       or (m in ('debito','credito') and 'tarjeta' = any(o.payment_methods))
  ), '{}'), array['efectivo'])
from public.restaurant_ordering o;

alter table public.restaurant_ordering drop column payment_methods;

-- Pedidos: ahora pueden registrar débito, crédito o combinado (con el detalle).
-- Se conservan 'transferencia' y 'tarjeta' para que los pedidos viejos sigan siendo válidos.
alter table public.orders drop constraint orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('efectivo','transferencia','tarjeta','debito','credito','combinado'));
alter table public.orders add column payment_combo text[]
  check (payment_combo is null or (payment_combo <@ array['efectivo','debito','credito'] and cardinality(payment_combo) >= 2));
alter table public.orders add constraint orders_combo_coherente
  check ((payment_method = 'combinado') = (payment_combo is not null));

-- create_order: igual que en 0005, más p_combo.
drop function public.create_order(uuid,text,uuid,text,text,text,text,text,numeric,jsonb,text);
create or replace function public.create_order(
  p_restaurant uuid, p_type text, p_table uuid, p_name text, p_phone text, p_address text,
  p_note text, p_payment text, p_fee numeric, p_items jsonb, p_token text, p_combo text[] default null
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

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 40 then
    raise exception 'Pedido inválido' using errcode = 'P0001';
  end if;

  select coalesce(sum((i->>'price')::numeric * (i->>'qty')::int), 0) into v_subtotal
  from jsonb_array_elements(p_items) i;

  select coalesce(max(number), 0) + 1 into v_number from public.orders where restaurant_id = p_restaurant;

  insert into public.orders (restaurant_id, number, tracking_token, type, table_id, table_label,
    customer_name, customer_phone, address, note, payment_method, payment_combo, subtotal, delivery_fee, total)
  values (p_restaurant, v_number, p_token, p_type, p_table, v_label,
    coalesce(p_name, ''), coalesce(p_phone, ''), coalesce(p_address, ''), coalesce(p_note, ''),
    p_payment, p_combo, v_subtotal, v_fee, v_subtotal + v_fee)
  returning id into v_id;

  insert into public.order_items (order_id, restaurant_id, product_id, name, unit_price, qty)
  select v_id, p_restaurant, nullif(i->>'product_id', '')::uuid, i->>'name', (i->>'price')::numeric, (i->>'qty')::int
  from jsonb_array_elements(p_items) i;

  insert into public.order_status_history (order_id, restaurant_id, status) values (v_id, p_restaurant, 'nuevo');

  return jsonb_build_object('id', v_id, 'number', v_number);
end $$;
revoke all on function public.create_order(uuid,text,uuid,text,text,text,text,text,numeric,jsonb,text,text[]) from public, anon, authenticated;

alter table public.restaurant_payment_settings enable row level security;
revoke all on public.restaurant_payment_settings from anon, authenticated;
grant select on public.restaurant_payment_settings to authenticated;
create policy propietario_ve_sus_pagos on public.restaurant_payment_settings for select to authenticated
  using (exists (select 1 from public.restaurant_owners o
                 where o.restaurant_id = restaurant_payment_settings.restaurant_id and o.user_id = auth.uid()));
