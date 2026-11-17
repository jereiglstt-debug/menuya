-- Menú de DEMOSTRACIÓN para SUSHI EXPRESS (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'sushi-express';
  v_nombre   text    := 'Sushi Express';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "ENTRADAS",
  "productos": [
   {
    "nombre": "EDAMAME",
    "descripcion": "CON SAL MARINA",
    "precio": 5000,
    "destacado": false
   },
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
    "nombre": "ROLLITOS PRIMAVERA (4 UNIDADES)",
    "descripcion": "RELLENOS DE VERDURAS, CON SALSA AGRIDULCE",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "TEMPURA DE LANGOSTINOS",
    "descripcion": "5 UNIDADES",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "SOPA MISO",
    "descripcion": "TOFU, ALGAS Y CEBOLLA DE VERDEO",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "ENSALADA DE ALGAS WAKAME",
    "descripcion": "",
    "precio": 7500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "ROLLS CLÁSICOS",
  "productos": [
   {
    "nombre": "CALIFORNIA ROLL (10 PIEZAS)",
    "descripcion": "SALMÓN, PALTA Y PEPINO",
    "precio": 12000,
    "destacado": true
   },
   {
    "nombre": "PHILADELPHIA ROLL (10 PIEZAS)",
    "descripcion": "SALMÓN, QUESO CREMA Y CEBOLLA DE VERDEO",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "KANI ROLL (10 PIEZAS)",
    "descripcion": "KANIKAMA, PALTA Y PEPINO",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "ROLL DE ATÚN (10 PIEZAS)",
    "descripcion": "",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "ROLL VEGGIE (10 PIEZAS)",
    "descripcion": "PALTA, PEPINO, ZANAHORIA Y QUESO CREMA",
    "precio": 10500,
    "destacado": false
   },
   {
    "nombre": "TEMAKI DE SALMÓN",
    "descripcion": "CONO DE ALGA RELLENO",
    "precio": 9500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "ROLLS ESPECIALES",
  "productos": [
   {
    "nombre": "DRAGON ROLL (10 PIEZAS)",
    "descripcion": "LANGOSTINO TEMPURA, PALTA Y SALSA ANGUILA",
    "precio": 16000,
    "destacado": true
   },
   {
    "nombre": "ROLL FLAMEADO (10 PIEZAS)",
    "descripcion": "SALMÓN FLAMEADO, QUESO CREMA Y SALSA ESPECIAL",
    "precio": 15500,
    "destacado": false
   },
   {
    "nombre": "FURAI ROLL (10 PIEZAS)",
    "descripcion": "POLLO FRITO, PALTA Y QUESO CREMA",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "ROLL CRUNCHY (10 PIEZAS)",
    "descripcion": "SALMÓN, CEBOLLA CRISPY Y SALSA SPICY",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "ROLL EXPRESS (10 PIEZAS)",
    "descripcion": "SALMÓN, LANGOSTINO, PALTA Y SÉSAMO TOSTADO",
    "precio": 15000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "NIGIRIS Y SASHIMI",
  "productos": [
   {
    "nombre": "NIGIRI DE SALMÓN (2 PIEZAS)",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "NIGIRI DE ATÚN (2 PIEZAS)",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "NIGIRI DE LANGOSTINO (2 PIEZAS)",
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
    "nombre": "SASHIMI MIXTO (9 PIEZAS)",
    "descripcion": "SALMÓN, ATÚN Y PESCADO BLANCO",
    "precio": 16000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "COMBOS",
  "productos": [
   {
    "nombre": "COMBO 20 PIEZAS",
    "descripcion": "SELECCIÓN DE ROLLS CLÁSICOS",
    "precio": 23000,
    "destacado": false
   },
   {
    "nombre": "COMBO 30 PIEZAS",
    "descripcion": "ROLLS CLÁSICOS Y NIGIRIS",
    "precio": 33000,
    "destacado": true
   },
   {
    "nombre": "COMBO 50 PIEZAS",
    "descripcion": "ROLLS CLÁSICOS Y ESPECIALES PARA COMPARTIR",
    "precio": 52000,
    "destacado": false
   },
   {
    "nombre": "COMBO VEGGIE (20 PIEZAS)",
    "descripcion": "",
    "precio": 20000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "COCINA ASIÁTICA",
  "productos": [
   {
    "nombre": "YAKISOBA DE POLLO",
    "descripcion": "FIDEOS SALTEADOS CON VERDURAS",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "YAKISOBA DE CARNE",
    "descripcion": "",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "YAKISOBA DE LANGOSTINOS",
    "descripcion": "",
    "precio": 15000,
    "destacado": false
   },
   {
    "nombre": "ARROZ CHAUFA",
    "descripcion": "ARROZ SALTEADO CON HUEVO, VERDURAS Y POLLO",
    "precio": 12000,
    "destacado": false
   },
   {
    "nombre": "POLLO AGRIDULCE",
    "descripcion": "CON ARROZ BLANCO",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "POLLO KATSU CON ARROZ",
    "descripcion": "MILANESA JAPONESA Y ENSALADA DE REPOLLO",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "RAMEN DE CERDO",
    "descripcion": "CALDO, FIDEOS, HUEVO MARINADO Y CEBOLLA DE VERDEO",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "PAD THAI DE POLLO",
    "descripcion": "FIDEOS DE ARROZ, MANÍ Y LIMA",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "TERIYAKI DE SALMÓN",
    "descripcion": "CON ARROZ Y VEGETALES",
    "precio": 17500,
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
    "descripcion": "CON DULCE DE LECHE",
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
    "nombre": "RAMUNE",
    "descripcion": "GASEOSA JAPONESA",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "TÉ VERDE HELADO",
    "descripcion": "",
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
    "nombre": "CERVEZA ASAHI 330CC",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "CERVEZA SAPPORO 330CC",
    "descripcion": "",
    "precio": 5500,
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
   },
   {
    "nombre": "UMESHU",
    "descripcion": "LICOR JAPONÉS DE CIRUELA",
    "precio": 6000,
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
    values (v_rid, v_nombre, 'Sushi, rolls y cocina asiática')
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
