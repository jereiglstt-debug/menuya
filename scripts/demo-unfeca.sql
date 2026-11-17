-- Menú de DEMOSTRACIÓN para UNFECA (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'unfeca';
  v_nombre   text    := 'Unfeca';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "CAFÉS CALIENTES",
  "productos": [
   {
    "nombre": "ESPRESSO",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "CAFÉ DOBLE",
    "descripcion": "",
    "precio": 3500,
    "destacado": false
   },
   {
    "nombre": "CAFÉ CON LECHE",
    "descripcion": "",
    "precio": 3300,
    "destacado": false
   },
   {
    "nombre": "CORTADO",
    "descripcion": "",
    "precio": 3000,
    "destacado": false
   },
   {
    "nombre": "LÁGRIMA",
    "descripcion": "",
    "precio": 3200,
    "destacado": false
   },
   {
    "nombre": "CAPUCCINO",
    "descripcion": "ESPRESSO, LECHE VAPORIZADA Y ESPUMA",
    "precio": 3900,
    "destacado": true
   },
   {
    "nombre": "LATTE",
    "descripcion": "",
    "precio": 4000,
    "destacado": false
   },
   {
    "nombre": "MOCACCINO",
    "descripcion": "ESPRESSO, CHOCOLATE Y LECHE",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "SUBMARINO",
    "descripcion": "LECHE CALIENTE CON BARRA DE CHOCOLATE",
    "precio": 4300,
    "destacado": false
   },
   {
    "nombre": "CHOCOLATE CALIENTE",
    "descripcion": "CON CREMA",
    "precio": 4500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "CAFÉS FRÍOS",
  "productos": [
   {
    "nombre": "ICED LATTE",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "COLD BREW",
    "descripcion": "CAFÉ EXTRACCIÓN EN FRÍO",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "FRAPPÉ DE CAFÉ",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "FRAPPÉ DE DULCE DE LECHE",
    "descripcion": "",
    "precio": 5800,
    "destacado": false
   },
   {
    "nombre": "AFFOGATO",
    "descripcion": "HELADO DE CREMA CON ESPRESSO",
    "precio": 5500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "TÉS E INFUSIONES",
  "productos": [
   {
    "nombre": "TÉ NEGRO",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "TÉ VERDE",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "TÉ DE FRUTOS ROJOS",
    "descripcion": "",
    "precio": 3000,
    "destacado": false
   },
   {
    "nombre": "MANZANILLA",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "MATE COCIDO",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "MATCHA LATTE",
    "descripcion": "",
    "precio": 5000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "MEDIALUNAS Y FACTURAS",
  "productos": [
   {
    "nombre": "MEDIALUNA DE MANTECA",
    "descripcion": "",
    "precio": 1300,
    "destacado": false
   },
   {
    "nombre": "MEDIALUNA DE GRASA",
    "descripcion": "",
    "precio": 1200,
    "destacado": false
   },
   {
    "nombre": "MEDIALUNAS (DOCENA)",
    "descripcion": "",
    "precio": 14000,
    "destacado": false
   },
   {
    "nombre": "FACTURAS SURTIDAS (DOCENA)",
    "descripcion": "",
    "precio": 15000,
    "destacado": false
   },
   {
    "nombre": "CROISSANT DE JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "PALMERITA",
    "descripcion": "",
    "precio": 1500,
    "destacado": false
   },
   {
    "nombre": "CHIPA (X6)",
    "descripcion": "",
    "precio": 3500,
    "destacado": false
   },
   {
    "nombre": "BOLA DE FRAILE",
    "descripcion": "CON DULCE DE LECHE",
    "precio": 2500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "TOSTADOS Y SALADOS",
  "productos": [
   {
    "nombre": "TOSTADO DE JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "TOSTADO COMPLETO",
    "descripcion": "JAMÓN, QUESO, TOMATE Y HUEVO",
    "precio": 6800,
    "destacado": false
   },
   {
    "nombre": "TOSTADA CON PALTA Y HUEVO",
    "descripcion": "",
    "precio": 7800,
    "destacado": false
   },
   {
    "nombre": "SÁNDWICHES DE MIGA (X6)",
    "descripcion": "",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "TARTA DE ZAPALLITOS",
    "descripcion": "",
    "precio": 8000,
    "destacado": false
   },
   {
    "nombre": "EMPANADAS DE CARNE (X3)",
    "descripcion": "",
    "precio": 6300,
    "destacado": false
   },
   {
    "nombre": "PEBETE DE JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PASTELERÍA Y TORTAS",
  "productos": [
   {
    "nombre": "BROWNIE",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "CHEESECAKE DE FRUTOS ROJOS",
    "descripcion": "",
    "precio": 6500,
    "destacado": true
   },
   {
    "nombre": "LEMON PIE",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "TORTA DE ZANAHORIA",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "TORTA OREO",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "TORTA ROGEL",
    "descripcion": "DULCE DE LECHE Y MERENGUE",
    "precio": 5800,
    "destacado": false
   },
   {
    "nombre": "TORTA DE CHOCOLATE",
    "descripcion": "",
    "precio": 5800,
    "destacado": false
   },
   {
    "nombre": "TARTALETA DE FRUTILLA",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "ALFAJOR DE MAICENA",
    "descripcion": "",
    "precio": 2500,
    "destacado": false
   },
   {
    "nombre": "ALFAJOR DE CHOCOLATE",
    "descripcion": "",
    "precio": 3000,
    "destacado": false
   },
   {
    "nombre": "BUDÍN DE LIMÓN",
    "descripcion": "",
    "precio": 4200,
    "destacado": false
   },
   {
    "nombre": "BUDÍN DE BANANA",
    "descripcion": "",
    "precio": 4200,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "HELADOS Y POSTRES",
  "productos": [
   {
    "nombre": "HELADO (2 BOLAS)",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "COPA DE HELADO",
    "descripcion": "CON CREMA Y SALSA A ELECCIÓN",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "FLAN CON DULCE DE LECHE",
    "descripcion": "CON CREMA",
    "precio": 5000,
    "destacado": false
   },
   {
    "nombre": "PANQUEQUES DE DULCE DE LECHE",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "WAFFLE CON FRUTAS Y HELADO",
    "descripcion": "",
    "precio": 8000,
    "destacado": false
   },
   {
    "nombre": "ENSALADA DE FRUTAS",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "COMBOS",
  "productos": [
   {
    "nombre": "MERIENDA CLÁSICA",
    "descripcion": "CAFÉ CON LECHE Y 2 MEDIALUNAS",
    "precio": 7500,
    "destacado": true
   },
   {
    "nombre": "MERIENDA COMPLETA",
    "descripcion": "CAFÉ CON LECHE, JUGO EXPRIMIDO Y TOSTADO",
    "precio": 10000,
    "destacado": false
   },
   {
    "nombre": "MERIENDA PARA DOS",
    "descripcion": "2 CAFÉS, 4 MEDIALUNAS Y 1 PORCIÓN DE TORTA",
    "precio": 15500,
    "destacado": false
   },
   {
    "nombre": "TÉ CON TORTA",
    "descripcion": "INFUSIÓN A ELECCIÓN Y PORCIÓN DE TORTA",
    "precio": 7800,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "JUGOS Y LICUADOS",
  "productos": [
   {
    "nombre": "JUGO DE NARANJA EXPRIMIDO",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "LICUADO DE BANANA",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "LICUADO DE FRUTILLA",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "LIMONADA CON MENTA Y JENGIBRE",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "AGUA MINERAL 500CC",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "GASEOSA 500CC",
    "descripcion": "",
    "precio": 3800,
    "destacado": false
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
    values (v_rid, v_nombre, 'Cafetería y confitería: cafés, facturas, tortas y meriendas')
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
