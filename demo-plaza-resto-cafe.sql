-- Menú de DEMOSTRACIÓN para PLAZA RESTO CAFÉ (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'plaza-resto-cafe';
  v_nombre   text    := 'Plaza Resto Café';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "CAFÉS",
  "productos": [
   {
    "nombre": "ESPRESSO",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "CORTADO",
    "descripcion": "",
    "precio": 3000,
    "destacado": false
   },
   {
    "nombre": "CAFÉ CON LECHE",
    "descripcion": "",
    "precio": 3300,
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
    "descripcion": "",
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
    "nombre": "ICED COFFEE",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "FRAPPÉ DE CAFÉ",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "TÉS Y CHOCOLATES",
  "productos": [
   {
    "nombre": "TÉ NEGRO, VERDE O DE HIERBAS",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "TÉ CHAI LATTE",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "MATCHA LATTE",
    "descripcion": "",
    "precio": 5000,
    "destacado": false
   },
   {
    "nombre": "CHOCOLATE CALIENTE",
    "descripcion": "CON CREMA",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "CHOCOLATADA FRÍA",
    "descripcion": "",
    "precio": 4300,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "DESAYUNOS Y MERIENDAS",
  "productos": [
   {
    "nombre": "DESAYUNO PLAZA",
    "descripcion": "CAFÉ O TÉ, JUGO EXPRIMIDO Y 2 MEDIALUNAS",
    "precio": 8500,
    "destacado": true
   },
   {
    "nombre": "MERIENDA PLAZA",
    "descripcion": "CAFÉ CON LECHE, TOSTADO Y PORCIÓN DE TORTA",
    "precio": 9500,
    "destacado": false
   },
   {
    "nombre": "TOSTADA CON PALTA Y HUEVO",
    "descripcion": "",
    "precio": 7800,
    "destacado": false
   },
   {
    "nombre": "TOSTADA CON JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "MEDIALUNAS (X3)",
    "descripcion": "",
    "precio": 3000,
    "destacado": false
   },
   {
    "nombre": "PANQUEQUES CON DULCE DE LECHE",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "WAFFLE CON FRUTAS",
    "descripcion": "",
    "precio": 7500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "SANDWICHES Y TOSTADOS",
  "productos": [
   {
    "nombre": "TOSTADO DE JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "TOSTADO COMPLETO",
    "descripcion": "",
    "precio": 6800,
    "destacado": false
   },
   {
    "nombre": "CLUB SANDWICH",
    "descripcion": "",
    "precio": 12000,
    "destacado": false
   },
   {
    "nombre": "LOMITO COMPLETO",
    "descripcion": "",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "SÁNDWICH DE MILANESA",
    "descripcion": "",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "WRAP DE POLLO",
    "descripcion": "",
    "precio": 10500,
    "destacado": false
   },
   {
    "nombre": "SÁNDWICHES DE MIGA (X6)",
    "descripcion": "",
    "precio": 7500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PLATOS Y ENSALADAS",
  "productos": [
   {
    "nombre": "MILANESA CON PAPAS",
    "descripcion": "",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "SUPREMA NAPOLITANA",
    "descripcion": "CON PAPAS FRITAS",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "RAVIOLES CON SALSA MIXTA",
    "descripcion": "",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "ÑOQUIS CON BOLOGNESA",
    "descripcion": "",
    "precio": 12000,
    "destacado": false
   },
   {
    "nombre": "ENSALADA CÉSAR",
    "descripcion": "",
    "precio": 10500,
    "destacado": false
   },
   {
    "nombre": "ENSALADA MIXTA",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "TARTA DEL DÍA",
    "descripcion": "CON ENSALADA",
    "precio": 8500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PASTELERÍA",
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
    "nombre": "TORTA ROGEL",
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
    "nombre": "BUDÍN DE LIMÓN",
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
    "nombre": "COPA PLAZA",
    "descripcion": "HELADO, CREMA, FRUTAS Y SALSA DE CHOCOLATE",
    "precio": 7000,
    "destacado": false
   },
   {
    "nombre": "FLAN CON DULCE DE LECHE",
    "descripcion": "",
    "precio": 5000,
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
  "categoria": "BEBIDAS",
  "productos": [
   {
    "nombre": "JUGO DE NARANJA EXPRIMIDO",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "LICUADO DE FRUTAS",
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
    "nombre": "GASEOSA 500CC",
    "descripcion": "",
    "precio": 3800,
    "destacado": false
   },
   {
    "nombre": "AGUA MINERAL 500CC",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "CERVEZA ARTESANAL 500CC",
    "descripcion": "CONSULTÁ LOS ESTILOS DISPONIBLES",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "VINO MALBEC (COPA)",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "APEROL SPRITZ",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "FERNET CON COLA",
    "descripcion": "",
    "precio": 5500,
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
    values (v_rid, v_nombre, 'Cafetería y resto: cafés, meriendas, platos y pastelería')
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
