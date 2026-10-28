-- =====================================================================
-- Migración 0002 — Catálogo, borrador y publicación, imágenes
--   BORRADOR  = filas de categories / products / menu_settings (editables).
--   PUBLICADO = última fila de menu_versions (instantánea JSON inmutable).
-- Las escrituras las hace el servidor (service_role); RLS protege la lectura.
-- =====================================================================

alter table public.restaurants add column draft_changed_at timestamptz;

create table public.menu_settings (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  title         text not null default '' check (char_length(title) <= 80),
  description   text not null default '' check (char_length(description) <= 500),
  logo_path     text,
  updated_at    timestamptz not null default now()
);
create trigger menu_settings_updated_at before update on public.menu_settings
  for each row execute function public.set_updated_at();

create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint categories_id_restaurant_unique unique (id, restaurant_id)
);
create index categories_restaurant_idx on public.categories (restaurant_id, position);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- La clave foránea compuesta garantiza a nivel de base que un producto solo
-- puede pertenecer a una categoría de su mismo restaurante.
create table public.products (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id   uuid not null,
  name          text not null check (char_length(name) between 1 and 80),
  description   text not null default '' check (char_length(description) <= 300),
  price_ars     numeric(12,2) not null check (price_ars >= 0 and price_ars <= 10000000),
  image_path    text,
  available     boolean not null default true,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint products_category_same_restaurant
    foreign key (category_id, restaurant_id)
    references public.categories (id, restaurant_id) on delete cascade
);
create index products_category_idx on public.products (category_id, position);
create index products_restaurant_idx on public.products (restaurant_id);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.menu_versions (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  version       integer not null,
  snapshot      jsonb not null,
  published_at  timestamptz not null default now(),
  published_by  uuid references auth.users(id) on delete set null,
  constraint menu_versions_unique unique (restaurant_id, version)
);

-- Imágenes reemplazadas: se borran del almacenamiento DESPUÉS de publicar,
-- porque el menú público vigente todavía puede estar usándolas.
create table public.pending_image_deletes (
  path          text primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  created_at    timestamptz not null default now()
);

create or replace function public.touch_draft()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  update public.restaurants set draft_changed_at = now()
  where id = coalesce(new.restaurant_id, old.restaurant_id);
  return null;
end $$;

create trigger categories_touch after insert or update or delete on public.categories
  for each row execute function public.touch_draft();
create trigger products_touch after insert or update or delete on public.products
  for each row execute function public.touch_draft();
create trigger menu_settings_touch after insert or update or delete on public.menu_settings
  for each row execute function public.touch_draft();

-- Reordenar (todo o nada): exigen la lista COMPLETA y sin repetidos.
create or replace function public.reorder_categories(p_restaurant uuid, p_ids uuid[])
returns void language plpgsql security definer
set search_path = public
as $$
declare v_total int; v_updated int;
begin
  select count(*) into v_total from public.categories where restaurant_id = p_restaurant;
  if coalesce(array_length(p_ids, 1), 0) <> v_total
     or (select count(distinct x) from unnest(p_ids) x) <> v_total then
    raise exception 'La lista de categorías no coincide con la actual. Recargá la página.' using errcode = 'P0001';
  end if;
  update public.categories c set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where c.id = o.id and c.restaurant_id = p_restaurant;
  get diagnostics v_updated = row_count;
  if v_updated <> v_total then
    raise exception 'La lista de categorías no coincide con la actual. Recargá la página.' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.reorder_products(p_restaurant uuid, p_category uuid, p_ids uuid[])
returns void language plpgsql security definer
set search_path = public
as $$
declare v_total int; v_updated int;
begin
  select count(*) into v_total from public.products
  where restaurant_id = p_restaurant and category_id = p_category;
  if coalesce(array_length(p_ids, 1), 0) <> v_total
     or (select count(distinct x) from unnest(p_ids) x) <> v_total then
    raise exception 'La lista de productos no coincide con la actual. Recargá la página.' using errcode = 'P0001';
  end if;
  update public.products p set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where p.id = o.id and p.restaurant_id = p_restaurant and p.category_id = p_category;
  get diagnostics v_updated = row_count;
  if v_updated <> v_total then
    raise exception 'La lista de productos no coincide con la actual. Recargá la página.' using errcode = 'P0001';
  end if;
end $$;

-- Publicar (atómico): una sola transacción crea la instantánea.
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

revoke all on function public.reorder_categories(uuid, uuid[])     from public, anon, authenticated;
revoke all on function public.reorder_products(uuid, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.publish_menu(uuid, uuid)             from public, anon, authenticated;

alter table public.menu_settings         enable row level security;
alter table public.categories            enable row level security;
alter table public.products              enable row level security;
alter table public.menu_versions         enable row level security;
alter table public.pending_image_deletes enable row level security;

revoke all on public.menu_settings, public.categories, public.products,
  public.menu_versions, public.pending_image_deletes from anon, authenticated;
grant select on public.menu_settings, public.categories, public.products,
  public.menu_versions to authenticated;

create policy propietario_ve_su_config on public.menu_settings for select to authenticated
  using (exists (select 1 from public.restaurant_owners o
                 where o.restaurant_id = menu_settings.restaurant_id and o.user_id = auth.uid()));
create policy propietario_ve_sus_categorias on public.categories for select to authenticated
  using (exists (select 1 from public.restaurant_owners o
                 where o.restaurant_id = categories.restaurant_id and o.user_id = auth.uid()));
create policy propietario_ve_sus_productos on public.products for select to authenticated
  using (exists (select 1 from public.restaurant_owners o
                 where o.restaurant_id = products.restaurant_id and o.user_id = auth.uid()));
create policy propietario_ve_sus_versiones on public.menu_versions for select to authenticated
  using (exists (select 1 from public.restaurant_owners o
                 where o.restaurant_id = menu_versions.restaurant_id and o.user_id = auth.uid()));
create policy admins_ven_catalogo_c on public.categories for select to authenticated using (public.is_platform_admin());
create policy admins_ven_catalogo_p on public.products   for select to authenticated using (public.is_platform_admin());

-- Bucket público de solo lectura; sin políticas de escritura (solo service_role sube).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
