-- Quita la foto de TODOS los productos de BAR DE PASTAS (borrador).
-- No toca el logotipo ni la portada. Pegar completo en Supabase → SQL Editor → Run.
-- Las fotos siguen visibles para tus clientes hasta que apretés "Publicar cambios";
-- al publicar, el sistema borra los archivos del almacenamiento (ya nadie los usa).
-- Todo o nada. Se puede repetir sin problema (la segunda vez no encuentra fotos).
do $$
declare
  v_slug text := 'bar-de-pastas';
  v_rid  uuid;
  v_n    int;
begin
  select id into v_rid from public.restaurants where slug = v_slug;
  if v_rid is null then raise exception 'No existe el restaurante %', v_slug; end if;

  -- 1) Dejar en cola las imágenes para que se borren al publicar.
  insert into public.pending_image_deletes (path, restaurant_id)
  select distinct image_path, v_rid
    from public.products
   where restaurant_id = v_rid and image_path is not null
  on conflict (path) do nothing;

  -- 2) Quitar la foto de los productos.
  update public.products set image_path = null
   where restaurant_id = v_rid and image_path is not null;
  get diagnostics v_n = row_count;

  raise notice 'Listo: se quitó la foto a % productos de %. Publicá los cambios para que lo vean tus clientes.', v_n, v_slug;
end $$;
