-- Menú de DEMOSTRACIÓN para NOSTRA PIZZA (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'nostra-pizza';
  v_nombre   text    := 'Nostra Pizza';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "PIZZAS",
  "productos": [
   {
    "nombre": "MUZZARELLA",
    "descripcion": "SALSA DE TOMATE, MUZZARELLA Y ACEITUNAS VERDES",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "NAPOLITANA",
    "descripcion": "MUZZARELLA, TOMATE EN RODAJAS, AJO Y ORÉGANO",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "FUGAZZETA",
    "descripcion": "MUZZARELLA Y CEBOLLA ABUNDANTE",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "FUGAZZETA RELLENA",
    "descripcion": "RELLENA DE JAMÓN Y MUZZARELLA, CON CEBOLLA POR ENCIMA",
    "precio": 16500,
    "destacado": true
   },
   {
    "nombre": "JAMÓN Y MORRONES",
    "descripcion": "MUZZARELLA, JAMÓN COCIDO Y MORRONES",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "CALABRESA",
    "descripcion": "MUZZARELLA Y LONGANIZA CALABRESA",
    "precio": 15000,
    "destacado": false
   },
   {
    "nombre": "ESPECIAL",
    "descripcion": "MUZZARELLA, JAMÓN, HUEVO DURO Y ACEITUNAS",
    "precio": 15500,
    "destacado": false
   },
   {
    "nombre": "CUATRO QUESOS",
    "descripcion": "MUZZARELLA, PROVOLONE, ROQUEFORT Y PARMESANO",
    "precio": 16000,
    "destacado": false
   },
   {
    "nombre": "ROQUEFORT Y NUECES",
    "descripcion": "MUZZARELLA, ROQUEFORT, NUECES Y MIEL",
    "precio": 16500,
    "destacado": false
   },
   {
    "nombre": "RÚCULA Y CRUDO",
    "descripcion": "MUZZARELLA, RÚCULA, JAMÓN CRUDO Y PARMESANO",
    "precio": 17500,
    "destacado": false
   },
   {
    "nombre": "NOSTRA",
    "descripcion": "MUZZARELLA, BONDIOLA, CEBOLLA CARAMELIZADA Y PROVOLETA",
    "precio": 18500,
    "destacado": true
   }
  ]
 },
 {
  "categoria": "PIZZETAS",
  "productos": [
   {
    "nombre": "PIZZETA MUZZARELLA",
    "descripcion": "",
    "precio": 8500,
    "destacado": false
   },
   {
    "nombre": "PIZZETA NAPOLITANA",
    "descripcion": "MUZZARELLA, TOMATE Y ALBAHACA",
    "precio": 9500,
    "destacado": false
   },
   {
    "nombre": "PIZZETA JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 9500,
    "destacado": false
   },
   {
    "nombre": "PIZZETA CALABRESA",
    "descripcion": "MUZZARELLA Y LONGANIZA CALABRESA",
    "precio": 10000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "EMPANADAS",
  "productos": [
   {
    "nombre": "EMPANADA DE CARNE",
    "descripcion": "CARNE CORTADA A CUCHILLO",
    "precio": 1800,
    "destacado": false
   },
   {
    "nombre": "EMPANADA DE JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 1800,
    "destacado": false
   },
   {
    "nombre": "EMPANADA DE POLLO",
    "descripcion": "POLLO, CEBOLLA DE VERDEO Y MORRÓN",
    "precio": 1800,
    "destacado": false
   },
   {
    "nombre": "EMPANADA DE HUMITA",
    "descripcion": "",
    "precio": 1800,
    "destacado": false
   },
   {
    "nombre": "EMPANADA CAPRESE",
    "descripcion": "MUZZARELLA, TOMATE Y ALBAHACA",
    "precio": 1900,
    "destacado": false
   },
   {
    "nombre": "DOCENA DE EMPANADAS",
    "descripcion": "ELEGÍ LOS GUSTOS A TU GUSTO",
    "precio": 20000,
    "destacado": true
   }
  ]
 },
 {
  "categoria": "FAINÁ Y PICADAS",
  "productos": [
   {
    "nombre": "FAINÁ",
    "descripcion": "",
    "precio": 3000,
    "destacado": false
   },
   {
    "nombre": "FAINÁ CON MUZZARELLA",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "PAPAS FRITAS",
    "descripcion": "PORCIÓN PARA COMPARTIR",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "PAPAS CON CHEDDAR Y PANCETA",
    "descripcion": "",
    "precio": 9000,
    "destacado": false
   },
   {
    "nombre": "PICADA NOSTRA",
    "descripcion": "FIAMBRES, QUESOS, ACEITUNAS Y GRISINES PARA 2 PERSONAS",
    "precio": 18000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "POSTRES",
  "productos": [
   {
    "nombre": "FLAN CASERO",
    "descripcion": "CON DULCE DE LECHE Y CREMA",
    "precio": 5000,
    "destacado": false
   },
   {
    "nombre": "TIRAMISÚ",
    "descripcion": "",
    "precio": 5800,
    "destacado": false
   },
   {
    "nombre": "BROWNIE CON HELADO",
    "descripcion": "CON HELADO DE CREMA AMERICANA",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "HELADO (2 BOLAS)",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "PANQUEQUE DE DULCE DE LECHE",
    "descripcion": "",
    "precio": 5500,
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
    "nombre": "AGUA CON GAS 500CC",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "JARRA DE LIMONADA 1 L",
    "descripcion": "CON MENTA Y JENGIBRE",
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
    "nombre": "VINO TINTO (COPA)",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "VINO MALBEC (BOTELLA)",
    "descripcion": "SELECCIÓN DE LA CASA",
    "precio": 16000,
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
    values (v_rid, v_nombre, 'Pizzas, empanadas, postres y bebidas')
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
