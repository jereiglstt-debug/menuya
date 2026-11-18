-- =====================================================================
-- Migración 0008 — Modelos 3D de los platillos (realidad aumentada, plan Premium)
--   * products.model_path        archivo GLB del platillo (borrador; viaja en la instantánea)
--   * restaurants.model_limit    máximo de platillos con modelo (el administrador lo ajusta)
--   * bucket menu-images         sube el tope a 8 MB y admite GLB. Las fotos siguen
--                                limitadas a 2 MB por el servidor.
-- ORDEN: ejecutar ESTA migración ANTES de desplegar el código nuevo.
-- =====================================================================

alter table public.products
  add column model_path text,
  add constraint products_model_path_formato check (model_path is null or char_length(model_path) <= 200);

alter table public.restaurants
  add column model_limit integer not null default 15,
  add constraint restaurants_model_limit_rango check (model_limit between 0 and 200);

update storage.buckets
   set file_size_limit = 8388608,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'model/gltf-binary']
 where id = 'menu-images';

-- publish_menu: igual que en 0004, más 'model_path' (modelo 3D) en cada producto.
create or replace function public.publish_menu(p_restaurant uuid, p_actor uuid)
returns integer language plpgsql security definer
set search_path = public
as $$
declare
  v_snapshot jsonb;
  v_version  integer;
  v_products integer;
begin
  perform 1 from public.restaurants where id = p_restaurant for update;
  if not found then
    raise exception 'Restaurante inexistente' using errcode = 'P0002';
  end if;

  select count(*) into v_products from public.products where restaurant_id = p_restaurant;
  if v_products = 0 then
    raise exception 'Agregá al menos un producto antes de publicar.' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'title',       coalesce(nullif(s.title, ''), r.name),
    'description', coalesce(nullif(s.description, ''), r.description),
    'logo_path',   s.logo_path,
    'cover_path',  s.cover_path,
    'design',      coalesce(s.design, '{}'::jsonb),
    'whatsapp',    s.whatsapp,
    'promotions',  coalesce((
      select jsonb_agg(jsonb_build_object('title', pr.title, 'description', pr.description)
                       order by pr.created_at)
      from public.promotions pr where pr.restaurant_id = r.id and pr.active
    ), '[]'::jsonb),
    'categories',  coalesce((
      select jsonb_agg(
        jsonb_build_object('id', c.id, 'name', c.name, 'products', (
          select jsonb_agg(jsonb_build_object(
            'id', p.id, 'name', p.name, 'description', p.description,
            'price_ars', p.price_ars, 'image_path', p.image_path,
            'available', p.available, 'featured', p.featured,
            'model_path', p.model_path)
            order by p.position, p.created_at)
          from public.products p where p.category_id = c.id
        )) order by c.position, c.created_at)
      from public.categories c
      where c.restaurant_id = r.id
        and exists (select 1 from public.products p2 where p2.category_id = c.id)
    ), '[]'::jsonb)
  )
  into v_snapshot
  from public.restaurants r
  left join public.menu_settings s on s.restaurant_id = r.id
  where r.id = p_restaurant;

  select coalesce(max(version), 0) + 1 into v_version
  from public.menu_versions where restaurant_id = p_restaurant;

  insert into public.menu_versions (restaurant_id, version, snapshot, published_by)
  values (p_restaurant, v_version, v_snapshot, p_actor);

  insert into public.audit_log (actor_id, action, restaurant_id, details)
  values (p_actor, 'menu_publicado', p_restaurant, jsonb_build_object('version', v_version));

  return v_version;
end $$;

revoke all on function public.publish_menu(uuid, uuid) from public, anon, authenticated;
