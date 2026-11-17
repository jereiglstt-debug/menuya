-- Carga de la carta de RAMÍREZ TABERNA DE CARNE (borrador). Pegar completo en Supabase → SQL Editor → Run.
-- Seguro de repetir: si una categoría ya existe se reutiliza (y se pasa a MAYÚSCULAS) y
-- un producto con el mismo nombre en esa categoría no se duplica. Todo o nada: ante un error no se carga nada.
do $$
declare
  v_slug  text := 'ramirez-taberna-de-carne';
  v_carta jsonb := $json$
[
 {
  "categoria": "CAFETERIA",
  "productos": [
   {
    "nombre": "CAFÉ (POCILLO)",
    "descripcion": "POCILLO",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "CAFÉ (JARRITO)",
    "descripcion": "JARRITO",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "CAFÉ (DOBLE)",
    "descripcion": "DOBLE",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "CAFÉ CON LECHE (POCILLO)",
    "descripcion": "POCILLO",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "CAFÉ CON LECHE (JARRITO)",
    "descripcion": "JARRITO",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "CAFÉ CON LECHE (DOBLE)",
    "descripcion": "DOBLE",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "LÁGRIMA (POCILLO)",
    "descripcion": "POCILLO",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "LÁGRIMA (JARRITO)",
    "descripcion": "JARRITO",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "LÁGRIMA (DOBLE)",
    "descripcion": "DOBLE",
    "precio": 0,
    "disponible": false
   }
  ]
 },
 {
  "categoria": "ENTRADAS",
  "productos": [
   {
    "nombre": "PROVOLETA AHUMADA",
    "descripcion": "CON PESTO, VERDES Y CHERRYS",
    "precio": 8500,
    "disponible": true
   },
   {
    "nombre": "TRÍO DE EMPANADAS",
    "descripcion": "CON YASGUA",
    "precio": 7500,
    "disponible": true
   },
   {
    "nombre": "PINCHOS AGRIDULCES DE CERDO",
    "descripcion": "ANANÁ Y CIRUELAS BAÑADAS EN REDUCCIÓN DE ACETO",
    "precio": 8300,
    "disponible": true
   }
  ]
 },
 {
  "categoria": "ESPECIALES DEL CHEF",
  "productos": [
   {
    "nombre": "ENTRAÑA A LA PARRILLA",
    "descripcion": "BAÑADA CON GREMOLATTA, ACOMPAÑADO DE PURÉ DE ZANAHORIA.",
    "precio": 31000,
    "disponible": true
   },
   {
    "nombre": "RIBS DE CERDO",
    "descripcion": "A LA BARBACOA CON PAPAS FRITAS Y COLE SLAW",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "OSOBUCO DE RES BRASEADO",
    "descripcion": "ACOMPAÑADO CON MILHOJAS DE PAPAS A LAS HIERBAS Y VERDES",
    "precio": 21000,
    "disponible": true
   },
   {
    "nombre": "SALMON CON CUBIERTA CROCANTE",
    "descripcion": "MOUSSE DE PALTA CON ENSALADA EN COLCHÓN DE VERDES Y CHERRYS",
    "precio": 37700,
    "disponible": true
   },
   {
    "nombre": "PIQUE A LO MACHO",
    "descripcion": "SALSA PICANTE A BASE DE CERDO, RES Y CHORIZO ACOMPAÑADO DE PAPAS, HUEVO FRITO, CEBOLLA MORADA TOMATE Y PEREJIL",
    "precio": 21000,
    "disponible": true
   },
   {
    "nombre": "MOLLEJAS (SALSA DE ROQUEFORT)",
    "descripcion": "CON SALSA DE ROQUEFORT Y PAPINES NORTEÑOS",
    "precio": 28000,
    "disponible": true
   },
   {
    "nombre": "MOLLEJAS (VERDURAS ASADAS)",
    "descripcion": "CON VERDURAS ASADAS",
    "precio": 28000,
    "disponible": true
   },
   {
    "nombre": "MATAMBRE DE CERDO",
    "descripcion": "CON MOSTAZA Y MIEL",
    "precio": 30700,
    "disponible": true
   },
   {
    "nombre": "LOMO A LA PIMIENTA",
    "descripcion": "CARNE DE RES, SALSA CREMA Y PAPINES NORTEÑOS",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "TORRE DE MILANESA DE CERDO",
    "descripcion": "",
    "precio": 23000,
    "disponible": true
   }
  ]
 },
 {
  "categoria": "CARNES DE RES",
  "productos": [
   {
    "nombre": "TIRA",
    "descripcion": "",
    "precio": 28700,
    "disponible": true
   },
   {
    "nombre": "TOMAHAWK 500GR",
    "descripcion": "",
    "precio": 28700,
    "disponible": true
   },
   {
    "nombre": "TOMAHAWK 1000GR",
    "descripcion": "",
    "precio": 33700,
    "disponible": true
   },
   {
    "nombre": "ENTRAÑA",
    "descripcion": "",
    "precio": 30700,
    "disponible": true
   },
   {
    "nombre": "MATAMBRE",
    "descripcion": "",
    "precio": 24000,
    "disponible": true
   },
   {
    "nombre": "CHURRASCO",
    "descripcion": "",
    "precio": 28700,
    "disponible": true
   },
   {
    "nombre": "VACÍO",
    "descripcion": "",
    "precio": 28700,
    "disponible": true
   },
   {
    "nombre": "PICANA",
    "descripcion": "",
    "precio": 28700,
    "disponible": true
   },
   {
    "nombre": "EL MARTILLO (PARA 4 PERSONAS)",
    "descripcion": "",
    "precio": 0,
    "disponible": false
   }
  ]
 },
 {
  "categoria": "CARNES DE CERDO",
  "productos": [
   {
    "nombre": "RIBS",
    "descripcion": "",
    "precio": 25700,
    "disponible": true
   },
   {
    "nombre": "BONDIOLA",
    "descripcion": "",
    "precio": 25700,
    "disponible": true
   },
   {
    "nombre": "NAPOLITANA DE CERDO",
    "descripcion": "",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "CARRÉ",
    "descripcion": "",
    "precio": 25700,
    "disponible": true
   },
   {
    "nombre": "MATAMBRE",
    "descripcion": "",
    "precio": 28000,
    "disponible": true
   },
   {
    "nombre": "VACÍO",
    "descripcion": "",
    "precio": 25700,
    "disponible": true
   }
  ]
 },
 {
  "categoria": "PESCADOS",
  "productos": [
   {
    "nombre": "SALMÓN",
    "descripcion": "",
    "precio": 35700,
    "disponible": true
   },
   {
    "nombre": "PACÚ",
    "descripcion": "",
    "precio": 25000,
    "disponible": true
   }
  ]
 },
 {
  "categoria": "AVES",
  "productos": [
   {
    "nombre": "PECHUGA",
    "descripcion": "",
    "precio": 16700,
    "disponible": true
   },
   {
    "nombre": "PATA MUSLO",
    "descripcion": "",
    "precio": 16700,
    "disponible": true
   }
  ]
 },
 {
  "categoria": "ENSALADAS",
  "productos": [
   {
    "nombre": "ENSALADA CLÁSICA",
    "descripcion": "CHERRYS Y MIX DE VERDES CON DRESSIGN DE OLIVA",
    "precio": 7000,
    "disponible": true
   },
   {
    "nombre": "ENSALADA COLESLAW",
    "descripcion": "REPOLLO MORADO Y BLANCO, ZANAHORIA ADEREZO SLAW",
    "precio": 8000,
    "disponible": true
   },
   {
    "nombre": "ANDINA",
    "descripcion": "QUINOA, QUESO DE CABRA, PALTA, CHERRYS, VERDES, CEBOLLA MORADA, ALMENDRAS TOSTADAS Y DRESSIGN DE OLIVA",
    "precio": 8200,
    "disponible": true
   },
   {
    "nombre": "CAPRESSE",
    "descripcion": "VERDES, CHERRYS CONFITADOS, ALBAHACA, CRUTONES DE FOCACCIA, OPCIONAL JAMÓN CRUDO",
    "precio": 8000,
    "disponible": true
   },
   {
    "nombre": "CÉSAR",
    "descripcion": "POLLO, CRUTONES, HOJAS VERDES, PARMESANO, ADEREZOS",
    "precio": 8000,
    "disponible": true
   },
   {
    "nombre": "PURÉ",
    "descripcion": "ZANAHORIA, O DE CALABAZA, O DE PAPA",
    "precio": 7000,
    "disponible": true
   },
   {
    "nombre": "TOMATE CEBOLLA Y HUEVO",
    "descripcion": "",
    "precio": 7000,
    "disponible": true
   }
  ]
 },
 {
  "categoria": "PAPAS CLASICAS O RUSTICAS",
  "productos": [
   {
    "nombre": "PAPAS RUSTICAS",
    "descripcion": "FRITAS O AL HORNO",
    "precio": 7000,
    "disponible": true
   },
   {
    "nombre": "PAPAS A CABALLO",
    "descripcion": "CORONADAS DE HUEVO FRITO Y PEREJIL",
    "precio": 8500,
    "disponible": true
   },
   {
    "nombre": "PAPAS CHEDDAR",
    "descripcion": "SALSA CHEDDAR, PANCETA CROCANTE Y CIBOULETTE",
    "precio": 9000,
    "disponible": true
   },
   {
    "nombre": "PAPAS BRUTAL",
    "descripcion": "CHEDDAR, CEBOLLA DE VERDEO, CEBOLLA MORADA",
    "precio": 10000,
    "disponible": true
   }
  ]
 },
 {
  "categoria": "LAS MILA",
  "productos": [
   {
    "nombre": "NAPO (L - 1 PERSONA)",
    "descripcion": "SALSA FILETTO, MUZARELLA, JAMÓN COCIDO Y ORÉGANO",
    "precio": 22700,
    "disponible": true
   },
   {
    "nombre": "NAPO (XL - 2 PERSONAS)",
    "descripcion": "SALSA FILETTO, MUZARELLA, JAMÓN COCIDO Y ORÉGANO",
    "precio": 31700,
    "disponible": true
   },
   {
    "nombre": "NAPO (XXL - 4 PERSONAS)",
    "descripcion": "SALSA FILETTO, MUZARELLA, JAMÓN COCIDO Y ORÉGANO",
    "precio": 38700,
    "disponible": true
   },
   {
    "nombre": "CAPRESSE (L - 1 PERSONA)",
    "descripcion": "MUZARELLA, ALBAHACA, TOMATE FRESCO Y PESTO",
    "precio": 22700,
    "disponible": true
   },
   {
    "nombre": "CAPRESSE (XL - 2 PERSONAS)",
    "descripcion": "MUZARELLA, ALBAHACA, TOMATE FRESCO Y PESTO",
    "precio": 31700,
    "disponible": true
   },
   {
    "nombre": "CAPRESSE (XXL - 4 PERSONAS)",
    "descripcion": "MUZARELLA, ALBAHACA, TOMATE FRESCO Y PESTO",
    "precio": 38700,
    "disponible": true
   },
   {
    "nombre": "PROVOLETA (L - 1 PERSONA)",
    "descripcion": "QUESO PROVOLONE, PIMIENTO ASADO, ORÉGANO, AJÍ MOLIDO Y SALSA CRIOLLA",
    "precio": 22700,
    "disponible": true
   },
   {
    "nombre": "PROVOLETA (XL - 2 PERSONAS)",
    "descripcion": "QUESO PROVOLONE, PIMIENTO ASADO, ORÉGANO, AJÍ MOLIDO Y SALSA CRIOLLA",
    "precio": 31700,
    "disponible": true
   },
   {
    "nombre": "PROVOLETA (XXL - 4 PERSONAS)",
    "descripcion": "QUESO PROVOLONE, PIMIENTO ASADO, ORÉGANO, AJÍ MOLIDO Y SALSA CRIOLLA",
    "precio": 38700,
    "disponible": true
   },
   {
    "nombre": "DE LA TABERNA (L - 1 PERSONA)",
    "descripcion": "MUZARELLA, TOMATE FRESCO, JAMÓN COCIDO, HUEVO FRITO Y PEREJIL",
    "precio": 22700,
    "disponible": true
   },
   {
    "nombre": "DE LA TABERNA (XL - 2 PERSONAS)",
    "descripcion": "MUZARELLA, TOMATE FRESCO, JAMÓN COCIDO, HUEVO FRITO Y PEREJIL",
    "precio": 31700,
    "disponible": true
   },
   {
    "nombre": "DE LA TABERNA (XXL - 4 PERSONAS)",
    "descripcion": "MUZARELLA, TOMATE FRESCO, JAMÓN COCIDO, HUEVO FRITO Y PEREJIL",
    "precio": 38700,
    "disponible": true
   },
   {
    "nombre": "YANKEE (L - 1 PERSONA)",
    "descripcion": "CEBOLLA CARAMELIZADA, BARBACOA, PANCETA, HUEVO FRITO Y PEREJIL",
    "precio": 22700,
    "disponible": true
   },
   {
    "nombre": "YANKEE (XL - 2 PERSONAS)",
    "descripcion": "CEBOLLA CARAMELIZADA, BARBACOA, PANCETA, HUEVO FRITO Y PEREJIL",
    "precio": 31700,
    "disponible": true
   },
   {
    "nombre": "YANKEE (XXL - 4 PERSONAS)",
    "descripcion": "CEBOLLA CARAMELIZADA, BARBACOA, PANCETA, HUEVO FRITO Y PEREJIL",
    "precio": 38700,
    "disponible": true
   },
   {
    "nombre": "CUATRO QUESOS (L - 1 PERSONA)",
    "descripcion": "MUZARELLA, PROVOLONE, QUESO AZUL, SARDO Y CIBOULETTE",
    "precio": 22700,
    "disponible": true
   },
   {
    "nombre": "CUATRO QUESOS (XL - 2 PERSONAS)",
    "descripcion": "MUZARELLA, PROVOLONE, QUESO AZUL, SARDO Y CIBOULETTE",
    "precio": 31700,
    "disponible": true
   },
   {
    "nombre": "CUATRO QUESOS (XXL - 4 PERSONAS)",
    "descripcion": "MUZARELLA, PROVOLONE, QUESO AZUL, SARDO Y CIBOULETTE",
    "precio": 38700,
    "disponible": true
   },
   {
    "nombre": "BRUTAL (L - 1 PERSONA)",
    "descripcion": "MUZARELLA, CHEDDAR, CEBOLLA MORADA, CEBOLLA DE VERDEO, HUEVO FRITO Y PANCETA",
    "precio": 22700,
    "disponible": true
   },
   {
    "nombre": "BRUTAL (XL - 2 PERSONAS)",
    "descripcion": "MUZARELLA, CHEDDAR, CEBOLLA MORADA, CEBOLLA DE VERDEO, HUEVO FRITO Y PANCETA",
    "precio": 31700,
    "disponible": true
   },
   {
    "nombre": "BRUTAL (XXL - 4 PERSONAS)",
    "descripcion": "MUZARELLA, CHEDDAR, CEBOLLA MORADA, CEBOLLA DE VERDEO, HUEVO FRITO Y PANCETA",
    "precio": 38700,
    "disponible": true
   }
  ]
 },
 {
  "categoria": "MENU EJECUTIVO TODO LOS DIAS",
  "productos": [
   {
    "nombre": "CONSULTAR",
    "descripcion": "",
    "precio": 0,
    "disponible": false
   }
  ]
 },
 {
  "categoria": "ENTRE PANES",
  "productos": [
   {
    "nombre": "MILANESA",
    "descripcion": "CON PAPAS FRITAS",
    "precio": 15000,
    "disponible": true
   },
   {
    "nombre": "LOMO",
    "descripcion": "CON PAPAS FRITAS",
    "precio": 15000,
    "disponible": true
   },
   {
    "nombre": "HAMBURGESA",
    "descripcion": "CON PAPAS FRITAS",
    "precio": 15000,
    "disponible": true
   },
   {
    "nombre": "MATAMBRE",
    "descripcion": "CON PAPAS FRITAS",
    "precio": 15000,
    "disponible": true
   },
   {
    "nombre": "BONDIOLA",
    "descripcion": "CON PAPAS FRITAS",
    "precio": 15000,
    "disponible": true
   },
   {
    "nombre": "MECHADO",
    "descripcion": "CON PAPAS FRITAS",
    "precio": 15000,
    "disponible": true
   }
  ]
 },
 {
  "categoria": "POSTRES",
  "productos": [
   {
    "nombre": "FLAN DE LECHE",
    "descripcion": "CONDENSADA ACOMPAÑADA CON DULCE DE LECHE Y CREMA",
    "precio": 8000,
    "disponible": true
   },
   {
    "nombre": "BROWNNI DE CHOCOLATE",
    "descripcion": "CON HELADO DE AMERICANA",
    "precio": 8000,
    "disponible": true
   },
   {
    "nombre": "PANQUEQUE DE MANZANA",
    "descripcion": "QUEMADO AL RUM CON HELADO",
    "precio": 8000,
    "disponible": true
   },
   {
    "nombre": "SUSPIRO LIMEÑO",
    "descripcion": "",
    "precio": 8000,
    "disponible": true
   },
   {
    "nombre": "PANQUEQUE",
    "descripcion": "CON DULCE DE LECHE",
    "precio": 8000,
    "disponible": true
   },
   {
    "nombre": "TIRAMISÚ",
    "descripcion": "",
    "precio": 8000,
    "disponible": true
   },
   {
    "nombre": "OREOTORTA O CHOCOTORTA",
    "descripcion": "",
    "precio": 8000,
    "disponible": true
   }
  ]
 },
 {
  "categoria": "BEBIDAS",
  "productos": [
   {
    "nombre": "PEPSI 1-1/2L",
    "descripcion": "",
    "precio": 6000,
    "disponible": true
   },
   {
    "nombre": "PEPSI 500CC",
    "descripcion": "",
    "precio": 4000,
    "disponible": true
   },
   {
    "nombre": "MIRINDA 500CC",
    "descripcion": "",
    "precio": 4000,
    "disponible": true
   },
   {
    "nombre": "7 UP 500 CC",
    "descripcion": "",
    "precio": 4000,
    "disponible": true
   },
   {
    "nombre": "AGUA MINERAL NESTLE 500 CC",
    "descripcion": "",
    "precio": 3000,
    "disponible": true
   },
   {
    "nombre": "AGUA CON GAS ECO DE LOS ANDES 500CC",
    "descripcion": "",
    "precio": 3000,
    "disponible": true
   },
   {
    "nombre": "AGUA SABORIZADA H2OH 500 CC",
    "descripcion": "",
    "precio": 4000,
    "disponible": true
   },
   {
    "nombre": "LÍNEA COCA 1 1/2 L",
    "descripcion": "",
    "precio": 8000,
    "disponible": true
   },
   {
    "nombre": "LÍNEA COCA COLA 500CC",
    "descripcion": "",
    "precio": 5000,
    "disponible": true
   },
   {
    "nombre": "JARRA DE LIMONADA 1L",
    "descripcion": "",
    "precio": 0,
    "disponible": false
   }
  ]
 },
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
    "precio": 0,
    "disponible": false
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
    "precio": 4000,
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
  "categoria": "VINO",
  "productos": [
   {
    "nombre": "DV CATENA MALBEC-MALBEC",
    "descripcion": "BODEGA DV CATENA ZAPATA",
    "precio": 47000,
    "disponible": true
   },
   {
    "nombre": "DV CATENA CABERNET-MALBEC",
    "descripcion": "BODEGA DV CATENA ZAPATA",
    "precio": 40000,
    "disponible": true
   },
   {
    "nombre": "DV CATENA CABERNET-CABERNET",
    "descripcion": "BODEGA DV CATENA ZAPATA",
    "precio": 47000,
    "disponible": true
   },
   {
    "nombre": "SAINT FELICIEN MALBEC",
    "descripcion": "BODEGA DV CATENA ZAPATA",
    "precio": 30000,
    "disponible": true
   },
   {
    "nombre": "SAINT FELICIEN CABERNET FRANC",
    "descripcion": "BODEGA DV CATENA ZAPATA",
    "precio": 30000,
    "disponible": true
   },
   {
    "nombre": "SAINT FELICIEN CABERNET SOUVIGNON",
    "descripcion": "BODEGA DV CATENA ZAPATA",
    "precio": 30000,
    "disponible": true
   },
   {
    "nombre": "SAINT FELICIEN CARBERNET-MERLOT",
    "descripcion": "BODEGA DV CATENA ZAPATA",
    "precio": 30000,
    "disponible": true
   },
   {
    "nombre": "LABORUM MALBEC",
    "descripcion": "BODEGA EL PORVENIR",
    "precio": 50000,
    "disponible": true
   },
   {
    "nombre": "LABORUM PETIT VERDOT",
    "descripcion": "BODEGA EL PORVENIR",
    "precio": 70000,
    "disponible": true
   },
   {
    "nombre": "LABORUM TORRONTES",
    "descripcion": "BODEGA EL PORVENIR",
    "precio": 45000,
    "disponible": true
   },
   {
    "nombre": "PERRO CALLEJERO BLEND MALBEC",
    "descripcion": "BODEGA MOSQUITA MUERTA",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "PERRO CALLEJERO CABERNET SOUVIGNON",
    "descripcion": "BODEGA MOSQUITA MUERTA",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "CORDERO CON PIEL DE LOBO MALBEC",
    "descripcion": "BODEGA MOSQUITA MUERTA",
    "precio": 20000,
    "disponible": true
   },
   {
    "nombre": "CORDERO CON PIEL DE LOBO CABERNET SOUVIGNON",
    "descripcion": "BODEGA MOSQUITA MUERTA",
    "precio": 20000,
    "disponible": true
   },
   {
    "nombre": "CORDERO CON PIEL DE LOBO BONARDA",
    "descripcion": "BODEGA MOSQUITA MUERTA",
    "precio": 20000,
    "disponible": true
   },
   {
    "nombre": "SAPO DE OTRO POZO CABERNET-MALBEC",
    "descripcion": "BODEGA MOSQUITA MUERTA",
    "precio": 30000,
    "disponible": true
   },
   {
    "nombre": "SAPO DE OTRO POZO BLEND DE TINTAS",
    "descripcion": "BODEGA MOSQUITA MUERTA",
    "precio": 35000,
    "disponible": true
   },
   {
    "nombre": "MOSQUITA MUERTA BLEND DE TINTAS",
    "descripcion": "BODEGA MOSQUITA MUERTA",
    "precio": 40000,
    "disponible": true
   },
   {
    "nombre": "AMALAYA MALBEC",
    "descripcion": "BODEGA AMALAYA",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "AMALAYA GRAN CORTE",
    "descripcion": "BODEGA AMALAYA",
    "precio": 35000,
    "disponible": true
   },
   {
    "nombre": "AMALAYA TORRONTES",
    "descripcion": "BODEGA AMALAYA",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "TINTO DE MAIMARÁ",
    "descripcion": "BODEGA EL BAYEH - JUJUY",
    "precio": 47000,
    "disponible": true
   },
   {
    "nombre": "TINTO DE PURMAMARCA",
    "descripcion": "BODEGA EL BAYEH - JUJUY",
    "precio": 47000,
    "disponible": true
   },
   {
    "nombre": "TINTO DE TILCARA",
    "descripcion": "BODEGA EL BAYEH - JUJUY",
    "precio": 47000,
    "disponible": true
   },
   {
    "nombre": "AMANECER ANDINO MALBEC",
    "descripcion": "BODEGA AMANECER ANDINO - JUJUY",
    "precio": 50000,
    "disponible": true
   },
   {
    "nombre": "AMANECER ANDINO CABERNET - BONARDA",
    "descripcion": "BODEGA AMANECER ANDINO - JUJUY",
    "precio": 50000,
    "disponible": true
   },
   {
    "nombre": "CIELO ARRIBA",
    "descripcion": "BODEGA HUICHAIRA - JUJUY",
    "precio": 150000,
    "disponible": true
   },
   {
    "nombre": "FINCA HUMANAO CABERNET SOUVIGNON",
    "descripcion": "BODEGA HUMANAO - SALTA",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "HUMANAO MALBEC 2023",
    "descripcion": "BODEGA HUMANAO - SALTA",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "HUMANAO GRAN RESERVA",
    "descripcion": "BODEGA HUMANAO - SALTA",
    "precio": 57000,
    "disponible": true
   },
   {
    "nombre": "HUMANAO CABERNET SOUVIGNON",
    "descripcion": "BODEGA HUMANAO - SALTA",
    "precio": 35000,
    "disponible": true
   },
   {
    "nombre": "RUTINI MALBEC",
    "descripcion": "BODEGA RUTINI WINES - MENDOZA",
    "precio": 59000,
    "disponible": true
   },
   {
    "nombre": "RUTINI CABERNET SOUVIGNON",
    "descripcion": "BODEGA RUTINI WINES - MENDOZA",
    "precio": 42000,
    "disponible": true
   },
   {
    "nombre": "RUTINI CABERNET FRANC",
    "descripcion": "BODEGA RUTINI WINES - MENDOZA",
    "precio": 55000,
    "disponible": true
   },
   {
    "nombre": "RUTINI CABERNET - MALBEC",
    "descripcion": "BODEGA RUTINI WINES - MENDOZA",
    "precio": 45000,
    "disponible": true
   },
   {
    "nombre": "TRUMPETER MALBEC",
    "descripcion": "BODEGA RUTINI WINES - MENDOZA",
    "precio": 30000,
    "disponible": true
   },
   {
    "nombre": "TRUMPETER CHARDONNAY",
    "descripcion": "BODEGA RUTINI WINES - MENDOZA",
    "precio": 30000,
    "disponible": true
   },
   {
    "nombre": "TRUMPETER DOUX",
    "descripcion": "BODEGA RUTINI WINES - MENDOZA",
    "precio": 30000,
    "disponible": true
   },
   {
    "nombre": "ANKO MALBEC",
    "descripcion": "BODEGA ESTANCIA LOS CARDONES, SALTA",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "ANKO TORRONTÉS",
    "descripcion": "BODEGA ESTANCIA LOS CARDONES, SALTA",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "TERRAZAS ORIGEN COMPUERTA MALBEC 750CC",
    "descripcion": "BODEGA TERRAZAS DE LOS ANDES",
    "precio": 47000,
    "disponible": true
   },
   {
    "nombre": "TERRAZAS RESERVA MALBEC 750 CC",
    "descripcion": "BODEGA TERRAZAS DE LOS ANDES",
    "precio": 42000,
    "disponible": true
   },
   {
    "nombre": "TERRAZAS RESERVA CABERNET SAUVIGNON 750CC",
    "descripcion": "BODEGA TERRAZAS DE LOS ANDES",
    "precio": 42000,
    "disponible": true
   },
   {
    "nombre": "TERRAZAS RESERVA CHARDONNAY 750CC",
    "descripcion": "BODEGA TERRAZAS DE LOS ANDES",
    "precio": 42000,
    "disponible": true
   },
   {
    "nombre": "TERRAZAS ALTO DEL PLATA MALBEC 750CC",
    "descripcion": "BODEGA TERRAZAS DE LOS ANDES",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "ESCORIHUELA GASCON GRAN RESERVA",
    "descripcion": "BODEGA ESCORIHUELA GASCON",
    "precio": 42000,
    "disponible": true
   },
   {
    "nombre": "ESCORIHUELA GASCON MALBEC",
    "descripcion": "BODEGA ESCORIHUELA GASCON",
    "precio": 27000,
    "disponible": true
   },
   {
    "nombre": "ESCORIHUELA GASCON CABERNET SOUVIGNON",
    "descripcion": "BODEGA ESCORIHUELA GASCON",
    "precio": 27000,
    "disponible": true
   },
   {
    "nombre": "HERMANDAD MALBEC",
    "descripcion": "BODEGA FALASCO WINES - MENDOZA",
    "precio": 52000,
    "disponible": true
   },
   {
    "nombre": "HERMANDAD CHARDONNAY",
    "descripcion": "BODEGA FALASCO WINES - MENDOZA",
    "precio": 52000,
    "disponible": true
   },
   {
    "nombre": "FAUSTO MALBEC",
    "descripcion": "BODEGA FALASCO WINES - MENDOZA",
    "precio": 42000,
    "disponible": true
   },
   {
    "nombre": "FERUS MALBEC",
    "descripcion": "BODEGA FALASCO WINES - MENDOZA",
    "precio": 35000,
    "disponible": true
   },
   {
    "nombre": "LOS HAROLDOS GRAN CORTE",
    "descripcion": "BODEGA LOS HARLODOS",
    "precio": 52000,
    "disponible": true
   },
   {
    "nombre": "LOS HAROLDOS RESERVA MALBEC",
    "descripcion": "BODEGA LOS HARLODOS",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "LOS HAROLDOS RESERVA CABERNET",
    "descripcion": "BODEGA LOS HARLODOS",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "LOS HAROLDOS ESTATE BLEND",
    "descripcion": "BODEGA LOS HARLODOS",
    "precio": 20000,
    "disponible": true
   },
   {
    "nombre": "LOS HAROLDOS ESTATE MALBEC",
    "descripcion": "BODEGA LOS HARLODOS",
    "precio": 20000,
    "disponible": true
   },
   {
    "nombre": "CONEJO VERDE MALBEC",
    "descripcion": "BODEGA LOS HARLODOS",
    "precio": 20000,
    "disponible": true
   },
   {
    "nombre": "CONEJO VERDE CHENNIN DULCE",
    "descripcion": "BODEGA LOS HARLODOS",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "CONEJO VERDE BLANC DE BLANCS",
    "descripcion": "BODEGA LOS HARLODOS",
    "precio": 25000,
    "disponible": true
   },
   {
    "nombre": "COLOME ESTATE MALBEC",
    "descripcion": "BODEGA COLOME, SALTA",
    "precio": 42000,
    "disponible": true
   },
   {
    "nombre": "COLOME LOTE ESPECOIAL MALBEC",
    "descripcion": "BODEGA COLOME, SALTA",
    "precio": 52000,
    "disponible": true
   },
   {
    "nombre": "COLOME ESTATE TORRONTES",
    "descripcion": "BODEGA COLOME, SALTA",
    "precio": 47000,
    "disponible": true
   },
   {
    "nombre": "ETCHART SINGLE MALBEC",
    "descripcion": "BODEGA ETCHART",
    "precio": 50000,
    "disponible": true
   },
   {
    "nombre": "ETCHART SINGLE CABERNET FRANC",
    "descripcion": "BODEGA ETCHART",
    "precio": 50000,
    "disponible": true
   },
   {
    "nombre": "CAFAYATE RESERVA MALBEC",
    "descripcion": "BODEGA ETCHART",
    "precio": 37000,
    "disponible": true
   },
   {
    "nombre": "SALENTEIN SINGLE MALBEC EL TOMILLO",
    "descripcion": "BODEGA SALENTEIN - VALLE DE UCO, MENDOZA",
    "precio": 55000,
    "disponible": true
   },
   {
    "nombre": "SALENTEIN NUMINA MALBEC",
    "descripcion": "BODEGA SALENTEIN - VALLE DE UCO, MENDOZA",
    "precio": 40000,
    "disponible": true
   },
   {
    "nombre": "SALENTEIN NUMINA CABERNET FRANC",
    "descripcion": "BODEGA SALENTEIN - VALLE DE UCO, MENDOZA",
    "precio": 42000,
    "disponible": true
   },
   {
    "nombre": "SALENTEIN RESERVA MALBEC",
    "descripcion": "BODEGA SALENTEIN - VALLE DE UCO, MENDOZA",
    "precio": 27000,
    "disponible": true
   },
   {
    "nombre": "SAN PEDRO DE YACOCHUYA TINTO",
    "descripcion": "BODEGA YACOCHUYA",
    "precio": 62000,
    "disponible": true
   },
   {
    "nombre": "COQUENA MALBEC",
    "descripcion": "BODEGA YACOCHUYA",
    "precio": 27000,
    "disponible": true
   },
   {
    "nombre": "COQUENA TORRONTES",
    "descripcion": "BODEGA YACOCHUYA",
    "precio": 27000,
    "disponible": true
   },
   {
    "nombre": "PASACANA TINTO",
    "descripcion": "BODEGA DUPONT",
    "precio": 77000,
    "disponible": true
   },
   {
    "nombre": "SIKURI SYRAH",
    "descripcion": "BODEGA DUPONT",
    "precio": 67000,
    "disponible": true
   },
   {
    "nombre": "PUNTA CORRAL BLEND",
    "descripcion": "BODEGA DUPONT",
    "precio": 67000,
    "disponible": true
   },
   {
    "nombre": "ROSA DE MAIMARA",
    "descripcion": "BODEGA DUPONT",
    "precio": 77000,
    "disponible": true
   }
  ]
 },
 {
  "categoria": "COPA DE VINO",
  "productos": [
   {
    "nombre": "LOS HAROLDOS CHARDONNAY",
    "descripcion": "",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "AMALAYA CORTE UNICO MALBEC",
    "descripcion": "",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "FINCA HUMANAO MALBEC",
    "descripcion": "",
    "precio": 0,
    "disponible": false
   }
  ]
 },
 {
  "categoria": "ESPUMANTES",
  "productos": [
   {
    "nombre": "CHANDON EXTRA BRUT",
    "descripcion": "BODEGA CHANDON",
    "precio": 37000,
    "disponible": true
   },
   {
    "nombre": "CHANDON BRUT NATURE",
    "descripcion": "BODEGA CHANDON",
    "precio": 37000,
    "disponible": true
   },
   {
    "nombre": "CHANDON DELICE",
    "descripcion": "BODEGA CHANDON",
    "precio": 37000,
    "disponible": true
   },
   {
    "nombre": "CHANDON ROSÉ",
    "descripcion": "BODEGA CHANDON",
    "precio": 37000,
    "disponible": true
   },
   {
    "nombre": "CHANDON CUVEE BRUT NATURE",
    "descripcion": "BODEGA CHANDON",
    "precio": 70000,
    "disponible": true
   },
   {
    "nombre": "BARON B EXTRA BRUT",
    "descripcion": "BODEGA BARON B",
    "precio": 77000,
    "disponible": true
   },
   {
    "nombre": "ANTONELA PINOT NOIR-CHARDONNAY",
    "descripcion": "BODEA FALASCO WINES",
    "precio": 0,
    "disponible": false
   }
  ]
 },
 {
  "categoria": "CÓCTEL LEGENDARIOS",
  "productos": [
   {
    "nombre": "NEGRONI",
    "descripcion": "GIN, CAMPARI, CINZANO ROSSO, PIEL DENARANJA.",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "DRY MARTINI",
    "descripcion": "GIN, VERMOUTH BLANCO SECO, ACEITUNA VERDE.",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "APEROL SPRITZ",
    "descripcion": "APEROL, CINZANO DEMI SEC, SODA, NARANJA.",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "MANHATTAN",
    "descripcion": "BOURBON, VERMOUTH ROSSO, BITTER ANGOSTURA, PIEL DE NARANJA.",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "BLACK RUSSIAN",
    "descripcion": "VODKA ABSOLUT, LICOR DE CAFÉ TÍA MARÍA Y CAFÉ",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "MARTINNI EXPRESSO",
    "descripcion": "VODKA ABSOLUT, LICOR DE CAFÉ TÍA MARÍA Y ALMIBAR SIMPLE",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "PENICILLIN",
    "descripcion": "WHISKY ESCOCÉS, JARABE DE JENGIBRE Y MIEL, JUGO DE LIMÓN.",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "MARGARITA",
    "descripcion": "TEQUILA, COINTREAU, JUGO DE LIMON, SAL DE CHILE.",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "PISCO SOUR",
    "descripcion": "PISCO, JUGO DE LIMON, CLARA DE HUEVO,ALMIBAR.",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "OLD FASIONED",
    "descripcion": "BOURBON, BITTER ANGOSTURA, AZÚCAR, PIEL DE NARANJA.",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "GIN TONIC",
    "descripcion": "GIN, AGUA TONICA, PIEL DE LIMON.",
    "precio": 0,
    "disponible": false
   }
  ]
 },
 {
  "categoria": "VERMUT",
  "productos": [
   {
    "nombre": "VERMOUTH LA FUERZA ROJO",
    "descripcion": "VERMUTERIA - CON SODA + NARANJA + ACEITUNA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "VERMOUTH LA FUERZA BLANCO",
    "descripcion": "VERMUTERIA - CON SODA + NARANJA + ACEITUNA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "VERMOUTH LA FUERZA DE PRIMAVERA",
    "descripcion": "VERMUTERIA - CON SODA + NARANJA + ACEITUNA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "VERMOUTH LA FUERZA SIDERAL",
    "descripcion": "VERMUTERIA - CON SODA + NARANJA + ACEITUNA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "JOHNNIE WALKER BLUE LABEL",
    "descripcion": "WHISKY SCOTCH",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "JOHNNIE WALKER RED LABEL",
    "descripcion": "WHISKY SCOTCH",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "JOHNNIE WALKER BLACK LABEL",
    "descripcion": "WHISKY SCOTCH",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "CHIVAS REGALR 18 AÑOS",
    "descripcion": "WHISKY SCOTCH",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "CHIVAS REGALR 12 AÑOS",
    "descripcion": "WHISKY SCOTCH",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "GLEN LIVET 12 AÑOS",
    "descripcion": "SINGLE MALT",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "CARDHU 12 AÑOS",
    "descripcion": "SINGLE MALT",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "JAMESON TRIPLE DESTILACION",
    "descripcion": "IRISH WHISKEY",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "JAMESON BLACK BARREL",
    "descripcion": "IRISH WHISKEY",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "MAKERS MARK",
    "descripcion": "BOURBON",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "JIM BEAN",
    "descripcion": "BOURBON",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "JIM BEAN BLACK EXTRA-AGED",
    "descripcion": "BOURBON",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "WILD TURKEY",
    "descripcion": "BOURBON",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "JACK DANIELS",
    "descripcion": "TENNESSEE WHISKEY",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "ABSOLUT",
    "descripcion": "VODKA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "STOLICHNAYA",
    "descripcion": "VODKA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "BOTANIST",
    "descripcion": "GIN AND TONICS",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "MARE",
    "descripcion": "GIN AND TONICS",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "HENDRIX",
    "descripcion": "GIN AND TONICS",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "BULLDOG",
    "descripcion": "GIN AND TONICS",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "MALDY ORIGINALE ITALY (ITALY)",
    "descripcion": "GIN AND TONICS",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "BOMBAY SAPHIRE",
    "descripcion": "GIN AND TONICS",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "TANQUERAY SEVILLA",
    "descripcion": "GIN AND TONICS",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "TANQUERAY ROYALE",
    "descripcion": "GIN AND TONICS",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "TANQUERAY",
    "descripcion": "GIN AND TONICS",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "BEEFEATER",
    "descripcion": "GIN AND TONICS",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "GIN TERRIER",
    "descripcion": "GIN AND TONICS",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "GIN LE TRIBUTE",
    "descripcion": "GIN AND TONICS",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "GIN BOMBAY STAR",
    "descripcion": "GIN AND TONICS",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "JOSE CUERVO REPOSADO",
    "descripcion": "TEQUILA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "JOSE CUERVO SILVER",
    "descripcion": "TEQUILA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "SAUZA SILVER",
    "descripcion": "TEQUILA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "SAUZA REPOSADO",
    "descripcion": "TEQUILA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "CORRALEJO",
    "descripcion": "TEQUILA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "HAVANA 7 AÑOS",
    "descripcion": "RON",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "BACARDI 8",
    "descripcion": "RON",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "BAECELO ESPECIAL",
    "descripcion": "RON",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "HAVANA ESPECIAL",
    "descripcion": "RON",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "FLOR DE CAÑA EXTRA SECO 4 AÑOS",
    "descripcion": "RON",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "FLOR DE CAÑA 3 AÑOS",
    "descripcion": "RON",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "BRUGAL RON COLOMBIA",
    "descripcion": "RON",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "BARCELO AÑEJO",
    "descripcion": "RON",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "BARCELO GRAN AÑEJO",
    "descripcion": "RON",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "BARCELO IMPERIAL",
    "descripcion": "RON",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "CAPEL",
    "descripcion": "PISCO",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "MISTRAL",
    "descripcion": "PISCO",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "TAPAU",
    "descripcion": "PISCO",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "CASA REAL",
    "descripcion": "SINGANI",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "CASA REAL GRAN SINGANI",
    "descripcion": "SINGANI",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "VELHO BARREIRO",
    "descripcion": "CACHACA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "VELO BARREIRO LIMON",
    "descripcion": "CACHACA",
    "precio": 0,
    "disponible": false
   },
   {
    "nombre": "CACHACA 51",
    "descripcion": "CACHACA",
    "precio": 0,
    "disponible": false
   }
  ]
 },
 {
  "categoria": "FIESTA DEL CARNICERO",
  "productos": [
   {
    "nombre": "EL ASADOR",
    "descripcion": "PISCO, REDUCCION DE VERMUT DE MARACUYA,JUGO DE POMELO,ALMIBAR, SAL DE CHILE.",
    "precio": 6500,
    "disponible": true
   },
   {
    "nombre": "CHILCANO JUJEÑO",
    "descripcion": "PISCO, ALMIBAR DE LOCOTO, GINGER ALE, JUGO DE LIMON, PIEL DE LIMON.",
    "precio": 5500,
    "disponible": true
   },
   {
    "nombre": "EL VENDE HUMO",
    "descripcion": "RON AÑEJO, BITTER ANGOSTURA, ALMIBAR DE MARACUYA,CAMPARI, JUGO DE POMELO, FRUTOS ROJOS, AHUMADO DE LASYUNGAS.",
    "precio": 6500,
    "disponible": true
   },
   {
    "nombre": "CARNAVAL",
    "descripcion": "SINGANI, CINZANO BIANCO, ALMIBAR DE MARACUYA, JUGO DE LIMON, AGUA TONICA.",
    "precio": 5600,
    "disponible": true
   },
   {
    "nombre": "CARBONERO",
    "descripcion": "BOURBON, MARACUYA, JUGO DE POMELO,BITTER ANGOSTURA, JUGO DE POMELO, ALMIBAR DE FRUTOS ROJOS, AHUMADO DE MADERAS DE SELVA.",
    "precio": 6500,
    "disponible": true
   },
   {
    "nombre": "VERMUT PARRILLERO",
    "descripcion": "VINO TORRONTES, CAMPARI, JUGODE LIMON, ALMIBAR DE MARACUYA, PEPINO, MENTA, FRUTOS ROJOS, AGUA TONICA.",
    "precio": 6500,
    "disponible": true
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
