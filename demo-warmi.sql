-- Menú de DEMOSTRACIÓN para WARMI (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'warmi';
  v_nombre   text    := 'Warmi';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "ENTRADAS",
  "productos": [
   {
    "nombre": "EMPANADA JUJEÑA DE CARNE",
    "descripcion": "CARNE CORTADA A CUCHILLO, PAPA Y HUEVO",
    "precio": 2200,
    "destacado": false
   },
   {
    "nombre": "EMPANADA DE QUESO DE CABRA",
    "descripcion": "",
    "precio": 2300,
    "destacado": false
   },
   {
    "nombre": "EMPANADA DE CHARQUI",
    "descripcion": "CARNE SECA DE LLAMA",
    "precio": 2400,
    "destacado": false
   },
   {
    "nombre": "DOCENA DE EMPANADAS",
    "descripcion": "ELEGÍ LOS GUSTOS A TU GUSTO",
    "precio": 25000,
    "destacado": true
   },
   {
    "nombre": "HUMITAS EN CHALA (X2)",
    "descripcion": "CHOCLO, QUESO Y CEBOLLA",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "TAMALES (X2)",
    "descripcion": "MASA DE MAÍZ RELLENA DE CARNE",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "PICADA ANDINA",
    "descripcion": "QUESO DE CABRA, CHARQUI, ACEITUNAS Y CHIPS DE PAPA ANDINA",
    "precio": 19000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "SOPAS Y GUISOS",
  "productos": [
   {
    "nombre": "LOCRO NORTEÑO",
    "descripcion": "MAÍZ, POROTOS, ZAPALLO Y CARNE DE CERDO",
    "precio": 12500,
    "destacado": true
   },
   {
    "nombre": "SOPA DE QUINOA",
    "descripcion": "",
    "precio": 8500,
    "destacado": false
   },
   {
    "nombre": "SOPA DE MAÍZ",
    "descripcion": "CON QUESO Y HUEVO",
    "precio": 8000,
    "destacado": false
   },
   {
    "nombre": "CAZUELA DE CORDERO",
    "descripcion": "",
    "precio": 14500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PLATOS PRINCIPALES",
  "productos": [
   {
    "nombre": "CORDERO AL HORNO DE BARRO",
    "descripcion": "CON PAPAS ANDINAS Y ENSALADA",
    "precio": 21000,
    "destacado": true
   },
   {
    "nombre": "MILANESA DE LLAMA",
    "descripcion": "CON PURÉ DE PAPA ANDINA",
    "precio": 17500,
    "destacado": false
   },
   {
    "nombre": "ESTOFADO DE LLAMA",
    "descripcion": "CON VERDURAS Y ARROZ",
    "precio": 17000,
    "destacado": false
   },
   {
    "nombre": "BIFE DE CHORIZO",
    "descripcion": "CON GUARNICIÓN A ELECCIÓN",
    "precio": 19000,
    "destacado": false
   },
   {
    "nombre": "TRUCHA GRILLADA",
    "descripcion": "CON QUINOA SALTEADA",
    "precio": 18500,
    "destacado": false
   },
   {
    "nombre": "PATA DE CERDO ADOBADA",
    "descripcion": "",
    "precio": 16500,
    "destacado": false
   },
   {
    "nombre": "QUINOTO",
    "descripcion": "QUINOA CON VERDURAS Y QUESO",
    "precio": 12000,
    "destacado": false
   },
   {
    "nombre": "PLATO VEGETARIANO ANDINO",
    "descripcion": "QUINOA, VERDURAS ASADAS Y QUESO DE CABRA",
    "precio": 13000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PARRILLA",
  "productos": [
   {
    "nombre": "ASADO DE TIRA",
    "descripcion": "",
    "precio": 18500,
    "destacado": false
   },
   {
    "nombre": "CHORIZO CRIOLLO",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "MORCILLA",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "PARRILLADA PARA DOS",
    "descripcion": "ASADO, CHORIZO, MORCILLA, POLLO Y VERDURAS",
    "precio": 42000,
    "destacado": true
   },
   {
    "nombre": "PROVOLETA",
    "descripcion": "",
    "precio": 8000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "ENSALADAS",
  "productos": [
   {
    "nombre": "ENSALADA DE QUINOA",
    "descripcion": "TOMATE, PEPINO, PALTA Y LIMÓN",
    "precio": 9500,
    "destacado": false
   },
   {
    "nombre": "ENSALADA DE QUESO DE CABRA",
    "descripcion": "HOJAS VERDES, NUECES Y MIEL",
    "precio": 10500,
    "destacado": false
   },
   {
    "nombre": "ENSALADA MIXTA",
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
    "nombre": "QUESILLO CON MIEL",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "DULCE DE CAYOTE CON QUESO",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "FLAN DE DULCE DE LECHE",
    "descripcion": "",
    "precio": 5000,
    "destacado": false
   },
   {
    "nombre": "HELADO DE ALGARROBA",
    "descripcion": "2 BOLAS",
    "precio": 5000,
    "destacado": false
   },
   {
    "nombre": "PASTELITOS DE MEMBRILLO",
    "descripcion": "CON AZÚCAR Y MIEL",
    "precio": 5200,
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
    "nombre": "LIMONADA CON MENTA",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "JUGO DE NARANJA EXPRIMIDO",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "MATE COCIDO",
    "descripcion": "",
    "precio": 3000,
    "destacado": false
   },
   {
    "nombre": "CAFÉ",
    "descripcion": "",
    "precio": 3200,
    "destacado": false
   },
   {
    "nombre": "TÉ DE COCA",
    "descripcion": "INFUSIÓN TRADICIONAL DEL NORTE",
    "precio": 3500,
    "destacado": false
   },
   {
    "nombre": "CERVEZA ARTESANAL 500CC",
    "descripcion": "CONSULTÁ LOS ESTILOS DISPONIBLES",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "VINO TORRONTÉS (COPA)",
    "descripcion": "VINO BLANCO DEL NORTE",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "VINO MALBEC (COPA)",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "VINO DE ALTURA (BOTELLA)",
    "descripcion": "SELECCIÓN DE LA CASA",
    "precio": 18000,
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
    values (v_rid, v_nombre, 'Cocina regional del norte: empanadas, locro, cordero y más')
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
