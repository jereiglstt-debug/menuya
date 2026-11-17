-- Menú de DEMOSTRACIÓN para EL ENCUENTRO (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'el-encuentro';
  v_nombre   text    := 'El Encuentro';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "CAFETERÍA",
  "productos": [
   {
    "nombre": "CAFÉ ESPRESSO",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
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
    "nombre": "LATTE",
    "descripcion": "",
    "precio": 3900,
    "destacado": false
   },
   {
    "nombre": "SUBMARINO",
    "descripcion": "LECHE CALIENTE CON BARRA DE CHOCOLATE",
    "precio": 4200,
    "destacado": false
   },
   {
    "nombre": "TÉ O INFUSIÓN",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "LICUADO DE FRUTAS",
    "descripcion": "BANANA, FRUTILLA O DURAZNO",
    "precio": 4800,
    "destacado": false
   },
   {
    "nombre": "JUGO DE NARANJA EXPRIMIDO",
    "descripcion": "",
    "precio": 4800,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "DESAYUNOS Y BRUNCH",
  "productos": [
   {
    "nombre": "DESAYUNO ENCUENTRO",
    "descripcion": "CAFÉ O TÉ, JUGO EXPRIMIDO Y 2 MEDIALUNAS",
    "precio": 8500,
    "destacado": true
   },
   {
    "nombre": "TOSTADO DE JAMÓN Y QUESO",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "TOSTADA CON PALTA Y HUEVO",
    "descripcion": "",
    "precio": 7800,
    "destacado": false
   },
   {
    "nombre": "HUEVOS REVUELTOS CON TOSTADAS",
    "descripcion": "",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "PANQUEQUES CON FRUTAS",
    "descripcion": "CON MIEL O DULCE DE LECHE",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "YOGUR CON GRANOLA Y FRUTAS",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "MEDIALUNAS (X3)",
    "descripcion": "",
    "precio": 3000,
    "destacado": false
   },
   {
    "nombre": "BRUNCH PARA DOS",
    "descripcion": "CAFÉ, JUGO, TOSTADOS, HUEVOS, FACTURAS Y FRUTAS",
    "precio": 19000,
    "destacado": true
   }
  ]
 },
 {
  "categoria": "PASTELERÍA",
  "productos": [
   {
    "nombre": "BROWNIE",
    "descripcion": "",
    "precio": 4500,
    "destacado": false
   },
   {
    "nombre": "CHEESECAKE DE FRUTOS ROJOS",
    "descripcion": "",
    "precio": 6500,
    "destacado": false
   },
   {
    "nombre": "TORTA DE ZANAHORIA",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "LEMON PIE",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "ALFAJOR DE MAICENA",
    "descripcion": "",
    "precio": 2500,
    "destacado": false
   },
   {
    "nombre": "BUDÍN DE LIMÓN",
    "descripcion": "",
    "precio": 4200,
    "destacado": false
   },
   {
    "nombre": "FACTURAS (DOCENA)",
    "descripcion": "",
    "precio": 9000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "ENTRADAS Y PICADAS",
  "productos": [
   {
    "nombre": "PICADA ENCUENTRO",
    "descripcion": "FIAMBRES, QUESOS, ACEITUNAS Y PAN PARA 3 PERSONAS",
    "precio": 19000,
    "destacado": false
   },
   {
    "nombre": "PAPAS FRITAS",
    "descripcion": "",
    "precio": 6000,
    "destacado": false
   },
   {
    "nombre": "RABAS",
    "descripcion": "",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "EMPANADAS DE CARNE (X3)",
    "descripcion": "",
    "precio": 6300,
    "destacado": false
   },
   {
    "nombre": "PROVOLETA",
    "descripcion": "",
    "precio": 8000,
    "destacado": false
   },
   {
    "nombre": "NACHOS CON GUACAMOLE",
    "descripcion": "",
    "precio": 9500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PLATOS PRINCIPALES",
  "productos": [
   {
    "nombre": "MILANESA NAPOLITANA",
    "descripcion": "CON PAPAS FRITAS",
    "precio": 14500,
    "destacado": true
   },
   {
    "nombre": "SUPREMA CON PURÉ",
    "descripcion": "",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "BIFE DE CHORIZO",
    "descripcion": "CON GUARNICIÓN A ELECCIÓN",
    "precio": 18500,
    "destacado": false
   },
   {
    "nombre": "RAVIOLES CON SALSA MIXTA",
    "descripcion": "",
    "precio": 12500,
    "destacado": false
   },
   {
    "nombre": "ÑOQUIS CON BOLOGNESA",
    "descripcion": "",
    "precio": 12000,
    "destacado": false
   },
   {
    "nombre": "SALMÓN GRILLADO",
    "descripcion": "CON VEGETALES",
    "precio": 19500,
    "destacado": false
   },
   {
    "nombre": "RISOTTO DE HONGOS",
    "descripcion": "",
    "precio": 14000,
    "destacado": false
   },
   {
    "nombre": "HAMBURGUESA CON PAPAS",
    "descripcion": "MEDALLÓN, QUESO, LECHUGA Y TOMATE",
    "precio": 12500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "ENSALADAS Y SANDWICHES",
  "productos": [
   {
    "nombre": "ENSALADA CÉSAR",
    "descripcion": "",
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
   },
   {
    "nombre": "CLUB SANDWICH",
    "descripcion": "",
    "precio": 12000,
    "destacado": false
   },
   {
    "nombre": "LOMITO COMPLETO",
    "descripcion": "",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "WRAP DE POLLO",
    "descripcion": "",
    "precio": 10500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "BEBIDAS Y TRAGOS",
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
    "nombre": "APEROL SPRITZ",
    "descripcion": "APEROL, PROSECCO, SODA Y NARANJA",
    "precio": 6500,
    "destacado": true
   },
   {
    "nombre": "GIN TONIC",
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
    values (v_rid, v_nombre, 'Café, brunch, pastelería, platos y tragos')
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
