-- Menú de DEMOSTRACIÓN para HATTOGU JUJUY (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'hattogu-jujuy';
  v_nombre   text    := 'Hattogu Jujuy';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "SUSHI Y ROLLS",
  "productos": [
   {
    "nombre": "ROLL CALIFORNIA (10 PIEZAS)",
    "descripcion": "SALMÓN, PALTA, PEPINO Y SÉSAMO",
    "precio": 12500,
    "destacado": true
   },
   {
    "nombre": "ROLL PHILADELPHIA (10 PIEZAS)",
    "descripcion": "SALMÓN, QUESO CREMA Y CEBOLLA DE VERDEO",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "ROLL FURAI (10 PIEZAS)",
    "descripcion": "POLLO FRITO, QUESO CREMA Y PALTA",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "ROLL VEGGIE (10 PIEZAS)",
    "descripcion": "PALTA, PEPINO, ZANAHORIA Y QUESO CREMA",
    "precio": 11000,
    "destacado": false
   },
   {
    "nombre": "ROLL HATTOGU (10 PIEZAS)",
    "descripcion": "SALMÓN FLAMEADO, LANGOSTINO, PALTA Y SALSA ANGUILA",
    "precio": 15500,
    "destacado": true
   },
   {
    "nombre": "NIGIRI DE SALMÓN (2 PIEZAS)",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "SASHIMI DE SALMÓN (5 PIEZAS)",
    "descripcion": "",
    "precio": 9500,
    "destacado": false
   },
   {
    "nombre": "COMBO 30 PIEZAS",
    "descripcion": "SELECCIÓN DEL CHEF PARA COMPARTIR",
    "precio": 34000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PANCHOS",
  "productos": [
   {
    "nombre": "PANCHO CLÁSICO",
    "descripcion": "SALCHICHA, PAN BRIOCHE Y SALSAS A ELECCIÓN",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "PANCHO CON PAPAS PAY",
    "descripcion": "SALCHICHA, PAPAS PAY Y SALSAS A ELECCIÓN",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "PANCHO CON CHEDDAR Y PANCETA",
    "descripcion": "SALCHICHA, CHEDDAR FUNDIDO Y PANCETA CRUJIENTE",
    "precio": 7000,
    "destacado": false
   },
   {
    "nombre": "PANCHO KATSU",
    "descripcion": "SALCHICHA REBOZADA CON PANKO, REPOLLO Y SALSA KATSU",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "PANCHO TERIYAKI",
    "descripcion": "SALCHICHA, SALSA TERIYAKI, CEBOLLA CRISPY Y SÉSAMO",
    "precio": 7200,
    "destacado": true
   },
   {
    "nombre": "PANCHO KIMCHI",
    "descripcion": "SALCHICHA, KIMCHI Y MAYONESA PICANTE",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "PANCHO VEGGIE",
    "descripcion": "SALCHICHA VEGETAL, PALTA Y CEBOLLA CARAMELIZADA",
    "precio": 6800,
    "destacado": false
   },
   {
    "nombre": "COMBO PANCHO + BEBIDA",
    "descripcion": "PANCHO CLÁSICO Y GASEOSA 500CC",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "PANCHO PAPAS Y BEBIDA XL",
    "descripcion": "",
    "precio": 9500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "ENTRADAS",
  "productos": [
   {
    "nombre": "GYOZAS DE CERDO (6 UNIDADES)",
    "descripcion": "CON SALSA PONZU",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "GYOZAS VEGETALES (6 UNIDADES)",
    "descripcion": "",
    "precio": 7000,
    "destacado": false
   },
   {
    "nombre": "EDAMAME",
    "descripcion": "CON SAL MARINA",
    "precio": 5000,
    "destacado": false
   },
   {
    "nombre": "TEMPURA DE LANGOSTINOS",
    "descripcion": "5 UNIDADES CON SALSA TENTSUYU",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "TAKOYAKI (6 UNIDADES)",
    "descripcion": "BOLITAS DE PULPO CON SALSA Y KATSUOBUSHI",
    "precio": 8000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PLATOS CALIENTES",
  "productos": [
   {
    "nombre": "YAKISOBA DE POLLO",
    "descripcion": "FIDEOS SALTEADOS CON VERDURAS",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "YAKISOBA DE CARNE",
    "descripcion": "FIDEOS SALTEADOS CON VERDURAS",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "POLLO KATSU CON ARROZ",
    "descripcion": "MILANESA JAPONESA, ARROZ Y ENSALADA DE REPOLLO",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "RAMEN DE CERDO",
    "descripcion": "CALDO DE CERDO, FIDEOS, HUEVO MARINADO Y CEBOLLA DE VERDEO",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "GOHAN TERIYAKI",
    "descripcion": "ARROZ, POLLO TERIYAKI Y VERDURAS",
    "precio": 12000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "POSTRES",
  "productos": [
   {
    "nombre": "MOCHI DE MATCHA (2 UNIDADES)",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "MOCHI DE FRUTILLA (2 UNIDADES)",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "DORAYAKI",
    "descripcion": "PANQUEQUES RELLENOS DE DULCE DE LECHE",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "HELADO TEMPURA",
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
    "nombre": "RAMUNE ORIGINAL",
    "descripcion": "GASEOSA JAPONESA CON BOLITA",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "RAMUNE DE FRUTILLA",
    "descripcion": "GASEOSA JAPONESA CON BOLITA",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "CALPICO",
    "descripcion": "BEBIDA LÁCTEA JAPONESA",
    "precio": 4200,
    "destacado": false
   },
   {
    "nombre": "YAKULT (PACK X5)",
    "descripcion": "LECHE FERMENTADA",
    "precio": 4000,
    "destacado": false
   },
   {
    "nombre": "TÉ VERDE HELADO",
    "descripcion": "TÉ VERDE JAPONÉS EN BOTELLA",
    "precio": 4000,
    "destacado": false
   },
   {
    "nombre": "MATCHA LATTE",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "BUBBLE TEA DE TARO",
    "descripcion": "CON PERLAS DE TAPIOCA",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "BUBBLE TEA DE FRUTILLA",
    "descripcion": "CON PERLAS DE TAPIOCA",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "CERVEZA ASAHI 330CC",
    "descripcion": "CERVEZA JAPONESA",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "CERVEZA SAPPORO 330CC",
    "descripcion": "CERVEZA JAPONESA",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "CERVEZA KIRIN ICHIBAN 330CC",
    "descripcion": "CERVEZA JAPONESA",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "CERVEZA TSINGTAO 330CC",
    "descripcion": "CERVEZA CHINA",
    "precio": 5200,
    "destacado": false
   },
   {
    "nombre": "SAKE (COPA)",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "SAKE (BOTELLA 300CC)",
    "descripcion": "",
    "precio": 14000,
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
    values (v_rid, v_nombre, 'Sushi, panchos, platos calientes y bebidas asiáticas')
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
