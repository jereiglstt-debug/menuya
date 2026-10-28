-- =====================================================================
-- Migración 0004 — Destacados, promociones visuales y WhatsApp
--   * products.featured            (Profesional+; lo exige el servidor)
--   * promotions                   (banners de texto; Profesional+)
--   * menu_settings.whatsapp       (número para el mensaje preparado)
-- Todo es parte del BORRADOR y viaja dentro de la instantánea publicada.
-- =====================================================================

alter table public.products add column featured boolean not null default false;

alter table public.menu_settings
  add column whatsapp text,
  add constraint menu_settings_whatsapp_formato
    check (whatsapp is null or whatsapp ~ '^[0-9]{8,15}$');

create table public.promotions (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 60),
  description   text not null default '' check (char_length(description) <= 200),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index promotions_restaurant_idx on public.promotions (restaurant_id, created_at);
create trigger promotions_updated_at before update on public.promotions
  for each row execute function public.set_updated_at();
create trigger promotions_touch after insert or update or delete on public.promotions
  for each row execute function public.touch_draft();

alter table public.promotions enable row level security;
revoke all on public.promotions from anon, authenticated;
grant select on public.promotions to authenticated;
create policy propietario_ve_sus_promos on public.promotions for select to authenticated
  using (exists (select 1 from public.restaurant_owners o
                 where o.restaurant_id = promotions.restaurant_id and o.user_id = auth.uid()));
create policy admins_ven_promos on public.promotions for select to authenticated
  using (public.is_platform_admin());

-- publish_menu: igual que en 0003, más whatsapp, promociones activas y 'featured'.
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
            'available', p.available, 'featured', p.featured)
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
