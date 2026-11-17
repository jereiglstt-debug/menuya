-- Menú de DEMOSTRACIÓN para PATAGONIA JUJUY (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'patagonia-jujuy';
  v_nombre   text    := 'Patagonia Jujuy';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "PIZZAS",
  "productos": [
   {
    "nombre": "MUZZARELLA",
    "descripcion": "SALSA DE TOMATE, MUZZARELLA Y ORÉGANO",
    "precio": 12000,
    "destacado": false
   },
   {
    "nombre": "NAPOLITANA",
    "descripcion": "MUZZARELLA, TOMATE FRESCO, AJO Y ALBAHACA",
    "precio": 14000,
    "destacado": false
   },
   {
    "nombre": "FUGAZZETA",
    "descripcion": "MUZZARELLA Y CEBOLLA CARAMELIZADA",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "JAMÓN Y MORRONES",
    "descripcion": "MUZZARELLA, JAMÓN COCIDO Y MORRONES ASADOS",
    "precio": 15000,
    "destacado": false
   },
   {
    "nombre": "CALABRESA",
    "descripcion": "MUZZARELLA, LONGANIZA CALABRESA Y ACEITUNAS",
    "precio": 15500,
    "destacado": false
   },
   {
    "nombre": "CUATRO QUESOS",
    "descripcion": "MUZZARELLA, PROVOLONE, ROQUEFORT Y PARMESANO",
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
    "nombre": "PATAGONIA",
    "descripcion": "MUZZARELLA, CORDERO DESMECHADO, CEBOLLA MORADA Y CHIMICHURRI",
    "precio": 18500,
    "destacado": true
   },
   {
    "nombre": "FAINÁ",
    "descripcion": "",
    "precio": 3500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "SANDWICHES",
  "productos": [
   {
    "nombre": "LOMITO COMPLETO",
    "descripcion": "LOMO, JAMÓN, QUESO, HUEVO, LECHUGA Y TOMATE",
    "precio": 15500,
    "destacado": true
   },
   {
    "nombre": "MILANESA COMPLETA",
    "descripcion": "MILANESA DE CARNE, LECHUGA, TOMATE Y HUEVO",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "SÁNDWICH DE BONDIOLA",
    "descripcion": "BONDIOLA BRASEADA, CEBOLLA CARAMELIZADA Y PROVOLONE",
    "precio": 15000,
    "destacado": false
   },
   {
    "nombre": "HAMBURGUESA DE LA CASA",
    "descripcion": "MEDALLÓN DE 180 G, CHEDDAR, PANCETA Y SALSA BBQ",
    "precio": 14000,
    "destacado": false
   },
   {
    "nombre": "VEGGIE",
    "descripcion": "MEDALLÓN DE LENTEJAS, PALTA, RÚCULA Y TOMATE",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "CHORIPÁN",
    "descripcion": "",
    "precio": 8500,
    "destacado": false
   },
   {
    "nombre": "TOSTADO DE JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 7000,
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
    "precio": 4000,
    "destacado": false
   },
   {
    "nombre": "AGUA MINERAL 500CC",
    "descripcion": "",
    "precio": 3000,
    "destacado": false
   },
   {
    "nombre": "AGUA CON GAS 500CC",
    "descripcion": "",
    "precio": 3000,
    "destacado": false
   },
   {
    "nombre": "JUGO DE NARANJA EXPRIMIDO",
    "descripcion": "",
    "precio": 5000,
    "destacado": false
   },
   {
    "nombre": "JARRA DE LIMONADA 1L",
    "descripcion": "CON MENTA Y JENGIBRE",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "CERVEZA ARTESANAL RUBIA 500CC",
    "descripcion": "SUAVE Y REFRESCANTE",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "CERVEZA ARTESANAL IPA 500CC",
    "descripcion": "AMARGOR MEDIO Y NOTAS CÍTRICAS",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "CERVEZA ARTESANAL NEGRA 500CC",
    "descripcion": "TOSTADA, CON NOTAS A CHOCOLATE",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "VINO MALBEC (COPA)",
    "descripcion": "SELECCIÓN DE LA CASA",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "VINO MALBEC (BOTELLA 750CC)",
    "descripcion": "SELECCIÓN DE LA CASA",
    "precio": 24000,
    "destacado": false
   },
   {
    "nombre": "CAFÉ",
    "descripcion": "",
    "precio": 3500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "TRAGOS",
  "productos": [
   {
    "nombre": "APEROL SPRITZ",
    "descripcion": "APEROL, PROSECCO, SODA Y NARANJA",
    "precio": 6500,
    "destacado": true
   },
   {
    "nombre": "NEGRONI",
    "descripcion": "GIN, CAMPARI, VERMUT ROSSO Y PIEL DE NARANJA",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "GIN TONIC",
    "descripcion": "GIN, AGUA TÓNICA Y PIEL DE LIMÓN",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "MOJITO",
    "descripcion": "RON, LIMA, MENTA, AZÚCAR Y SODA",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "CAIPIRIÑA",
    "descripcion": "CACHAÇA, LIMA Y AZÚCAR",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "MARGARITA",
    "descripcion": "TEQUILA, TRIPLE SEC, LIMÓN Y SAL",
    "precio": 7000,
    "destacado": false
   },
   {
    "nombre": "PISCO SOUR",
    "descripcion": "PISCO, LIMÓN, CLARA DE HUEVO Y ALMÍBAR",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "FERNET CON COLA",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "PATAGONIA SUNSET",
    "descripcion": "GIN, MARACUYÁ, POMELO Y ALBAHACA",
    "precio": 7000,
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
    values (v_rid, v_nombre, 'Pizzas, sándwiches, bebidas y tragos')
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
