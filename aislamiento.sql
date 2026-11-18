-- =====================================================================
-- Verificación de aislamiento entre restaurantes (RLS y restricciones).
-- Pegalo ENTERO en el SQL Editor de Supabase y ejecutalo.
--   * Si todo está bien, el resultado final dice: AISLAMIENTO OK
--   * Si algo falla, aparece un error que empieza con "FALLO:".
-- Corre dentro de una transacción que se DESHACE al final (rollback):
-- no deja datos de prueba. Usa correos @example.test inexistentes.
-- NOTA: este script no pudo ejecutarse en el entorno de desarrollo (no hay
-- Postgres allí); si da un error de sintaxis o de columnas faltantes en
-- auth.users, pasame el mensaje tal cual.
-- =====================================================================
begin;

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'prueba-a@example.test', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-4000-8000-00000000000b', 'prueba-b@example.test', 'authenticated', 'authenticated');

insert into public.restaurants (id, slug, name) values
  ('bbbbbbbb-0000-4000-8000-00000000000a', 'prueba-aaa', 'Prueba A'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'prueba-bbb', 'Prueba B');
insert into public.restaurant_owners (restaurant_id, user_id, email) values
  ('bbbbbbbb-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-00000000000a', 'prueba-a@example.test'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'aaaaaaaa-0000-4000-8000-00000000000b', 'prueba-b@example.test');
insert into public.categories (id, restaurant_id, name) values
  ('cccccccc-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000a', 'Cat A'),
  ('cccccccc-0000-4000-8000-00000000000b', 'bbbbbbbb-0000-4000-8000-00000000000b', 'Cat B');
insert into public.products (id, restaurant_id, category_id, name, price_ars) values
  ('dddddddd-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000a', 'cccccccc-0000-4000-8000-00000000000a', 'Prod A', 100),
  ('dddddddd-0000-4000-8000-00000000000b', 'bbbbbbbb-0000-4000-8000-00000000000b', 'cccccccc-0000-4000-8000-00000000000b', 'Prod B', 200);

-- 1) Una categoría de otro restaurante no puede asignarse a un producto (clave compuesta).
do $$ begin
  begin
    insert into public.products (restaurant_id, category_id, name, price_ars)
    values ('bbbbbbbb-0000-4000-8000-00000000000b', 'cccccccc-0000-4000-8000-00000000000a', 'Cruzado', 1);
    raise exception 'FALLO: un producto de B se pudo colgar de una categoría de A';
  exception when foreign_key_violation then null; end;
end $$;

-- 2) El slug no se puede cambiar.
do $$ begin
  begin
    update public.restaurants set slug = 'otro-slug' where id = 'bbbbbbbb-0000-4000-8000-00000000000a';
    raise exception 'FALLO: se pudo cambiar el slug';
  exception when raise_exception then
    if sqlerrm like 'FALLO:%' then raise; end if;
  end;
end $$;

-- 3) Propietario A (rol authenticated): solo ve lo suyo.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-00000000000a","role":"authenticated"}', true);
do $$ declare n int; begin
  select count(*) into n from public.restaurants where slug like 'prueba-%';
  if n <> 1 then raise exception 'FALLO: A ve % restaurantes de prueba (debería ver 1)', n; end if;
  select count(*) into n from public.categories where name like 'Cat %';
  if n <> 1 then raise exception 'FALLO: A ve % categorías (debería ver 1)', n; end if;
  select count(*) into n from public.products where name like 'Prod %';
  if n <> 1 then raise exception 'FALLO: A ve % productos (debería ver 1)', n; end if;
  select count(*) into n from public.products where id = 'dddddddd-0000-4000-8000-00000000000b';
  if n <> 0 then raise exception 'FALLO: A puede leer un producto de B'; end if;
end $$;

-- 4) A no puede escribir NADA directamente (la escritura es solo del servidor).
do $$ begin
  begin
    update public.products set name = 'Hackeado' where id = 'dddddddd-0000-4000-8000-00000000000b';
    raise exception 'FALLO: A pudo ejecutar un UPDATE sobre products';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.products where id = 'dddddddd-0000-4000-8000-00000000000a';
    raise exception 'FALLO: A pudo ejecutar un DELETE sobre products';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.categories (restaurant_id, name) values ('bbbbbbbb-0000-4000-8000-00000000000b', 'Intruso');
    raise exception 'FALLO: A pudo ejecutar un INSERT sobre categories';
  exception when insufficient_privilege then null; end;
end $$;

-- 5) A no puede llamar a las funciones de publicar / reordenar ni leer auditoría y pagos.
do $$ begin
  begin
    perform public.publish_menu('bbbbbbbb-0000-4000-8000-00000000000b', 'aaaaaaaa-0000-4000-8000-00000000000a');
    raise exception 'FALLO: A pudo publicar el menú de B';
  exception when insufficient_privilege then null; end;
  begin
    perform public.reorder_categories('bbbbbbbb-0000-4000-8000-00000000000b', array['cccccccc-0000-4000-8000-00000000000b']::uuid[]);
    raise exception 'FALLO: A pudo reordenar categorías de B';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.audit_log limit 1;
    raise exception 'FALLO: A pudo leer audit_log';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.payments limit 1;
    raise exception 'FALLO: A pudo leer payments';
  exception when insufficient_privilege then null; end;
end $$;

-- 6) Visitante sin sesión (rol anon): no lee nada de las tablas.
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.products limit 1;
    raise exception 'FALLO: anon pudo leer products';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.restaurants limit 1;
    raise exception 'FALLO: anon pudo leer restaurants';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
select 'AISLAMIENTO OK' as resultado;
rollback;
