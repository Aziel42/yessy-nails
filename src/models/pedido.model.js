// ================================================================
// YESSY NAILS — Modelo: Pedidos
// Acceso a la tabla pedidos en Supabase
// ================================================================

import { supabaseAdmin } from '../config/supabase.js';

const TABLE = 'pedidos';

const ALLOWED_FIELDS = [
    'cliente_id', 'nombre_cliente', 'correo_cliente', 'telefono_cliente',
    'items_json', 'total', 'tipo_entrega', 'direccion_entrega',
    'lat_entrega', 'lng_entrega', 'estado_pedido',
    'folio', 'codigo_qr', 'pago_estado', 'monto_total'
];

const qrMetaById = new Map();
const qrMetaByFolio = new Map();

function saveQrMeta(row, source = {}) {
    if (!row || !row.id) return row;
    const meta = {
        folio: row.folio || source.folio || qrMetaById.get(row.id)?.folio || null,
        codigo_qr: row.codigo_qr || source.codigo_qr || qrMetaById.get(row.id)?.codigo_qr || null,
        pago_estado: row.pago_estado || source.pago_estado || qrMetaById.get(row.id)?.pago_estado || 'pendiente',
        monto_total: row.monto_total ?? source.monto_total ?? qrMetaById.get(row.id)?.monto_total ?? row.total ?? null
    };
    qrMetaById.set(row.id, meta);
    if (meta.folio) qrMetaByFolio.set(meta.folio.toUpperCase(), row.id);
    return { ...row, ...meta };
}

function stripMissingColumns(payload, errorMsg = '') {
    const optionalCols = ['folio', 'codigo_qr', 'pago_estado', 'monto_total'];
    let stripped = false;
    for (const col of optionalCols) {
        if (errorMsg.includes(col) && payload[col] !== undefined) {
            delete payload[col];
            stripped = true;
        }
    }
    return stripped;
}

function buildPayload(data) {
    const payload = {};
    for (const field of ALLOWED_FIELDS) {
        if (data[field] !== undefined) payload[field] = data[field];
    }
    return payload;
}

/**
 * Crea un nuevo pedido de productos.
 * @param {object} data
 */
export async function createPedido(data) {
    const payload = buildPayload(data);
    let { data: created, error } = await supabaseAdmin
        .from(TABLE)
        .insert(payload)
        .select()
        .single();

    let attempts = 0;
    while (error && attempts < 4 && stripMissingColumns(payload, error.message)) {
        attempts++;
        const retry = await supabaseAdmin
            .from(TABLE)
            .insert(payload)
            .select()
            .single();
        created = retry.data;
        error = retry.error;
    }

    if (error) throw new Error(error.message);
    return saveQrMeta(created, data);
}

/**
 * Obtiene un pedido por ID.
 * @param {number} id
 */
export async function getPedidoById(id) {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return saveQrMeta(data);
}

/**
 * Obtiene un pedido por folio.
 * @param {string} folio
 */
export async function getPedidoByFolio(folio) {
    const upper = String(folio || '').trim().toUpperCase();
    if (!upper) return null;

    const cachedId = qrMetaByFolio.get(upper);
    if (cachedId) return getPedidoById(cachedId);

    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('*')
        .eq('folio', upper)
        .maybeSingle();

    if (!error && data) return saveQrMeta(data);
    return null;
}

/**
 * Lista todos los pedidos (más recientes primero).
 */
export async function getAllPedidos() {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('*')
        .order('fecha_creacion', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(row => saveQrMeta(row));
}

/**
 * Actualiza el estado u otros campos de un pedido.
 * @param {number} id
 * @param {object} data
 */
export async function updatePedido(id, data) {
    const payload = buildPayload(data);
    if (Object.keys(payload).length === 0) return null;

    let { data: updated, error } = await supabaseAdmin
        .from(TABLE)
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle();

    let attempts = 0;
    while (error && attempts < 4 && stripMissingColumns(payload, error.message)) {
        attempts++;
        if (Object.keys(payload).length === 0) {
            const existing = await getPedidoById(id);
            return saveQrMeta(existing, data);
        }
        const retry = await supabaseAdmin
            .from(TABLE)
            .update(payload)
            .eq('id', id)
            .select()
            .maybeSingle();
        updated = retry.data;
        error = retry.error;
    }

    if (error) throw new Error(error.message);
    return saveQrMeta(updated, data);
}

/**
 * Elimina un pedido.
 * @param {number} id
 */
export async function deletePedido(id) {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .delete()
        .eq('id', id)
        .select('id');

    if (error) throw new Error(error.message);
    return (data || []).length > 0;
}

export default { createPedido, getPedidoById, getPedidoByFolio, getAllPedidos, updatePedido, deletePedido };
