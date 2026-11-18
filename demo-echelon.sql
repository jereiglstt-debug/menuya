-- Menú de DEMOSTRACIÓN para ECHELON (contenido inventado, genérico).
-- Pegar completo en Supabase → SQL Editor → Run.
-- Qué hace: crea el restaurante si no existe (plan Premium, activo, SIN propietario), le carga
-- categorías y productos y, si v_publicar es true, lo publica para que el link ya funcione.
-- Seguro de repetir: no duplica restaurante, categorías ni productos. Todo o nada.
-- Si ya lo creaste desde el panel de administración, también sirve: reutiliza ese restaurante.
do $$
declare
  v_slug     text    := 'echelon';
  v_nombre   text    := 'Echelon';
  v_plan     text    := 'premium';   -- 'basico' | 'profesional' | 'premium'
  v_publicar boolean := true;        -- true = publicar al terminar
  v_carta jsonb := $json$
[
 {
  "categoria": "ENTRADAS",
  "productos": [
   {
    "nombre": "CARPACCIO DE LOMO",
    "descripcion": "LOMO, RÚCULA, PARMESANO Y ALCAPARRAS",
    "precio": 13500,
    "destacado": true
   },
   {
    "nombre": "TARTAR DE SALMÓN",
    "descripcion": "SALMÓN, PALTA, PEPINO Y SÉSAMO",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "BURRATA CON TOMATES CONFITADOS",
    "descripcion": "CON PESTO Y PAN TOSTADO",
    "precio": 13000,
    "destacado": false
   },
   {
    "nombre": "PROVOLETA GOURMET",
    "descripcion": "CON TOMATE CONFITADO Y ALBAHACA",
    "precio": 9500,
    "destacado": false
   },
   {
    "nombre": "CROQUETAS DE JAMÓN IBÉRICO (X6)",
    "descripcion": "",
    "precio": 10500,
    "destacado": false
   },
   {
    "nombre": "TABLA DE QUESOS Y FIAMBRES",
    "descripcion": "SELECCIÓN DE LA CASA PARA 2 PERSONAS",
    "precio": 21000,
    "destacado": false
   },
   {
    "nombre": "CREMA DE CALABAZA",
    "descripcion": "CON CROUTONS Y SEMILLAS",
    "precio": 8500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "ENSALADAS",
  "productos": [
   {
    "nombre": "ENSALADA ECHELON",
    "descripcion": "HOJAS VERDES, PERAS, NUECES Y QUESO AZUL",
    "precio": 11500,
    "destacado": false
   },
   {
    "nombre": "ENSALADA CÉSAR",
    "descripcion": "POLLO, LECHUGA, CROUTONS Y PARMESANO",
    "precio": 10500,
    "destacado": false
   },
   {
    "nombre": "ENSALADA DE QUINOA",
    "descripcion": "QUINOA, PALTA, TOMATE Y LIMÓN",
    "precio": 10000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "CARNES",
  "productos": [
   {
    "nombre": "BIFE DE CHORIZO",
    "descripcion": "CON PURÉ RÚSTICO O PAPAS",
    "precio": 20500,
    "destacado": false
   },
   {
    "nombre": "OJO DE BIFE",
    "descripcion": "CON GUARNICIÓN A ELECCIÓN",
    "precio": 23500,
    "destacado": true
   },
   {
    "nombre": "LOMO AL MALBEC",
    "descripcion": "SALSA DE MALBEC Y PURÉ DE BATATA",
    "precio": 22500,
    "destacado": false
   },
   {
    "nombre": "CORDERO BRASEADO",
    "descripcion": "CON VEGETALES ASADOS",
    "precio": 24000,
    "destacado": false
   },
   {
    "nombre": "MAGRET DE PATO",
    "descripcion": "CON SALSA DE FRUTOS ROJOS",
    "precio": 23000,
    "destacado": false
   },
   {
    "nombre": "POLLO RELLENO",
    "descripcion": "CON QUESO Y ESPINACA",
    "precio": 15500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PESCADOS",
  "productos": [
   {
    "nombre": "SALMÓN AL HORNO",
    "descripcion": "CON PURÉ Y ESPÁRRAGOS",
    "precio": 20500,
    "destacado": false
   },
   {
    "nombre": "TRUCHA A LA MANTECA NEGRA",
    "descripcion": "CON PAPAS NOISETTE",
    "precio": 19000,
    "destacado": false
   },
   {
    "nombre": "LANGOSTINOS AL AJILLO",
    "descripcion": "",
    "precio": 21000,
    "destacado": false
   },
   {
    "nombre": "MERLUZA AL PAPILLOTE",
    "descripcion": "",
    "precio": 17500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "PASTAS",
  "productos": [
   {
    "nombre": "RISOTTO DE HONGOS",
    "descripcion": "",
    "precio": 15500,
    "destacado": false
   },
   {
    "nombre": "RAVIOLES DE OSOBUCO",
    "descripcion": "CON SALSA DE VINO TINTO",
    "precio": 16500,
    "destacado": false
   },
   {
    "nombre": "ÑOQUIS DE PAPA AL PESTO",
    "descripcion": "",
    "precio": 13500,
    "destacado": false
   },
   {
    "nombre": "SORRENTINOS DE CALABAZA",
    "descripcion": "CON SALSA DE QUESOS",
    "precio": 14500,
    "destacado": false
   },
   {
    "nombre": "TAGLIATELLE CON LANGOSTINOS",
    "descripcion": "",
    "precio": 18500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "POSTRES",
  "productos": [
   {
    "nombre": "VOLCÁN DE CHOCOLATE",
    "descripcion": "CON HELADO DE CREMA",
    "precio": 8000,
    "destacado": true
   },
   {
    "nombre": "TIRAMISÚ",
    "descripcion": "",
    "precio": 7000,
    "destacado": false
   },
   {
    "nombre": "CRÈME BRÛLÉE",
    "descripcion": "",
    "precio": 7000,
    "destacado": false
   },
   {
    "nombre": "CHEESECAKE DE FRUTOS ROJOS",
    "descripcion": "",
    "precio": 7200,
    "destacado": false
   },
   {
    "nombre": "FLAN CON DULCE DE LECHE",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "COPA DE HELADO ECHELON",
    "descripcion": "",
    "precio": 7500,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "COCTELERÍA",
  "productos": [
   {
    "nombre": "ECHELON SPECIAL",
    "descripcion": "GIN, FRUTOS ROJOS, LIMÓN Y ALBAHACA",
    "precio": 8500,
    "destacado": true
   },
   {
    "nombre": "NEGRONI",
    "descripcion": "GIN, CAMPARI Y VERMUT ROSSO",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "OLD FASHIONED",
    "descripcion": "BOURBON, AZÚCAR, BITTER Y NARANJA",
    "precio": 8500,
    "destacado": false
   },
   {
    "nombre": "ESPRESSO MARTINI",
    "descripcion": "",
    "precio": 8000,
    "destacado": false
   },
   {
    "nombre": "APEROL SPRITZ",
    "descripcion": "APEROL, PROSECCO, SODA Y NARANJA",
    "precio": 7000,
    "destacado": false
   },
   {
    "nombre": "MOJITO",
    "descripcion": "",
    "precio": 7000,
    "destacado": false
   },
   {
    "nombre": "GIN TONIC PREMIUM",
    "descripcion": "CON BOTÁNICOS A ELECCIÓN",
    "precio": 7500,
    "destacado": false
   },
   {
    "nombre": "PISCO SOUR",
    "descripcion": "",
    "precio": 7000,
    "destacado": false
   }
  ]
 },
 {
  "categoria": "VINOS Y BEBIDAS",
  "productos": [
   {
    "nombre": "MALBEC (COPA)",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "CABERNET SAUVIGNON (COPA)",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "CHARDONNAY (COPA)",
    "descripcion": "",
    "precio": 5500,
    "destacado": false
   },
   {
    "nombre": "MALBEC RESERVA (BOTELLA)",
    "descripcion": "",
    "precio": 24000,
    "destacado": false
   },
   {
    "nombre": "ESPUMANTE BRUT (BOTELLA)",
    "descripcion": "",
    "precio": 21000,
    "destacado": false
   },
   {
    "nombre": "CERVEZA ARTESANAL 500CC",
    "descripcion": "",
    "precio": 5800,
    "destacado": false
   },
   {
    "nombre": "AGUA MINERAL 500CC",
    "descripcion": "",
    "precio": 2800,
    "destacado": false
   },
   {
    "nombre": "GASEOSA 500CC",
    "descripcion": "",
    "precio": 3800,
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
    values (v_rid, v_nombre, 'Cocina de autor, vinos y coctelería')
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
