-- Menú de DEMOSTRACIÓN para EL DUENDE VERDE (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'el-duende-verde';
  v_nombre   text    := 'El Duende Verde';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "DESAYUNOS Y MERIENDAS",
  "productos": [
   {
    "nombre": "CAFÉ CON LECHE",
    "descripcion": "",
    "precio": 3200,
    "destacado": false
   },
   {
    "nombre": "CAPUCCINO",
    "descripcion": "ESPRESSO, LECHE VAPORIZADA Y ESPUMA",
    "precio": 3800,
    "destacado": false
   },
   {
    "nombre": "TÉ O INFUSIÓN",
    "descripcion": "VERDE, NEGRO, MANZANILLA O MENTA",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "TOSTADA CON PALTA Y HUEVO",
    "descripcion": "PAN DE MASA MADRE, PALTA Y HUEVO POCHÉ",
    "precio": 7800,
    "destacado": true
   },
   {
    "nombre": "TOSTADA CON RICOTA Y MIEL",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "YOGUR CON GRANOLA Y FRUTAS",
    "descripcion": "YOGUR NATURAL, GRANOLA CASERA Y FRUTA DE ESTACIÓN",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "BOWL DE AVENA",
    "descripcion": "AVENA CALIENTE CON BANANA Y CANELA",
    "precio": 6200,
    "destacado": false
   },
   {
    "nombre": "MEDIALUNAS (X3)",
    "descripcion": "",
    "precio": 3000,
    "destacado": false
   },
   {
    "nombre": "PROMO DESAYUNO VERDE",
    "descripcion": "CAFÉ O TÉ, JUGO EXPRIMIDO Y TOSTADA A ELECCIÓN",
    "precio": 8500,
    "destacado": true
   }
  ]
 },
 {
  "categoria": "ENSALADAS Y BOWLS",
  "productos": [
   {
    "nombre": "ENSALADA DUENDE VERDE",
    "descripcion": "HOJAS VERDES, PALTA, SEMILLAS, TOMATE CHERRY Y ADEREZO DE LIMÓN",
    "precio": 10500,
    "destacado": true
   },
   {
    "nombre": "ENSALADA CÉSAR",
    "descripcion": "POLLO, LECHUGA, CROUTONS Y PARMESANO",
    "precio": 10500,
    "destacado": false
   },
   {
    "nombre": "ENSALADA CAPRESE",
    "descripcion": "TOMATE, MUZZARELLA Y ALBAHACA",
    "precio": 9500,
    "destacado": false
   },
   {
    "nombre": "BOWL DE QUINOA",
    "descripcion": "QUINOA, VERDURAS ASADAS, GARBANZOS Y TAHINI",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "BOWL DE FALAFEL",
    "descripcion": "FALAFEL, HUMMUS, PEPINO, TOMATE Y PAN PITA",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "ENSALADA DE LENTEJAS",
    "descripcion": "",
    "precio": 9800,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PLATOS VEGETARIANOS",
  "productos": [
   {
    "nombre": "HAMBURGUESA DE LENTEJAS",
    "descripcion": "CON PAPAS RÚSTICAS",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "HAMBURGUESA DE GARBANZOS",
    "descripcion": "CON ENSALADA",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "TARTA DE ZAPALLITOS Y QUESO",
    "descripcion": "CON ENSALADA MIXTA",
    "precio": 8500,
    "destacado": false
   },
   {
    "nombre": "TARTA DE ESPINACA Y RICOTA",
    "descripcion": "",
    "precio": 8500,
    "destacado": false
   },
   {
    "nombre": "RISOTTO DE HONGOS",
    "descripcion": "",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "ÑOQUIS DE CALABAZA",
    "descripcion": "CON SALSA DE QUESOS",
    "precio": 12000,
    "destacado": false
   },
   {
    "nombre": "WOK DE VERDURAS",
    "descripcion": "CON ARROZ INTEGRAL Y SALSA DE SOJA",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "BERENJENAS RELLENAS",
    "descripcion": "CON QUESO Y SALSA DE TOMATE",
    "precio": 12500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PLATOS CON CARNE",
  "productos": [
   {
    "nombre": "POLLO A LA PLANCHA",
    "descripcion": "CON VEGETALES GRILLADOS",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "SALMÓN GRILLADO",
    "descripcion": "CON PURÉ RÚSTICO",
    "precio": 19500,
    "destacado": false
   },
   {
    "nombre": "MILANESA DE POLLO AL HORNO",
    "descripcion": "CON ENSALADA",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "BIFE DE CHORIZO",
    "descripcion": "CON GUARNICIÓN A ELECCIÓN",
    "precio": 18500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "SANDWICHES Y WRAPS",
  "productos": [
   {
    "nombre": "WRAP DE POLLO",
    "descripcion": "",
    "precio": 10500,
    "destacado": false
   },
   {
    "nombre": "WRAP VEGGIE",
    "descripcion": "HUMMUS, VERDURAS Y HOJAS VERDES",
    "precio": 9800,
    "destacado": false
   },
   {
    "nombre": "SÁNDWICH CAPRESE",
    "descripcion": "PAN DE MASA MADRE",
    "precio": 9800,
    "destacado": false
   },
   {
    "nombre": "TOSTADO DE JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "SÁNDWICH DE VEGETALES GRILLADOS",
    "descripcion": "CON QUESO Y PESTO",
    "precio": 9500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "POSTRES Y PASTELERÍA",
  "productos": [
   {
    "nombre": "BROWNIE SIN TACC",
    "descripcion": "",
    "precio": 5800,
    "destacado": false
   },
   {
    "nombre": "CHEESECAKE DE FRUTOS ROJOS",
    "descripcion": "",
    "precio": 6800,
    "destacado": false
   },
   {
    "nombre": "BUDÍN DE BANANA",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "TORTA DE ZANAHORIA",
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
  "categoria": "JUGOS Y LICUADOS",
  "productos": [
   {
    "nombre": "JUGO DE NARANJA EXPRIMIDO",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "LICUADO DE BANANA",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "LICUADO DE FRUTILLA",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "JUGO VERDE",
    "descripcion": "MANZANA, PEPINO, APIO Y JENGIBRE",
    "precio": 5200,
    "destacado": true
   },
   {
    "nombre": "SMOOTHIE DE FRUTOS ROJOS",
    "descripcion": "",
    "precio": 5800,
    "destacado": false
   },
   {
    "nombre": "LIMONADA CON MENTA Y JENGIBRE",
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
    "nombre": "AGUA CON GAS 500CC",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "KOMBUCHA",
    "descripcion": "",
    "precio": 5500,
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
    values (v_rid, v_nombre, 'Cocina natural: desayunos, bowls, platos vegetarianos y jugos')
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
