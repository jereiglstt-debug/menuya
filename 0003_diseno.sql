-- =====================================================================
-- Migración 0003 — Diseño del menú (plantilla, colores, tipografía, portada)
-- El diseño es parte del BORRADOR (menu_settings) y se publica dentro de la
-- instantánea, igual que productos y categorías.
-- La validación fina (colores, plan) la hace el servidor; aquí solo se
-- garantiza que el diseño sea un objeto JSON de tamaño razonable.
-- =====================================================================

alter table public.menu_settings
  add column design     jsonb not null default '{}'::jsonb,
  add column cover_path text;

alter table public.menu_settings
  add constraint menu_settings_design_objeto
  check (jsonb_typeof(design) = 'object' and pg_column_size(design) < 2048);

-- publish_menu: misma lógica que en 0002, más 'cover_path' y 'design' en la instantánea.
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
    'categories',  coalesce((
      select jsonb_agg(
        jsonb_build_object('id', c.id, 'name', c.name, 'products', (
          select jsonb_agg(jsonb_build_object(
            'id', p.id, 'name', p.name, 'description', p.description,
            'price_ars', p.price_ars, 'image_path', p.image_path,
            'available', p.available) order by p.position, p.created_at)
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
