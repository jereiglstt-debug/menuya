-- Menú de DEMOSTRACIÓN para BARROJO S (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'barrojo-s';
  v_nombre   text    := 'Barrojo S';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "PICADAS Y PARA COMPARTIR",
  "productos": [
   {
    "nombre": "PICADA BARROJO",
    "descripcion": "FIAMBRES, QUESOS, ACEITUNAS, PAPAS FRITAS Y PAN PARA 3 PERSONAS",
    "precio": 21000,
    "destacado": true
   },
   {
    "nombre": "PAPAS FRITAS",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "PAPAS CON CHEDDAR Y PANCETA",
    "descripcion": "",
    "precio": 9000,
    "destacado": false
   },
   {
    "nombre": "RABAS",
    "descripcion": "CON SALSA TÁRTARA Y LIMÓN",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "NACHOS CON GUACAMOLE",
    "descripcion": "",
    "precio": 9500,
    "destacado": false
   },
   {
    "nombre": "AROS DE CEBOLLA",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "BASTONES DE MUZZARELLA (X6)",
    "descripcion": "CON SALSA POMODORO",
    "precio": 7800,
    "destacado": false
   },
   {
    "nombre": "ALITAS DE POLLO (X8)",
    "descripcion": "BBQ, PICANTES O NATURALES",
    "precio": 10500,
    "destacado": false
   },
   {
    "nombre": "PROVOLETA",
    "descripcion": "CON ORÉGANO",
    "precio": 8000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "HAMBURGUESAS",
  "productos": [
   {
    "nombre": "CLÁSICA",
    "descripcion": "MEDALLÓN, LECHUGA, TOMATE Y QUESO",
    "precio": 11000,
    "destacado": false
   },
   {
    "nombre": "CHEDDAR Y PANCETA",
    "descripcion": "MEDALLÓN, CHEDDAR Y PANCETA CRUJIENTE",
    "precio": 13000,
    "destacado": true
   },
   {
    "nombre": "BARROJO",
    "descripcion": "DOBLE MEDALLÓN, CHEDDAR, CEBOLLA CRISPY Y SALSA BBQ",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "BBQ",
    "descripcion": "MEDALLÓN, CEBOLLA CARAMELIZADA Y SALSA BBQ AHUMADA",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "VEGGIE",
    "descripcion": "MEDALLÓN DE LENTEJAS, PALTA Y RÚCULA",
    "precio": 12000,
    "destacado": false
   },
   {
    "nombre": "DE POLLO CRISPY",
    "descripcion": "",
    "precio": 12500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "SANDWICHES Y PIZZAS",
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
    "nombre": "CLUB SANDWICH",
    "descripcion": "",
    "precio": 12000,
    "destacado": false
   },
   {
    "nombre": "PIZZA MUZZARELLA",
    "descripcion": "",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "PIZZA NAPOLITANA",
    "descripcion": "MUZZARELLA, TOMATE Y AJO",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "PIZZA FUGAZZETA",
    "descripcion": "",
    "precio": 13000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PLATOS",
  "productos": [
   {
    "nombre": "MILANESA NAPOLITANA",
    "descripcion": "CON PAPAS FRITAS",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "BIFE DE CHORIZO",
    "descripcion": "CON GUARNICIÓN A ELECCIÓN",
    "precio": 18500,
    "destacado": false
   },
   {
    "nombre": "POLLO A LA PLANCHA",
    "descripcion": "CON ENSALADA MIXTA",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "ÑOQUIS DE PAPA",
    "descripcion": "CON SALSA A ELECCIÓN",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "ENSALADA CÉSAR",
    "descripcion": "POLLO, LECHUGA, CROUTONS Y PARMESANO",
    "precio": 10500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "POSTRES",
  "productos": [
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
   },
   {
    "nombre": "CHEESECAKE DE FRUTOS ROJOS",
    "descripcion": "",
    "precio": 6800,
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
  "categoria": "CERVEZAS",
  "productos": [
   {
    "nombre": "CERVEZA RUBIA 1 L",
    "descripcion": "",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "CERVEZA ARTESANAL RUBIA 500CC",
    "descripcion": "SUAVE Y REFRESCANTE",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "CERVEZA ARTESANAL IPA 500CC",
    "descripcion": "AMARGOR MEDIO Y NOTAS CÍTRICAS",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "CERVEZA ARTESANAL ROJA 500CC",
    "descripcion": "NOTAS A CARAMELO",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "CERVEZA ARTESANAL NEGRA 500CC",
    "descripcion": "TOSTADA, CON NOTAS A CHOCOLATE",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "JARRA DE CERVEZA ARTESANAL 1 L",
    "descripcion": "",
    "precio": 10500,
    "destacado": false
   },
   {
    "nombre": "PROMO 2 PINTAS",
    "descripcion": "DOS CERVEZAS ARTESANALES A ELECCIÓN",
    "precio": 10000,
    "destacado": true
   }
  ]
 },
 {
  "categoria": "TRAGOS",
  "productos": [
   {
    "nombre": "FERNET CON COLA",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "GIN TONIC",
    "descripcion": "GIN, AGUA TÓNICA Y LIMÓN",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "APEROL SPRITZ",
    "descripcion": "APEROL, PROSECCO, SODA Y NARANJA",
    "precio": 6500,
    "destacado": true
   },
   {
    "nombre": "NEGRONI",
    "descripcion": "GIN, CAMPARI Y VERMUT ROSSO",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "MOJITO",
    "descripcion": "RON, LIMA, MENTA Y SODA",
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
    "nombre": "DAIQUIRI DE FRUTILLA",
    "descripcion": "",
    "precio": 6800,
    "destacado": false
   },
   {
    "nombre": "MARGARITA",
    "descripcion": "TEQUILA, TRIPLE SEC Y LIMÓN",
    "precio": 7000,
    "destacado": false
   },
   {
    "nombre": "CAMPARI CON NARANJA",
    "descripcion": "",
    "precio": 5800,
    "destacado": false
   },
   {
    "nombre": "VINO MALBEC (COPA)",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "SIN ALCOHOL",
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
    "nombre": "LIMONADA CON MENTA Y JENGIBRE",
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
    values (v_rid, v_nombre, 'Picadas, hamburguesas, cervezas y tragos')
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
