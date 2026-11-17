-- Menú de DEMOSTRACIÓN para CHOLA BODEGÓN (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'chola-bodegon';
  v_nombre   text    := 'Chola Bodegón';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "PICADAS Y ENTRADAS",
  "productos": [
   {
    "nombre": "PICADA DEL BODEGÓN",
    "descripcion": "FIAMBRES, QUESOS, ACEITUNAS, PICKLES Y PAN CASERO PARA 3 PERSONAS",
    "precio": 22000,
    "destacado": true
   },
   {
    "nombre": "EMPANADAS DE CARNE (X3)",
    "descripcion": "CARNE CORTADA A CUCHILLO",
    "precio": 6600,
    "destacado": false
   },
   {
    "nombre": "EMPANADAS DE JAMÓN Y QUESO (X3)",
    "descripcion": "",
    "precio": 6600,
    "destacado": false
   },
   {
    "nombre": "PROVOLETA",
    "descripcion": "CON ORÉGANO Y AJÍ MOLIDO",
    "precio": 8500,
    "destacado": false
   },
   {
    "nombre": "RABAS",
    "descripcion": "CON SALSA TÁRTARA",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "PAPAS FRITAS",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "PAPAS A CABALLO",
    "descripcion": "CON DOS HUEVOS FRITOS",
    "precio": 8500,
    "destacado": false
   },
   {
    "nombre": "MOLLEJAS CRUJIENTES",
    "descripcion": "CON LIMÓN",
    "precio": 13500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "MINUTAS",
  "productos": [
   {
    "nombre": "MILANESA NAPOLITANA",
    "descripcion": "CON PAPAS FRITAS",
    "precio": 15000,
    "destacado": true
   },
   {
    "nombre": "MILANESA A CABALLO",
    "descripcion": "CON DOS HUEVOS FRITOS Y PAPAS",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "MILANESA DE POLLO",
    "descripcion": "CON GUARNICIÓN A ELECCIÓN",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "SUPREMA MAICENA",
    "descripcion": "JAMÓN, QUESO Y SALSA BLANCA",
    "precio": 14000,
    "destacado": false
   },
   {
    "nombre": "BIFE A CABALLO",
    "descripcion": "CON HUEVOS FRITOS Y PAPAS",
    "precio": 17500,
    "destacado": false
   },
   {
    "nombre": "MERLUZA FRITA",
    "descripcion": "CON PURÉ",
    "precio": 13000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PARRILLA",
  "productos": [
   {
    "nombre": "BIFE DE CHORIZO",
    "descripcion": "CON GUARNICIÓN A ELECCIÓN",
    "precio": 19500,
    "destacado": false
   },
   {
    "nombre": "ASADO DE TIRA",
    "descripcion": "",
    "precio": 18000,
    "destacado": false
   },
   {
    "nombre": "VACÍO",
    "descripcion": "",
    "precio": 18500,
    "destacado": false
   },
   {
    "nombre": "CHORIZO",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "MORCILLA",
    "descripcion": "",
    "precio": 5000,
    "destacado": false
   },
   {
    "nombre": "POLLO A LA PARRILLA",
    "descripcion": "CUARTO DE POLLO CON GUARNICIÓN",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "PARRILLADA PARA DOS",
    "descripcion": "ASADO, VACÍO, CHORIZO, MORCILLA Y MOLLEJAS",
    "precio": 44000,
    "destacado": true
   }
  ]
 },
 {
  "categoria": "PASTAS CASERAS",
  "productos": [
   {
    "nombre": "ÑOQUIS DE PAPA",
    "descripcion": "CON SALSA A ELECCIÓN",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "RAVIOLES DE CARNE",
    "descripcion": "CON SALSA A ELECCIÓN",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "TALLARINES CASEROS",
    "descripcion": "",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "SORRENTINOS DE JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "CANELONES DE VERDURA Y RICOTA",
    "descripcion": "GRATINADOS CON SALSA MIXTA",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "LASAÑA DE CARNE",
    "descripcion": "",
    "precio": 14000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "GUISOS Y PLATOS DE CUCHARA",
  "productos": [
   {
    "nombre": "LOCRO",
    "descripcion": "MAÍZ, POROTOS Y CARNE DE CERDO",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "GUISO DE LENTEJAS",
    "descripcion": "",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "CAZUELA DE POLLO",
    "descripcion": "",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "MONDONGO A LA ESPAÑOLA",
    "descripcion": "",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "PUCHERO CRIOLLO",
    "descripcion": "",
    "precio": 13000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "SANDWICHES",
  "productos": [
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
    "nombre": "HAMBURGUESA COMPLETA",
    "descripcion": "",
    "precio": 12000,
    "destacado": false
   },
   {
    "nombre": "CHORIPÁN",
    "descripcion": "",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "TOSTADO DE JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "POSTRES",
  "productos": [
   {
    "nombre": "FLAN MIXTO",
    "descripcion": "CON DULCE DE LECHE Y CREMA",
    "precio": 5200,
    "destacado": false
   },
   {
    "nombre": "VIGILANTE",
    "descripcion": "QUESO Y DULCE DE BATATA",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "BUDÍN DE PAN",
    "descripcion": "CON DULCE DE LECHE",
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
    "nombre": "ENSALADA DE FRUTAS",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "HELADO (2 BOLAS)",
    "descripcion": "",
    "precio": 4500,
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
    "nombre": "JARRA DE LIMONADA 1 L",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "CERVEZA RUBIA 1 L",
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
    "nombre": "VINO TINTO DE LA CASA (JARRA 500CC)",
    "descripcion": "",
    "precio": 8500,
    "destacado": false
   },
   {
    "nombre": "VINO MALBEC (BOTELLA)",
    "descripcion": "SELECCIÓN DE LA CASA",
    "precio": 17000,
    "destacado": false
   },
   {
    "nombre": "FERNET CON COLA",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "CAFÉ",
    "descripcion": "",
    "precio": 3200,
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
    values (v_rid, v_nombre, 'Cocina de bodegón: minutas, parrilla, pastas y guisos')
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
