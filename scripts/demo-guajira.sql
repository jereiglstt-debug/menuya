-- Menú de DEMOSTRACIÓN para GUAJIRA (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'guajira';
  v_nombre   text    := 'Guajira';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "ANTOJITOS",
  "productos": [
   {
    "nombre": "NACHOS GUAJIRA",
    "descripcion": "TOTOPOS, CHEDDAR, FRIJOLES, GUACAMOLE, JALAPEÑOS Y CREMA",
    "precio": 10500,
    "destacado": true
   },
   {
    "nombre": "GUACAMOLE CON TOTOPOS",
    "descripcion": "",
    "precio": 8500,
    "destacado": false
   },
   {
    "nombre": "QUESO FUNDIDO",
    "descripcion": "CON CHORIZO Y TORTILLAS",
    "precio": 9500,
    "destacado": false
   },
   {
    "nombre": "ELOTES (X2)",
    "descripcion": "CHOCLO CON MAYONESA, QUESO Y CHILE",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "TOSTADAS DE TINGA (X3)",
    "descripcion": "POLLO DESMECHADO EN SALSA CHIPOTLE",
    "precio": 9500,
    "destacado": false
   },
   {
    "nombre": "FLAUTAS DE POLLO (X4)",
    "descripcion": "CON CREMA Y QUESO",
    "precio": 9800,
    "destacado": false
   },
   {
    "nombre": "SOPES (X3)",
    "descripcion": "FRIJOLES, CARNE Y SALSA VERDE",
    "precio": 9500,
    "destacado": false
   },
   {
    "nombre": "CEVICHE MEXICANO",
    "descripcion": "PESCADO, LIMÓN, TOMATE, CEBOLLA Y CILANTRO",
    "precio": 12500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "TACOS",
  "productos": [
   {
    "nombre": "TACOS AL PASTOR (X3)",
    "descripcion": "CERDO ADOBADO, ANANÁ Y CEBOLLA",
    "precio": 11500,
    "destacado": true
   },
   {
    "nombre": "TACOS DE BIRRIA (X3)",
    "descripcion": "CARNE BRASEADA CON QUESO Y CONSOMÉ PARA MOJAR",
    "precio": 13500,
    "destacado": true
   },
   {
    "nombre": "TACOS DE CARNE ASADA (X3)",
    "descripcion": "",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "TACOS DE CARNITAS (X3)",
    "descripcion": "CERDO CONFITADO Y CEBOLLA",
    "precio": 11800,
    "destacado": false
   },
   {
    "nombre": "TACOS DE POLLO (X3)",
    "descripcion": "",
    "precio": 11000,
    "destacado": false
   },
   {
    "nombre": "TACOS DE PESCADO (X3)",
    "descripcion": "REBOZADO, REPOLLO Y SALSA CHIPOTLE",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "TACOS DORADOS (X3)",
    "descripcion": "CRUJIENTES DE PAPA Y QUESO",
    "precio": 10500,
    "destacado": false
   },
   {
    "nombre": "TACOS VEGETARIANOS (X3)",
    "descripcion": "HONGOS, MORRÓN Y FRIJOLES NEGROS",
    "precio": 10500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "BURRITOS Y QUESADILLAS",
  "productos": [
   {
    "nombre": "BURRITO DE CARNE",
    "descripcion": "",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "BURRITO DE POLLO",
    "descripcion": "",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "BURRITO VEGGIE",
    "descripcion": "",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "QUESADILLA DE QUESO",
    "descripcion": "",
    "precio": 8500,
    "destacado": false
   },
   {
    "nombre": "QUESADILLA DE POLLO",
    "descripcion": "",
    "precio": 10000,
    "destacado": false
   },
   {
    "nombre": "QUESADILLA DE CARNE ASADA",
    "descripcion": "",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "FAJITAS MIXTAS",
    "descripcion": "POLLO Y CARNE CON MORRONES, CEBOLLA Y TORTILLAS",
    "precio": 17500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PLATOS FUERTES",
  "productos": [
   {
    "nombre": "ENCHILADAS VERDES",
    "descripcion": "POLLO, SALSA VERDE, CREMA Y QUESO",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "ENCHILADAS ROJAS",
    "descripcion": "",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "ENCHILADAS SUIZAS",
    "descripcion": "GRATINADAS CON CREMA Y QUESO",
    "precio": 14000,
    "destacado": false
   },
   {
    "nombre": "CHILAQUILES CON POLLO",
    "descripcion": "TOTOPOS EN SALSA, CREMA Y QUESO",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "POZOLE ROJO",
    "descripcion": "CALDO DE MAÍZ CON CERDO, REPOLLO Y RÁBANO",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "MOLE POBLANO CON POLLO",
    "descripcion": "CON ARROZ Y TORTILLAS",
    "precio": 15000,
    "destacado": false
   },
   {
    "nombre": "CHILE RELLENO",
    "descripcion": "MORRÓN RELLENO DE QUESO CON SALSA DE TOMATE",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "COMBINADO GUAJIRA",
    "descripcion": "TACOS, QUESADILLAS, NACHOS Y ARROZ PARA DOS",
    "precio": 26000,
    "destacado": true
   }
  ]
 },
 {
  "categoria": "TORTAS Y ANTOJOS",
  "productos": [
   {
    "nombre": "TORTA DE MILANESA",
    "descripcion": "",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "TORTA DE CARNITAS",
    "descripcion": "",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "TORTA AHOGADA",
    "descripcion": "CON SALSA PICANTE",
    "precio": 12000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "POSTRES",
  "productos": [
   {
    "nombre": "CHURROS CON DULCE DE LECHE",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "FLAN NAPOLITANO",
    "descripcion": "",
    "precio": 5000,
    "destacado": false
   },
   {
    "nombre": "TRES LECHES",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "PLÁTANOS FRITOS CON CREMA",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "HELADO FRITO",
    "descripcion": "",
    "precio": 6500,
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
    "nombre": "AGUA DE JAMAICA",
    "descripcion": "",
    "precio": 4200,
    "destacado": false
   },
   {
    "nombre": "AGUA DE HORCHATA",
    "descripcion": "ARROZ Y CANELA",
    "precio": 4200,
    "destacado": false
   },
   {
    "nombre": "LIMONADA CON CHILE",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "CERVEZA CORONA 355CC",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "CERVEZA MODELO 355CC",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "MICHELADA",
    "descripcion": "CERVEZA CON LIMÓN, SAL Y SALSA PICANTE",
    "precio": 6500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "TRAGOS Y TEQUILAS",
  "productos": [
   {
    "nombre": "MARGARITA",
    "descripcion": "TEQUILA, TRIPLE SEC, LIMÓN Y SAL",
    "precio": 7000,
    "destacado": true
   },
   {
    "nombre": "MARGARITA DE MANGO",
    "descripcion": "",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "PALOMA",
    "descripcion": "TEQUILA, POMELO Y SODA",
    "precio": 6800,
    "destacado": false
   },
   {
    "nombre": "TEQUILA SUNRISE",
    "descripcion": "",
    "precio": 7000,
    "destacado": false
   },
   {
    "nombre": "CANTARITO",
    "descripcion": "TEQUILA CON JUGOS CÍTRICOS Y SAL",
    "precio": 7000,
    "destacado": false
   },
   {
    "nombre": "MEZCAL CON NARANJA",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "SHOT DE TEQUILA",
    "descripcion": "CON LIMÓN Y SAL",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "TEQUILA AÑEJO",
    "descripcion": "",
    "precio": 8500,
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
    values (v_rid, v_nombre, 'Cocina mexicana: tacos, birria, antojitos y tequilas')
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
