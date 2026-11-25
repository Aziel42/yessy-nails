-- ================================================================
-- YESSY NAILS — Actualización de datos reales del negocio
-- ----------------------------------------------------------------
-- CÓMO USARLO:
--   1. Entra a tu proyecto en https://supabase.com
--   2. Menú lateral > SQL Editor > "New query"
--   3. Pega TODO este archivo y presiona "Run".
--
-- Este script NO recrea las tablas: solo actualiza los registros
-- (configuración + catálogo de servicios) para no perder citas,
-- mensajes de chat ni pedidos existentes.
-- Es idempotente: puedes ejecutarlo varias veces sin problema.
-- ================================================================


-- ================================================================
-- 1. AMPLIAR LAS CATEGORÍAS PERMITIDAS EN `servicios`
-- ----------------------------------------------------------------
-- El CHECK original solo admitía 5 valores; ahora se agregan
-- 'Pedicure/Spa' y 'Cejas'.
-- ================================================================
ALTER TABLE servicios DROP CONSTRAINT IF EXISTS servicios_categoria_check;
ALTER TABLE servicios ADD CONSTRAINT servicios_categoria_check CHECK (categoria IN (
    'Acrílico', 'Gelish', 'Soft Gel', 'Polygel',
    'Retiro/Mantenimiento', 'Pedicure/Spa', 'Cejas'
));


-- ================================================================
-- 2. CATÁLOGO DE SERVICIOS REALES
-- ----------------------------------------------------------------
-- Se conservan los ids 1, 2 y 3 para no romper las citas que ya
-- apuntan a esos servicios. Las citas que apuntaran a servicios
-- que se eliminan se reasignan al servicio 1.
-- ================================================================
UPDATE citas SET servicio_id = 1 WHERE servicio_id NOT IN (1, 2, 3);

DELETE FROM servicios WHERE id NOT IN (1, 2, 3);

INSERT INTO servicios (id, nombre, categoria, descripcion, precio_base, duracion_minutos, imagen_url) VALUES
(1, 'Uñas Acrílicas (Promo del Mes)', 'Acrílico',
    'Aplicación completa de acrílico esculpido con diseño de 1 a 3 tonos hasta el número 3. Promo del mes: desde $250 MXN.',
    250.00, 120, NULL),
(2, 'Pedispa Completo', 'Pedicure/Spa',
    'Exfoliación, cuadratura, masaje relajante, removedor de callosidad y células muertas, y gel semipermanente de 1 a 3 tonos.',
    320.00, 90, NULL),
(3, 'Planchado y Perfilado de Ceja', 'Cejas',
    'Planchado con queratina y perfilado profesional para cejas alineadas, definidas y con acabado natural.',
    150.00, 30, NULL)
ON CONFLICT (id) DO UPDATE SET
    nombre           = EXCLUDED.nombre,
    categoria        = EXCLUDED.categoria,
    descripcion      = EXCLUDED.descripcion,
    precio_base      = EXCLUDED.precio_base,
    duracion_minutos = EXCLUDED.duracion_minutos,
    imagen_url       = EXCLUDED.imagen_url;

-- Asegurar que la secuencia de ids continúe después del servicio 3
SELECT setval(
    pg_get_serial_sequence('servicios', 'id'),
    GREATEST((SELECT COALESCE(MAX(id), 3) FROM servicios), 3)
);

-- Mantener los totales de las citas coherentes con el nuevo precio del servicio
UPDATE citas c SET total_estimado = s.precio_base
FROM servicios s WHERE c.servicio_id = s.id;


-- ================================================================
-- 3. IDENTIDAD REAL DEL SALÓN (configuracion_sitio, fila id = 1)
-- ----------------------------------------------------------------
-- Seguridad bancaria: los campos de transferencia quedan con texto
-- de ejemplo GENÉRICO. Edítalos desde /admin con tus datos reales.
-- ================================================================
INSERT INTO configuracion_sitio (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

UPDATE configuracion_sitio SET
    titulo_banner               = 'Yessy Nails',
    subtitulo_banner            = 'Diseño y arte en cada detalle ✨ Tu estilo, mis manos',
    imagen_banner_url           = 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1920&q=80',
    promo_mes_titulo            = 'Promoción de Diciembre',
    promo_mes_texto             = 'Uñas acrílicas desde $250 MXN, de 1 a 3 tonos hasta el número 3.',
    telefono_whatsapp           = '+5215587431290',
    direccion_texto             = 'Las Américas (Av. Ignacio López Rayón entre Simón Bolívar y límite con Jardines de Morelos, Mz 42 Lt 5), Ecatepec de Morelos, Estado de México',
    latitud                     = 19.5855000,
    longitud                    = -99.0195000,
    horario_atencion            = 'Lunes a Viernes: 10:00 AM – 7:00 PM | Sábado: 9:00 AM – 4:00 PM | Domingo: Cerrado',
    bio_yessica                 = 'Soy Yessica Marlen Calderón Luna, nail artist profesional con 8 años de experiencia. Me apasiona transformar las manos de cada clienta en una obra de arte única. Especializada en uñas acrílicas, pedispa y diseño de cejas. Cada set que creo está pensado especialmente para ti, combinando las últimas tendencias con tu estilo personal. Trabajo 100% garantizado. ¡Agenda tu cita y déjame consentirte!',
    anos_experiencia            = 8,
    titular_transferencia       = 'Yessica Marlen Calderón Luna',
    clabe_transferencia         = '000000000000000000',
    banco_transferencia         = 'Banco de ejemplo (edítalo en /admin)'
WHERE id = 1;

-- ================================================================
-- FIN — Verificación rápida
-- ================================================================
-- SELECT id, nombre, categoria, precio_base FROM servicios ORDER BY id;
-- SELECT titulo_banner, anos_experiencia, direccion_texto, latitud, longitud FROM configuracion_sitio;
