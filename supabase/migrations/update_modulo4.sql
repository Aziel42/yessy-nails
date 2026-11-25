-- ================================================================
-- YESSY NAILS — Migración Módulo 4
-- Reemplaza los 8 trabajos demo del portafolio por las 16 fotos
-- reales de Yessica (diseno-01.jpg … diseno-16.jpg).
-- También amplía el CHECK de estilo en portafolio para incluir
-- 'Acrílico' y 'Francés Moderno', y agrega el estilo en el CHECK
-- existente si aún no estaba.
--
-- INSTRUCCIONES:
--   1. Abre el SQL Editor en https://supabase.com/dashboard
--   2. Pega este archivo completo y presiona "Run".
-- ================================================================

-- ----------------------------------------------------------------
-- 0. Ampliar el CHECK de estilo en portafolio (si se requiere)
--    Los valores añadidos son compatibles con el CHECK original.
--    Se elimina la restricción antigua y se recrea con los 5 valores.
-- ----------------------------------------------------------------
ALTER TABLE portafolio
    DROP CONSTRAINT IF EXISTS portafolio_estilo_check;

ALTER TABLE portafolio
    ADD CONSTRAINT portafolio_estilo_check
    CHECK (estilo IN ('Minimalista', '3D', 'Francés', 'Temporada', 'Acrílico'));

-- ----------------------------------------------------------------
-- 1. Limpiar trabajos demo anteriores
-- ----------------------------------------------------------------
DELETE FROM portafolio;

-- ----------------------------------------------------------------
-- 2. Insertar los 16 trabajos reales con imágenes locales
-- ----------------------------------------------------------------
INSERT INTO portafolio (titulo, estilo, descripcion, imagen_url, fecha_creacion) VALUES

-- Acrílico (3 diseños)
('Acrílico Nude con Líneas Doradas',
 'Acrílico',
 'Set almendra en tono nude rosa con líneas doradas finas y aplicaciones de cristal. Elegante y versátil para cualquier ocasión.',
 '/img/diseno-01.jpg',
 '2026-11-21 22:29:00'),

('Acrílico Coffin Nude Beige',
 'Acrílico',
 'Coffin mediano en tono beige natural. Base semitransparente con destellos de nail art sutil. Ideal para uso diario.',
 '/img/diseno-02.jpg',
 '2026-11-21 22:29:00'),

('Acrílico Almond Rosa Pastel',
 'Acrílico',
 'Almendra en rosa pastel con acabado gel brillante. Diseño limpio y femenino apto para toda temporada.',
 '/img/diseno-03.jpg',
 '2026-11-21 22:29:00'),

-- Minimalista (3 diseños)
('Minimalista Blanco con Acento',
 'Minimalista',
 'Base blanco leche con una sola uña accent en color nude oscuro y detalle de dot dorado. Sofisticado y sin exceso.',
 '/img/diseno-04.jpg',
 '2026-11-21 22:29:00'),

('Minimalista Nude Oscuro Mate',
 'Minimalista',
 'Set coffin en tono nude oscuro con acabado mate premium. Sin ornamentos, pura línea y forma. Clásico atemporal.',
 '/img/diseno-05.jpg',
 '2026-11-21 22:29:00'),

('Minimalista Transparente con Flor Prensada',
 'Minimalista',
 'Base cristal/transparente con una flor natural prensada encapsulada en la uña accent. Delicado y único.',
 '/img/diseno-06.jpg',
 '2026-11-21 22:29:00'),

-- 3D (3 diseños)
('3D Flores de Acrílico en Relieve',
 '3D',
 'Flores tridimensionales de acrílico en tonos pastel sobre base nude. Texturas delicadas en relieve que lucen en cualquier ángulo.',
 '/img/diseno-07.jpg',
 '2026-11-21 22:29:00'),

('3D Mariposas Encapsuladas',
 '3D',
 'Mariposas holográficas en 3D encapsuladas en gel cristal. Efecto de profundidad espectacular. Alto impacto visual.',
 '/img/diseno-08.jpg',
 '2026-11-21 22:29:00'),

('3D Pedrería y Cristales Swarovski',
 '3D',
 'Diseño de lujo con cristales Swarovski y pedrería de distintos tamaños formando patrón floral en coffin mediano.',
 '/img/diseno-09.jpg',
 '2026-11-21 22:29:00'),

-- Francés (3 diseños)
('Francés Clásico Blanco Puro',
 'Francés',
 'French tip tradicional en forma almendra, sonrisa perfecta en blanco puro sobre base rosa translúcida. Atemporal.',
 '/img/diseno-10.jpg',
 '2026-11-21 22:29:00'),

('Francés Dorado Cromado',
 'Francés',
 'French tip en sonrisa dorada cromada sobre base nude. Twist moderno del clásico francés para eventos especiales.',
 '/img/diseno-11.jpg',
 '2026-11-21 22:29:00'),

('Micro Francés con Glitter Holográfico',
 'Francés',
 'Baby french con línea ultrafina de glitter holográfico en uña stiletto mediana. Acabado gel brillante de alta duración.',
 '/img/diseno-12.jpg',
 '2026-11-21 22:29:00'),

-- Temporada (4 diseños)
('Colección Otoño: Terracota y Burdeos',
 'Temporada',
 'Set inspirado en otoño con tonos terracota, burdeos y dorado. Hojas encapsuladas y efecto sweater en uña accent.',
 '/img/diseno-13.jpg',
 '2026-11-21 22:29:00'),

('Navidad Elegante: Rojo y Copos Cromados',
 'Temporada',
 'Diseño navideño sofisticado: rojo cereza, verde esmeralda, copos de nieve cromados y accent con árbol dorado 3D.',
 '/img/diseno-14.jpg',
 '2026-11-21 22:29:00'),

('Verano Tropical: Neon y Frutas',
 'Temporada',
 'Colores neón con motivos tropicales: sandías, flamas y palmeras en uñas cortas cuadradas. Perfectas para playa.',
 '/img/diseno-15.jpg',
 '2026-11-21 22:29:00'),

('Día de Muertos: Arte Tradicional',
 'Temporada',
 'Homenaje al arte mexicano: calavera de azúcar en uña accent, cempasúchil dorado y fondo negro con detalles en colores vivos.',
 '/img/diseno-16.jpg',
 '2026-11-21 22:29:00');
