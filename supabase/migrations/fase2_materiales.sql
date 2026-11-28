-- ================================================================
-- YESSY NAILS — Migración Fase 2: Inventario de Materiales y Stock
-- ================================================================

CREATE TABLE IF NOT EXISTS materiales (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Barniz',
    color_hex TEXT DEFAULT '#D4A5A5',
    stock_actual INTEGER NOT NULL DEFAULT 10,
    stock_minimo INTEGER NOT NULL DEFAULT 3,
    consumo_por_cita INTEGER NOT NULL DEFAULT 1,
    precio_extra NUMERIC(10, 2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE citas
    ADD COLUMN IF NOT EXISTS materiales_ids JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS materiales_seleccionados JSONB DEFAULT '[]'::jsonb;

INSERT INTO materiales (nombre, categoria, color_hex, stock_actual, stock_minimo, consumo_por_cita, precio_extra, activo)
VALUES
    ('Gelish Rosa Nude #01', 'Barniz', '#E6B8B8', 12, 3, 1, 0, TRUE),
    ('Gelish Blanco Leche #04', 'Barniz', '#FAF6F0', 10, 3, 1, 0, TRUE),
    ('Gelish Rojo Cereza #12', 'Barniz', '#B71C1C', 2, 3, 1, 15, TRUE),
    ('Gelish Negro Ónix #20', 'Barniz', '#1F1B1C', 8, 3, 1, 0, TRUE),
    ('Acrílico Cristal Transparente', 'Acrílico', '#F2F4F8', 15, 4, 1, 0, TRUE),
    ('Acrílico Cover Pink', 'Acrílico', '#F3C6C6', 9, 3, 1, 25, TRUE),
    ('Tips Soft Gel Almendra', 'Tip', '#F5E6DA', 14, 4, 1, 30, TRUE),
    ('Tips Coffin Cristal', 'Tip', '#EAECEF', 0, 3, 1, 30, TRUE),
    ('Cristales Swarovski Mix', 'Decoración', '#D4AF37', 10, 3, 1, 45, TRUE),
    ('Hoja de Oro 24k', 'Decoración', '#C9A84C', 3, 3, 1, 35, TRUE)
ON CONFLICT DO NOTHING;
