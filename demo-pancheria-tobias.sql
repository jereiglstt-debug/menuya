-- Menú de DEMOSTRACIÓN para PANCHERÍA TOBÍAS (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'pancheria-tobias';
  v_nombre   text    := 'Panchería Tobías';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "PANCHOS CLÁSICOS",
  "productos": [
   {
    "nombre": "PANCHO SIMPLE",
    "descripcion": "SALCHICHA Y PAN",
    "precio": 3500,
    "destacado": false
   },
   {
    "nombre": "PANCHO COMPLETO",
    "descripcion": "SALCHICHA, PAPAS PAY Y SALSAS A ELECCIÓN",
    "precio": 4500,
    "destacado": true
   },
   {
    "nombre": "PANCHO CON QUESO",
    "descripcion": "SALCHICHA, QUESO FUNDIDO Y PAPAS PAY",
    "precio": 5000,
    "destacado": false
   },
   {
    "nombre": "PANCHO ALEMÁN",
    "descripcion": "SALCHICHA ALEMANA, CEBOLLA SALTEADA Y MOSTAZA",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "PANCHO DOBLE",
    "descripcion": "DOS SALCHICHAS, PAPAS PAY Y SALSAS",
    "precio": 6500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PANCHOS ESPECIALES",
  "productos": [
   {
    "nombre": "PANCHO CHEDDAR Y PANCETA",
    "descripcion": "SALCHICHA, CHEDDAR FUNDIDO Y PANCETA CRUJIENTE",
    "precio": 7500,
    "destacado": true
   },
   {
    "nombre": "PANCHO AMERICANO",
    "descripcion": "SALCHICHA, CEBOLLA CRISPY, PICKLES Y SALSA BBQ",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "PANCHO MEXICANO",
    "descripcion": "SALCHICHA, GUACAMOLE, JALAPEÑOS Y NACHOS",
    "precio": 7800,
    "destacado": false
   },
   {
    "nombre": "PANCHO NAPOLITANO",
    "descripcion": "SALCHICHA, MUZZARELLA, TOMATE Y ORÉGANO",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "PANCHO CRIOLLO",
    "descripcion": "SALCHICHA, CHIMICHURRI Y CEBOLLA MORADA",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "PANCHO TOBÍAS",
    "descripcion": "DOBLE SALCHICHA, CHEDDAR, PANCETA, HUEVO FRITO Y PAPAS",
    "precio": 8500,
    "destacado": true
   },
   {
    "nombre": "PANCHO VEGGIE",
    "descripcion": "SALCHICHA VEGETAL, PALTA Y CEBOLLA CARAMELIZADA",
    "precio": 7000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "SUPERPANCHOS",
  "productos": [
   {
    "nombre": "SUPERPANCHO 30 CM",
    "descripcion": "SALCHICHA XL, PAPAS PAY Y TRES SALSAS",
    "precio": 9500,
    "destacado": false
   },
   {
    "nombre": "SUPERPANCHO CON CHEDDAR",
    "descripcion": "SALCHICHA XL, CHEDDAR Y PANCETA",
    "precio": 11000,
    "destacado": false
   },
   {
    "nombre": "COMBO FAMILIAR (X4)",
    "descripcion": "4 PANCHOS COMPLETOS Y GASEOSA 1,5 L",
    "precio": 24000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "HAMBURGUESAS Y MÁS",
  "productos": [
   {
    "nombre": "HAMBURGUESA CLÁSICA",
    "descripcion": "MEDALLÓN, LECHUGA, TOMATE Y QUESO",
    "precio": 9500,
    "destacado": false
   },
   {
    "nombre": "HAMBURGUESA CHEDDAR Y PANCETA",
    "descripcion": "",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "CHORIPÁN",
    "descripcion": "",
    "precio": 7000,
    "destacado": false
   },
   {
    "nombre": "TOSTADO DE JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "MILANESA AL PAN",
    "descripcion": "",
    "precio": 10500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PAPAS Y ACOMPAÑAMIENTOS",
  "productos": [
   {
    "nombre": "PAPAS FRITAS",
    "descripcion": "PORCIÓN INDIVIDUAL",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "PAPAS FRITAS GRANDES",
    "descripcion": "PARA COMPARTIR",
    "precio": 8500,
    "destacado": false
   },
   {
    "nombre": "PAPAS CON CHEDDAR Y PANCETA",
    "descripcion": "",
    "precio": 9000,
    "destacado": false
   },
   {
    "nombre": "AROS DE CEBOLLA",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "NUGGETS DE POLLO (X8)",
    "descripcion": "",
    "precio": 7500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "SALSAS EXTRA",
  "productos": [
   {
    "nombre": "SALSA CHEDDAR",
    "descripcion": "",
    "precio": 1500,
    "destacado": false
   },
   {
    "nombre": "SALSA BBQ",
    "descripcion": "",
    "precio": 1000,
    "destacado": false
   },
   {
    "nombre": "SALSA GOLF",
    "descripcion": "",
    "precio": 800,
    "destacado": false
   },
   {
    "nombre": "SALSA PICANTE",
    "descripcion": "",
    "precio": 1000,
    "destacado": false
   },
   {
    "nombre": "GUACAMOLE",
    "descripcion": "",
    "precio": 2000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "POSTRES",
  "productos": [
   {
    "nombre": "CHURROS CON DULCE DE LECHE (X6)",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "HELADO (2 BOLAS)",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "BROWNIE CON HELADO",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "FLAN CON DULCE DE LECHE",
    "descripcion": "",
    "precio": 5000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "BEBIDAS",
  "productos": [
   {
    "nombre": "GASEOSA 500CC",
    "descripcion": "",
    "precio": 3500,
    "destacado": false
   },
   {
    "nombre": "GASEOSA 1,5 L",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "AGUA MINERAL 500CC",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "JUGO EN CAJA",
    "descripcion": "",
    "precio": 2500,
    "destacado": false
   },
   {
    "nombre": "LIMONADA CON MENTA",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "CERVEZA 1 L",
    "descripcion": "",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "CERVEZA ARTESANAL 500CC",
    "descripcion": "CONSULTÁ LOS ESTILOS DISPONIBLES",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "MILKSHAKE DE VAINILLA",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "MILKSHAKE DE CHOCOLATE",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "COMBO PANCHO + PAPAS + BEBIDA",
    "descripcion": "PANCHO COMPLETO, PAPAS FRITAS Y GASEOSA 500CC",
    "precio": 9500,
    "destacado": true
   }
  ]
 }
]
  $json$;
  v_rid uuid; v_cat jsonb; v_prod jsonb; v_cid uuid; v_cpos int; v_ppos int; v_actor uuid;
  v_ncat int := 0; v_nprod int := 0; v_nomit int := 0; v_version int;
begin
  insert into public.restaurants (slug, name, plan, status)
    values (v_slug, v_nombre, v_plan, 'activo')
    on conflict (slug) do nothing;
  select id into v_rid from public.restaurants where slug = v_slug;

  insert into public.menu_settings (restaurant_id, title, description)
    values (v_rid, v_nombre, 'Panchos clásicos y especiales, papas y bebidas')
    on conflict (restaurant_id) do nothing;

  select coalesce(max(position), -1) + 1 into v_cpos from public.categories where restaurant_id = v_rid;
  for v_cat in select * from jsonb_array_elements(v_carta) loop
    select id into v_cid from public.categories
      where restaurant_id = v_rid and upper(name) = upper(v_cat->>'categoria') limit 1;
    if v_cid is null then
      insert into public.categories (restaurant_id, name, position)
        values (v_rid, v_cat->>'categoria', v_cpos) returning id into v_cid;
      v_cpos := v_cpos + 1; v_ncat := v_ncat + 1;
    end if;
    select coalesce(max(position), -1) + 1 into v_ppos from public.products where category_id = v_cid;
    for v_prod in select * from jsonb_array_elements(v_cat->'productos') loop
      if exists (select 1 from public.products where category_id = v_cid and name = v_prod->>'nombre') then
        v_nomit := v_nomit + 1;
      else
        insert into public.products (restaurant_id, category_id, name, description, price_ars, featured, position)
          values (v_rid, v_cid, v_prod->>'nombre', coalesce(v_prod->>'descripcion', ''),
                  (v_prod->>'precio')::numeric, coalesce((v_prod->>'destacado')::boolean, false), v_ppos);
        v_ppos := v_ppos + 1; v_nprod := v_nprod + 1;
      end if;
    end loop;
  end loop;

  if v_publicar and (v_nprod > 0 or not exists (select 1 from public.menu_versions where restaurant_id = v_rid)) then
    select user_id into v_actor from public.platform_admins limit 1;
    v_version := public.publish_menu(v_rid, v_actor);
  end if;

  raise notice 'Listo: % categorías nuevas, % productos cargados, % ya existían (omitidos). Versión publicada: %.',
    v_ncat, v_nprod, v_nomit, coalesce(v_version::text, 'ninguna');
end $$;
