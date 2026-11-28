-- ================================================================
-- YESSY NAILS — Migración Fase 3: Pagos Mercado Pago y Passes QR
-- ================================================================

ALTER TABLE citas
    ADD COLUMN IF NOT EXISTS folio VARCHAR(32),
    ADD COLUMN IF NOT EXISTS codigo_qr TEXT,
    ADD COLUMN IF NOT EXISTS pago_estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    ADD COLUMN IF NOT EXISTS monto_total NUMERIC(10,2);

ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS folio VARCHAR(32),
    ADD COLUMN IF NOT EXISTS codigo_qr TEXT,
    ADD COLUMN IF NOT EXISTS pago_estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    ADD COLUMN IF NOT EXISTS monto_total NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_citas_folio   ON citas (folio);
CREATE INDEX IF NOT EXISTS idx_pedidos_folio ON pedidos (folio);
