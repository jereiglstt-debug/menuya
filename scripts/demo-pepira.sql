-- Menú de DEMOSTRACIÓN para PEPIRA (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'pepira';
  v_nombre   text    := 'Pepira';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "PICADAS Y ENTRADAS",
  "productos": [
   {
    "nombre": "PICADA PEPIRA",
    "descripcion": "FIAMBRES, QUESOS, ACEITUNAS, PAPAS Y PAN CASERO PARA 3 PERSONAS",
    "precio": 20000,
    "destacado": true
   },
   {
    "nombre": "EMPANADAS DE CARNE (X3)",
    "descripcion": "",
    "precio": 6300,
    "destacado": false
   },
   {
    "nombre": "EMPANADAS DE JAMÓN Y QUESO (X3)",
    "descripcion": "",
    "precio": 6300,
    "destacado": false
   },
   {
    "nombre": "EMPANADAS DE POLLO (X3)",
    "descripcion": "",
    "precio": 6300,
    "destacado": false
   },
   {
    "nombre": "PAPAS FRITAS",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "PAPAS CON CHEDDAR Y VERDEO",
    "descripcion": "",
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
    "nombre": "PROVOLETA",
    "descripcion": "CON ORÉGANO Y TOMATE",
    "precio": 8000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PIZZAS",
  "productos": [
   {
    "nombre": "MUZZARELLA",
    "descripcion": "",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "NAPOLITANA",
    "descripcion": "MUZZARELLA, TOMATE Y AJO",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "FUGAZZETA",
    "descripcion": "",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "JAMÓN Y MORRONES",
    "descripcion": "",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "CALABRESA",
    "descripcion": "",
    "precio": 15000,
    "destacado": false
   },
   {
    "nombre": "CUATRO QUESOS",
    "descripcion": "MUZZARELLA, PROVOLONE, ROQUEFORT Y PARMESANO",
    "precio": 16000,
    "destacado": false
   },
   {
    "nombre": "PEPIRA ESPECIAL",
    "descripcion": "MUZZARELLA, JAMÓN, HUEVO, MORRONES Y ACEITUNAS",
    "precio": 16500,
    "destacado": true
   }
  ]
 },
 {
  "categoria": "PASTAS",
  "productos": [
   {
    "nombre": "ÑOQUIS DE PAPA",
    "descripcion": "CON SALSA A ELECCIÓN",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "RAVIOLES DE VERDURA",
    "descripcion": "CON SALSA A ELECCIÓN",
    "precio": 12000,
    "destacado": false
   },
   {
    "nombre": "SORRENTINOS DE JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "TALLARINES CON BOLOGNESA",
    "descripcion": "",
    "precio": 11800,
    "destacado": false
   },
   {
    "nombre": "LASAÑA DE CARNE",
    "descripcion": "",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "CANELONES DE VERDURA",
    "descripcion": "GRATINADOS",
    "precio": 12500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "CARNES Y MINUTAS",
  "productos": [
   {
    "nombre": "MILANESA NAPOLITANA",
    "descripcion": "CON PAPAS FRITAS",
    "precio": 14500,
    "destacado": true
   },
   {
    "nombre": "MILANESA DE POLLO",
    "descripcion": "",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "SUPREMA A LA SUIZA",
    "descripcion": "JAMÓN, QUESO Y CREMA",
    "precio": 14000,
    "destacado": false
   },
   {
    "nombre": "BIFE DE CHORIZO",
    "descripcion": "CON GUARNICIÓN A ELECCIÓN",
    "precio": 18500,
    "destacado": false
   },
   {
    "nombre": "ASADO DE TIRA",
    "descripcion": "",
    "precio": 17500,
    "destacado": false
   },
   {
    "nombre": "POLLO AL VERDEO",
    "descripcion": "CON PURÉ",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "MERLUZA A LA ROMANA",
    "descripcion": "",
    "precio": 13000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "SANDWICHES Y HAMBURGUESAS",
  "productos": [
   {
    "nombre": "LOMITO COMPLETO",
    "descripcion": "",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "HAMBURGUESA CLÁSICA",
    "descripcion": "",
    "precio": 11000,
    "destacado": false
   },
   {
    "nombre": "HAMBURGUESA CHEDDAR Y PANCETA",
    "descripcion": "",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "SÁNDWICH DE MILANESA",
    "descripcion": "",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "TOSTADO DE JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "SÁNDWICHES DE MIGA (X6)",
    "descripcion": "JAMÓN Y QUESO",
    "precio": 7500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "ENSALADAS",
  "productos": [
   {
    "nombre": "ENSALADA CÉSAR",
    "descripcion": "POLLO, LECHUGA, CROUTONS Y PARMESANO",
    "precio": 10500,
    "destacado": false
   },
   {
    "nombre": "ENSALADA CAPRESE",
    "descripcion": "",
    "precio": 9500,
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
    "nombre": "FLAN CON DULCE DE LECHE",
    "descripcion": "CON CREMA",
    "precio": 5000,
    "destacado": false
   },
   {
    "nombre": "VIGILANTE",
    "descripcion": "QUESO Y DULCE DE BATATA",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "TIRAMISÚ",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "BROWNIE CON HELADO",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "PANQUEQUES DE DULCE DE LECHE",
    "descripcion": "",
    "precio": 5500,
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
    "nombre": "AGUA MINERAL 500CC",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "JUGO DE NARANJA EXPRIMIDO",
    "descripcion": "",
    "precio": 4800,
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
    "nombre": "VINO MALBEC (COPA)",
    "descripcion": "",
    "precio": 4800,
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
    "nombre": "APEROL SPRITZ",
    "descripcion": "APEROL, PROSECCO, SODA Y NARANJA",
    "precio": 6500,
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
    values (v_rid, v_nombre, 'Picadas, pizzas, pastas, carnes y bebidas')
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
