-- =====================================================================
-- Verificación REAL en Postgres de los pedidos (migración 0005):
-- numeración, totales, transiciones, claves compuestas y aislamiento (RLS).
-- Pegalo ENTERO en el SQL Editor de Supabase. Resultado final: PEDIDOS OK
-- Si algo falla, aparece un error que empieza con "FALLO:".
-- Corre en una transacción que se DESHACE (no deja datos). Requiere haber
-- ejecutado 0001 a 0006. NOTA: no pude ejecutarlo en mi entorno (sin Postgres).
-- =====================================================================
begin;

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-1111-4000-8000-00000000000a', 'ped-a@example.test', 'authenticated', 'authenticated'),
  ('aaaaaaaa-1111-4000-8000-00000000000b', 'ped-b@example.test', 'authenticated', 'authenticated');
insert into public.restaurants (id, slug, name, plan) values
  ('bbbbbbbb-1111-4000-8000-00000000000a', 'ped-aaa', 'Ped A', 'premium'),
  ('bbbbbbbb-1111-4000-8000-00000000000b', 'ped-bbb', 'Ped B', 'premium');
insert into public.restaurant_owners (restaurant_id, user_id, email) values
  ('bbbbbbbb-1111-4000-8000-00000000000a', 'aaaaaaaa-1111-4000-8000-00000000000a', 'ped-a@example.test'),
  ('bbbbbbbb-1111-4000-8000-00000000000b', 'aaaaaaaa-1111-4000-8000-00000000000b', 'ped-b@example.test');
insert into public.restaurant_tables (id, restaurant_id, label) values
  ('eeeeeeee-1111-4000-8000-00000000000a', 'bbbbbbbb-1111-4000-8000-00000000000a', 'Mesa A1'),
  ('eeeeeeee-1111-4000-8000-00000000000b', 'bbbbbbbb-1111-4000-8000-00000000000b', 'Mesa B1');

-- 1) Numeración por restaurante, totales y envío solo en delivery.
do $$ declare r jsonb; o record; begin
  r := public.create_order('bbbbbbbb-1111-4000-8000-00000000000a', 'take_away', null, 'Ana', '5491122334455', '', '', 'efectivo', 1500,
        '[{"product_id":null,"name":"Muzza","price":100,"qty":2},{"name":"Gaseosa","price":50.5,"qty":1}]'::jsonb, 'tok-aaaaaaaaaaaaaaaaaaaa1');
  if (r->>'number')::int <> 1 then raise exception 'FALLO: el primer pedido de A no es el #1'; end if;
  select * into o from public.orders where id = (r->>'id')::uuid;
  if o.subtotal <> 250.5 or o.delivery_fee <> 0 or o.total <> 250.5 then raise exception 'FALLO: totales de take away mal calculados (% / % / %)', o.subtotal, o.delivery_fee, o.total; end if;
  r := public.create_order('bbbbbbbb-1111-4000-8000-00000000000a', 'delivery', null, 'Ana', '5491122334455', 'Calle 123', '', 'efectivo', 1500,
        '[{"name":"Muzza","price":100,"qty":1}]'::jsonb, 'tok-aaaaaaaaaaaaaaaaaaaa2');
  if (r->>'number')::int <> 2 then raise exception 'FALLO: el segundo pedido de A no es el #2'; end if;
  select * into o from public.orders where id = (r->>'id')::uuid;
  if o.total <> 1600 or o.delivery_fee <> 1500 then raise exception 'FALLO: el delivery no suma el envío'; end if;
  r := public.create_order('bbbbbbbb-1111-4000-8000-00000000000b', 'take_away', null, 'Beto', '5491100000000', '', '', 'efectivo', 0,
        '[{"name":"Pizza","price":10,"qty":1}]'::jsonb, 'tok-bbbbbbbbbbbbbbbbbbbb1');
  if (r->>'number')::int <> 1 then raise exception 'FALLO: la numeración de B no es independiente de A'; end if;
end $$;

-- 2) Una mesa de OTRO restaurante no sirve (clave compuesta + validación).
do $$ begin
  begin
    perform public.create_order('bbbbbbbb-1111-4000-8000-00000000000a', 'mesa', 'eeeeeeee-1111-4000-8000-00000000000b', '', '', '', '', null, 0,
      '[{"name":"X","price":1,"qty":1}]'::jsonb, 'tok-aaaaaaaaaaaaaaaaaaaa3');
    raise exception 'FALLO: A pudo crear un pedido en una mesa de B';
  exception when sqlstate 'P0002' then null; end;
  if (select table_label from public.orders where tracking_token = 'tok-aaaaaaaaaaaaaaaaaaaa3') is not null then
    raise exception 'FALLO: quedó un pedido a medias';
  end if;
end $$;

-- 3) Pedido en mesa propia guarda la etiqueta.
do $$ declare r jsonb; begin
  r := public.create_order('bbbbbbbb-1111-4000-8000-00000000000a', 'mesa', 'eeeeeeee-1111-4000-8000-00000000000a', '', '', '', '', null, 0,
    '[{"name":"X","price":1,"qty":1}]'::jsonb, 'tok-aaaaaaaaaaaaaaaaaaaa4');
  if (select table_label from public.orders where id = (r->>'id')::uuid) <> 'Mesa A1' then raise exception 'FALLO: no guardó la etiqueta de la mesa'; end if;
end $$;

-- 4) Reglas de la base: cantidad máxima, token corto, token repetido, lista vacía.
do $$ begin
  begin
    perform public.create_order('bbbbbbbb-1111-4000-8000-00000000000a', 'take_away', null, 'Ana', '549', '', '', 'efectivo', 0,
      '[{"name":"X","price":1,"qty":21}]'::jsonb, 'tok-aaaaaaaaaaaaaaaaaaaa5');
    raise exception 'FALLO: se aceptó una cantidad de 21';
  exception when check_violation then null; end;
  begin
    perform public.create_order('bbbbbbbb-1111-4000-8000-00000000000a', 'take_away', null, 'Ana', '549', '', '', 'efectivo', 0,
      '[{"name":"X","price":1,"qty":1}]'::jsonb, 'corto');
    raise exception 'FALLO: se aceptó un token corto';
  exception when check_violation then null; end;
  begin
    perform public.create_order('bbbbbbbb-1111-4000-8000-00000000000a', 'take_away', null, 'Ana', '549', '', '', 'efectivo', 0,
      '[{"name":"X","price":1,"qty":1}]'::jsonb, 'tok-aaaaaaaaaaaaaaaaaaaa1');
    raise exception 'FALLO: se aceptó un token repetido';
  exception when unique_violation then null; end;
  begin
    perform public.create_order('bbbbbbbb-1111-4000-8000-00000000000a', 'take_away', null, 'Ana', '549', '', '', 'efectivo', 0, '[]'::jsonb, 'tok-aaaaaaaaaaaaaaaaaaaa6');
    raise exception 'FALLO: se aceptó un pedido sin productos';
  exception when sqlstate 'P0001' then null; end;
end $$;

-- 5) Transiciones de estado e historial.
do $$ declare oid uuid; n int; begin
  select id into oid from public.orders where tracking_token = 'tok-aaaaaaaaaaaaaaaaaaaa1';
  begin
    perform public.set_order_status('bbbbbbbb-1111-4000-8000-00000000000a', oid, 'listo', null);
    raise exception 'FALLO: se saltó de nuevo a listo';
  exception when sqlstate 'P0001' then null; end;
  perform public.set_order_status('bbbbbbbb-1111-4000-8000-00000000000a', oid, 'en_preparacion', null);
  perform public.set_order_status('bbbbbbbb-1111-4000-8000-00000000000a', oid, 'listo', null);
  perform public.set_order_status('bbbbbbbb-1111-4000-8000-00000000000a', oid, 'entregado', null);
  begin
    perform public.set_order_status('bbbbbbbb-1111-4000-8000-00000000000a', oid, 'cancelado', null);
    raise exception 'FALLO: se canceló un pedido ya entregado';
  exception when sqlstate 'P0001' then null; end;
  select count(*) into n from public.order_status_history where order_id = oid;
  if n <> 4 then raise exception 'FALLO: el historial tiene % filas (debería tener 4)', n; end if;
  begin
    perform public.set_order_status('bbbbbbbb-1111-4000-8000-00000000000b', oid, 'cancelado', null);
    raise exception 'FALLO: B pudo cambiar el estado de un pedido de A';
  exception when sqlstate 'P0002' then null; end;
end $$;

-- 5b) Métodos de pago: combinado y reglas de la tabla de configuración (migración 0006).
do $$ declare r jsonb; o record; begin
  r := public.create_order('bbbbbbbb-1111-4000-8000-00000000000a', 'take_away', null, 'Ana', '5491122334455', '', '', 'combinado', 0,
        '[{"name":"X","price":10,"qty":1}]'::jsonb, 'tok-aaaaaaaaaaaaaaaaaaaa7', array['efectivo','debito']);
  select * into o from public.orders where id = (r->>'id')::uuid;
  if o.payment_method <> 'combinado' or o.payment_combo <> array['efectivo','debito'] then raise exception 'FALLO: no guardó el pago combinado'; end if;
  begin
    perform public.create_order('bbbbbbbb-1111-4000-8000-00000000000a', 'take_away', null, 'Ana', '549', '', '', 'combinado', 0,
      '[{"name":"X","price":1,"qty":1}]'::jsonb, 'tok-aaaaaaaaaaaaaaaaaaaa8', array['efectivo']);
    raise exception 'FALLO: se aceptó un combinado con un solo medio';
  exception when check_violation then null; end;
  begin
    perform public.create_order('bbbbbbbb-1111-4000-8000-00000000000a', 'take_away', null, 'Ana', '549', '', '', 'combinado', 0,
      '[{"name":"X","price":1,"qty":1}]'::jsonb, 'tok-aaaaaaaaaaaaaaaaaaaa9', null);
    raise exception 'FALLO: se aceptó "combinado" sin detalle';
  exception when check_violation then null; end;
  begin
    perform public.create_order('bbbbbbbb-1111-4000-8000-00000000000a', 'take_away', null, 'Ana', '549', '', '', 'debito', 0,
      '[{"name":"X","price":1,"qty":1}]'::jsonb, 'tok-aaaaaaaaaaaaaaaaaaaab', array['efectivo','debito']);
    raise exception 'FALLO: se aceptó un detalle de combinado en un pago simple';
  exception when check_violation then null; end;
  begin
    insert into public.restaurant_payment_settings (restaurant_id, methods) values ('bbbbbbbb-1111-4000-8000-00000000000a', array['combinado']);
    raise exception 'FALLO: se aceptó "combinado" sin combinaciones';
  exception when check_violation then null; end;
  begin
    insert into public.restaurant_payment_settings (restaurant_id, methods) values ('bbbbbbbb-1111-4000-8000-00000000000a', array['bitcoin']);
    raise exception 'FALLO: se aceptó un medio de pago inexistente';
  exception when check_violation then null; end;
  insert into public.restaurant_payment_settings (restaurant_id, methods, combo_options) values
    ('bbbbbbbb-1111-4000-8000-00000000000a', array['efectivo','combinado'], array['efectivo','debito']),
    ('bbbbbbbb-1111-4000-8000-00000000000b', array['credito'], '{}');
end $$;

-- 6) Propietario A (authenticated): ve SOLO lo suyo y no escribe ni ejecuta funciones.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-1111-4000-8000-00000000000a","role":"authenticated"}', true);
do $$ declare n int; begin
  select count(*) into n from public.orders where customer_name in ('Ana', 'Beto') or number >= 1;
  if n <> 4 then raise exception 'FALLO: A ve % pedidos (debería ver los 4 suyos)', n; end if;
  select count(*) into n from public.orders where restaurant_id = 'bbbbbbbb-1111-4000-8000-00000000000b';
  if n <> 0 then raise exception 'FALLO: A ve pedidos de B'; end if;
  select count(*) into n from public.order_items where restaurant_id = 'bbbbbbbb-1111-4000-8000-00000000000b';
  if n <> 0 then raise exception 'FALLO: A ve ítems de B'; end if;
  select count(*) into n from public.restaurant_tables where restaurant_id = 'bbbbbbbb-1111-4000-8000-00000000000b';
  if n <> 0 then raise exception 'FALLO: A ve mesas de B'; end if;
  select count(*) into n from public.restaurant_payment_settings;
  if n <> 1 then raise exception 'FALLO: A ve % configuraciones de pago (debería ver 1)', n; end if;
  begin update public.restaurant_payment_settings set methods = array['efectivo']; raise exception 'FALLO: A pudo modificar los métodos de pago';
  exception when insufficient_privilege then null; end;
  begin update public.orders set total = 0; raise exception 'FALLO: A pudo hacer UPDATE en orders';
  exception when insufficient_privilege then null; end;
  begin delete from public.order_items; raise exception 'FALLO: A pudo hacer DELETE en order_items';
  exception when insufficient_privilege then null; end;
  begin insert into public.restaurant_tables (restaurant_id, label) values ('bbbbbbbb-1111-4000-8000-00000000000b', 'Intruso'); raise exception 'FALLO: A pudo crear mesas';
  exception when insufficient_privilege then null; end;
  begin perform public.create_order('bbbbbbbb-1111-4000-8000-00000000000b', 'take_away', null, 'x', '', '', '', null, 0, '[{"name":"X","price":1,"qty":1}]'::jsonb, 'tok-intruso-aaaaaaaaaaaa');
    raise exception 'FALLO: A pudo ejecutar create_order'; exception when insufficient_privilege then null; end;
  begin perform public.set_order_status('bbbbbbbb-1111-4000-8000-00000000000b', gen_random_uuid(), 'cancelado', null);
    raise exception 'FALLO: A pudo ejecutar set_order_status'; exception when insufficient_privilege then null; end;
end $$;

-- 8) Borrado de datos personales a los 90 días (migración 0007).
reset role;
do $$
declare v_old uuid; v_new uuid; v_n integer; v_tot numeric;
begin
  select id, total into v_old, v_tot from public.orders where restaurant_id = 'bbbbbbbb-1111-4000-8000-00000000000a' order by number limit 1;
  select id into v_new from public.orders where restaurant_id = 'bbbbbbbb-1111-4000-8000-00000000000a' order by number desc limit 1;
  if v_old = v_new then raise exception 'FALLO: el test necesita 2 pedidos del restaurante A'; end if;
  update public.orders set created_at = now() - interval '91 days' where id = v_old;
  v_n := public.purge_customer_data(90);
  if v_n < 1 then raise exception 'FALLO: no purgó el pedido viejo'; end if;
  if exists (select 1 from public.orders where id = v_old and (customer_name <> '' or customer_phone <> '' or address <> '' or note <> '')) then
    raise exception 'FALLO: quedaron datos personales en el pedido viejo'; end if;
  if (select total from public.orders where id = v_old) <> v_tot then raise exception 'FALLO: cambió el total'; end if;
  if not exists (select 1 from public.order_items where order_id = v_old) then raise exception 'FALLO: se perdieron los productos'; end if;
  if (select personal_data_purged_at from public.orders where id = v_new) is not null then raise exception 'FALLO: purgó un pedido reciente'; end if;
  begin perform public.purge_customer_data(1); raise exception 'FALLO: aceptó un plazo de 1 día';
  exception when sqlstate 'P0001' then null; end;
end $$;
set local role authenticated;
do $$ begin
  begin perform public.purge_customer_data(90); raise exception 'FALLO: authenticated pudo ejecutar purge_customer_data';
  exception when insufficient_privilege then null; end;
end $$;

-- 7) Visitante sin sesión: nada.
reset role;
set local role anon;
do $$ begin
  begin perform 1 from public.orders limit 1; raise exception 'FALLO: anon pudo leer orders';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.restaurant_payment_settings limit 1; raise exception 'FALLO: anon pudo leer los métodos de pago';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.restaurant_ordering limit 1; raise exception 'FALLO: anon pudo leer restaurant_ordering';
  exception when insufficient_privilege then null; end;
  begin perform public.create_order('bbbbbbbb-1111-4000-8000-00000000000a', 'take_away', null, 'x', '', '', '', null, 0, '[{"name":"X","price":1,"qty":1}]'::jsonb, 'tok-anon-aaaaaaaaaaaaaaa');
    raise exception 'FALLO: anon pudo ejecutar create_order'; exception when insufficient_privilege then null; end;
end $$;

reset role;
select 'PEDIDOS OK' as resultado;
rollback;
