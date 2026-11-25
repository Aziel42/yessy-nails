// ================================================================
// YESSY NAILS — Modelo: Pedidos
// Acceso a la tabla pedidos en Supabase
// ================================================================

import { supabaseAdmin } from '../config/supabase.js';

const TABLE = 'pedidos';

const ALLOWED_FIELDS = [
    'cliente_id', 'nombre_cliente', 'correo_cliente', 'telefono_cliente',
    'items_json', 'total', 'tipo_entrega', 'direccion_entrega',
    'lat_entrega', 'lng_entrega', 'estado_pedido'
];

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
    const { data: created, error } = await supabaseAdmin
        .from(TABLE)
        .insert(buildPayload(data))
        .select()
        .single();

    if (error) throw new Error(error.message);
    return created;
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
    return data || [];
}

/**
 * Actualiza el estado u otros campos de un pedido.
 * @param {number} id
 * @param {object} data
 */
export async function updatePedido(id, data) {
    const payload = buildPayload(data);
    if (Object.keys(payload).length === 0) return null;

    const { data: updated, error } = await supabaseAdmin
        .from(TABLE)
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle();

    if (error) throw new Error(error.message);
    return updated;
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

export default { createPedido, getAllPedidos, updatePedido, deletePedido };
