-- Menú de DEMOSTRACIÓN para THE BLACK S (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'the-black-s';
  v_nombre   text    := 'The Black S';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "PARA EMPEZAR",
  "productos": [
   {
    "nombre": "NACHOS BLACK",
    "descripcion": "TOTOPOS, CHEDDAR, GUACAMOLE, JALAPEÑOS Y CREMA",
    "precio": 10500,
    "destacado": true
   },
   {
    "nombre": "ALITAS DE POLLO (X8)",
    "descripcion": "BBQ, PICANTES O NATURALES",
    "precio": 10500,
    "destacado": false
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
    "nombre": "PROVOLETA",
    "descripcion": "",
    "precio": 8000,
    "destacado": false
   },
   {
    "nombre": "TABLA BLACK",
    "descripcion": "ALITAS, AROS, PAPAS, NUGGETS Y BASTONES PARA 4 PERSONAS",
    "precio": 24000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "HAMBURGUESAS",
  "productos": [
   {
    "nombre": "THE BLACK",
    "descripcion": "DOBLE MEDALLÓN, CHEDDAR, PANCETA, CEBOLLA CRISPY Y SALSA BLACK, EN PAN NEGRO",
    "precio": 14500,
    "destacado": true
   },
   {
    "nombre": "CLÁSICA",
    "descripcion": "MEDALLÓN, LECHUGA, TOMATE Y QUESO",
    "precio": 11000,
    "destacado": false
   },
   {
    "nombre": "CHEDDAR Y PANCETA",
    "descripcion": "",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "BBQ SMOKY",
    "descripcion": "MEDALLÓN, CEBOLLA CARAMELIZADA Y SALSA BBQ AHUMADA",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "PICANTE",
    "descripcion": "MEDALLÓN, JALAPEÑOS, PEPPER JACK Y SALSA SRIRACHA",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "CRISPY CHICKEN",
    "descripcion": "POLLO FRITO, LECHUGA Y MAYONESA",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "VEGGIE",
    "descripcion": "MEDALLÓN DE LENTEJAS, PALTA Y RÚCULA",
    "precio": 12000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PARRILLA Y COSTILLAS",
  "productos": [
   {
    "nombre": "COSTILLAS BBQ",
    "descripcion": "COSTILLAR DE CERDO CON SALSA BBQ Y PAPAS RÚSTICAS",
    "precio": 21000,
    "destacado": true
   },
   {
    "nombre": "BIFE DE CHORIZO",
    "descripcion": "CON GUARNICIÓN A ELECCIÓN",
    "precio": 19000,
    "destacado": false
   },
   {
    "nombre": "VACÍO AL HORNO",
    "descripcion": "CON PAPAS Y ENSALADA",
    "precio": 18500,
    "destacado": false
   },
   {
    "nombre": "BONDIOLA BRASEADA",
    "descripcion": "CON PURÉ DE BATATA",
    "precio": 16500,
    "destacado": false
   },
   {
    "nombre": "POLLO GRILLADO",
    "descripcion": "",
    "precio": 13500,
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
    "nombre": "PULLED PORK",
    "descripcion": "CERDO DESMECHADO, COLESLAW Y SALSA BBQ",
    "precio": 14000,
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
    "nombre": "CHORIPÁN",
    "descripcion": "",
    "precio": 7500,
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
    "nombre": "CHEESECAKE DE FRUTOS ROJOS",
    "descripcion": "",
    "precio": 6800,
    "destacado": false
   },
   {
    "nombre": "VOLCÁN DE CHOCOLATE",
    "descripcion": "CON CORAZÓN FUNDIDO Y HELADO DE CREMA",
    "precio": 7200,
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
  "categoria": "CERVEZAS",
  "productos": [
   {
    "nombre": "CERVEZA RUBIA 1 L",
    "descripcion": "",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "ARTESANAL RUBIA 500CC",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "ARTESANAL IPA 500CC",
    "descripcion": "AMARGOR MEDIO Y NOTAS CÍTRICAS",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "ARTESANAL STOUT 500CC",
    "descripcion": "TOSTADA, CON NOTAS A CAFÉ Y CHOCOLATE",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "JARRA ARTESANAL 1 L",
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
  "categoria": "TRAGOS DE AUTOR",
  "productos": [
   {
    "nombre": "BLACK MULE",
    "descripcion": "VODKA, JENGIBRE, LIMA Y CARBÓN ACTIVADO",
    "precio": 7500,
    "destacado": true
   },
   {
    "nombre": "OLD FASHIONED",
    "descripcion": "BOURBON, AZÚCAR, BITTER Y NARANJA",
    "precio": 8000,
    "destacado": false
   },
   {
    "nombre": "NEGRONI",
    "descripcion": "GIN, CAMPARI Y VERMUT ROSSO",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "ESPRESSO MARTINI",
    "descripcion": "VODKA, LICOR DE CAFÉ Y ESPRESSO",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "MOJITO",
    "descripcion": "RON, LIMA, MENTA Y SODA",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "MARGARITA",
    "descripcion": "",
    "precio": 7000,
    "destacado": false
   },
   {
    "nombre": "GIN TONIC",
    "descripcion": "",
    "precio": 6500,
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
 },
 {
  "categoria": "WHISKY Y DESTILADOS",
  "productos": [
   {
    "nombre": "WHISKY BLACK LABEL (TRAGO)",
    "descripcion": "",
    "precio": 8500,
    "destacado": false
   },
   {
    "nombre": "WHISKY BOURBON (TRAGO)",
    "descripcion": "",
    "precio": 8000,
    "destacado": false
   },
   {
    "nombre": "VODKA (TRAGO)",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "GIN (TRAGO)",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "TEQUILA (SHOT)",
    "descripcion": "CON LIMÓN Y SAL",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "RON AÑEJO (TRAGO)",
    "descripcion": "",
    "precio": 7000,
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
    "nombre": "BLACK LEMONADE",
    "descripcion": "LIMONADA CON CARBÓN ACTIVADO Y MENTA",
    "precio": 5000,
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
    values (v_rid, v_nombre, 'Hamburguesas, parrilla, cervezas y tragos de autor')
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
