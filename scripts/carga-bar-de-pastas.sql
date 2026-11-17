-- Carga de la carta de BAR DE PASTAS (borrador). Pegar completo en Supabase → SQL Editor → Run.
-- Seguro de repetir: si una categoría ya existe se reutiliza (y se pasa a MAYÚSCULAS) y
-- un producto con el mismo nombre en esa categoría no se duplica. Todo o nada: ante un error no se carga nada.
do $$
declare
  v_slug  text := 'bar-de-pastas';
  v_carta jsonb := $json$
[
 {
  "categoria": "CERVEZAS",
  "productos": [
   {
    "nombre": "QUILMES 1L",
    "descripcion": "",
    "precio": 6000,
    "disponible": true
   },
   {
    "nombre": "QUILMES 473CC",
    "descripcion": "",
    "precio": 3000,
    "disponible": true
   },
   {
    "nombre": "STELLA ARTOIS 975 CC",
    "descripcion": "",
    "precio": 8000,
    "disponible": true
   },
   {
    "nombre": "STELLA ARTOIS 330CC",
    "descripcion": "",
    "precio": 5000,
    "disponible": true
   },
   {
    "nombre": "ANDES ORIGEN NEGRA 473CC",
    "descripcion": "",
    "precio": 5000,
    "disponible": true
   },
   {
    "nombre": "CORONA 710CC",
    "descripcion": "",
    "precio": 8000,
    "disponible": true
   },
   {
    "nombre": "CORONA 330CC",
    "descripcion": "",
    "precio": 5000,
    "disponible": true
   }
  ]
 },
 {
  "categoria": "TÓNICOS DE LA CASA",
  "productos": [
   {
    "nombre": "AP AP",
    "descripcion": "GIN DE LA CASA, APEROL, AGUA TONICA.",
    "precio": 6000,
    "disponible": true
   },
   {
    "nombre": "NEGRONI",
    "descripcion": "GIN, CAMPARI, CINZANO ROSSO, PIEL DE NARANJA",
    "precio": 6500,
    "disponible": true
   },
   {
    "nombre": "GIN TONIC",
    "descripcion": "GIN, AGUA TÓNICA, PIEL DE LIMÓN",
    "precio": 0,
    "disponible": false
   }
  ]
 },
 {
  "categoria": "VINOS",
  "productos": [
   {
    "nombre": "ESCORIHUELA GASCÓN",
    "descripcion": "MALBEC",
    "precio": 27000,
    "disponible": true
   },
   {
    "nombre": "COLOMÉ ESTATE",
    "descripcion": "MALBEC",
    "precio": 42000,
    "disponible": true
   },
   {
    "nombre": "CONEJO VERDE",
    "descripcion": "MALBEC",
    "precio": 20000,
    "disponible": true
   },
   {
    "nombre": "DV CATENA",
    "descripcion": "CABERNET",
    "precio": 47000,
    "disponible": true
   },
   {
    "nombre": "HUMANAO RESERVA",
    "descripcion": "CABERNET",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "FINCA HUMANAO",
    "descripcion": "CABERNET",
    "precio": 21000,
    "disponible": true
   },
   {
    "nombre": "CONEJO VERDE CHENIN DULCE",
    "descripcion": "BLANCO",
    "precio": 22000,
    "disponible": true
   },
   {
    "nombre": "SANTA JULIA CHENIN DULCE",
    "descripcion": "BLANCO",
    "precio": 22000,
    "disponible": true
   },
   {
    "nombre": "HUMANAO RESERVA MALBEC",
    "descripcion": "RECOMENDADO",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "LATITUD 33",
    "descripcion": "RECOMENDADO",
    "precio": 16000,
    "disponible": true
   },
   {
    "nombre": "SALENTEIN RESERVA ROSÉ",
    "descripcion": "RECOMENDADO",
    "precio": 22000,
    "disponible": true
   }
  ]
 },
 {
  "categoria": "LA HORA DEL VERMUT",
  "productos": [
   {
    "nombre": "APEROL SPRITZ",
    "descripcion": "APEROL, CINZANO DEMI SEC, SODA, NARANJA.",
    "precio": 6000,
    "disponible": true
   },
   {
    "nombre": "CYNAR JULEP",
    "descripcion": "CYNAR, YERBA BUENA, JUGO DE POMELO, ALMÍBAR.",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "AMERICANO FRESH",
    "descripcion": "CAMPARI, CINZANO ROSSO, JUGO DE LIMÓN, AGUA TÓNICA.",
    "precio": 6000,
    "disponible": true
   }
  ]
 },
 {
  "categoria": "PURO VERMUT",
  "productos": [
   {
    "nombre": "VERMOUTH LA FUERZA ROJO",
    "descripcion": "CON SODA - NARANJA - ACEITUNA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "VERMOUTH LA FUERZA BLANCO",
    "descripcion": "CON SODA - NARANJA - ACEITUNA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "VERMOUTH LA FUERZA DE PRIMAVERA",
    "descripcion": "CON SODA - NARANJA - ACEITUNA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "VERMOUTH LA FUERZA SIDERAL",
    "descripcion": "CON SODA - NARANJA - ACEITUNA",
    "precio": 0,
    "disponible": false
   }
  ]
 }
]
  $json$;
  v_rid uuid; v_cat jsonb; v_prod jsonb; v_cid uuid; v_cpos int; v_ppos int;
  v_ncat int := 0; v_nprod int := 0; v_nomit int := 0;
begin
  select id into v_rid from public.restaurants where slug = v_slug;
  if v_rid is null then raise exception 'No existe el restaurante %', v_slug; end if;
  select coalesce(max(position), -1) + 1 into v_cpos from public.categories where restaurant_id = v_rid;
  for v_cat in select * from jsonb_array_elements(v_carta) loop
    select id into v_cid from public.categories
      where restaurant_id = v_rid and upper(name) = upper(v_cat->>'categoria') limit 1;
    if v_cid is null then
      insert into public.categories (restaurant_id, name, position)
        values (v_rid, v_cat->>'categoria', v_cpos) returning id into v_cid;
      v_cpos := v_cpos + 1; v_ncat := v_ncat + 1;
    else
      update public.categories set name = v_cat->>'categoria' where id = v_cid;
    end if;
    select coalesce(max(position), -1) + 1 into v_ppos from public.products where category_id = v_cid;
    for v_prod in select * from jsonb_array_elements(v_cat->'productos') loop
      if exists (select 1 from public.products where category_id = v_cid and name = v_prod->>'nombre') then
        v_nomit := v_nomit + 1;
      else
        insert into public.products (restaurant_id, category_id, name, description, price_ars, available, position)
          values (v_rid, v_cid, v_prod->>'nombre', coalesce(v_prod->>'descripcion', ''),
                  (v_prod->>'precio')::numeric, coalesce((v_prod->>'disponible')::boolean, true), v_ppos);
        v_ppos := v_ppos + 1; v_nprod := v_nprod + 1;
      end if;
    end loop;
  end loop;
  raise notice 'Listo: % categorías nuevas, % productos cargados, % ya existían (omitidos).', v_ncat, v_nprod, v_nomit;
end $$;
