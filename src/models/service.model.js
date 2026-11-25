// ================================================================
// YESSY NAILS — Modelo: Servicios
// Acceso a la tabla servicios en Supabase
// ================================================================

import { supabaseAdmin } from '../config/supabase.js';

const TABLE = 'servicios';
const ALLOWED_FIELDS = ['nombre', 'categoria', 'descripcion', 'precio_base', 'duracion_minutos', 'imagen_url'];

function buildPayload(data) {
    const payload = {};
    for (const field of ALLOWED_FIELDS) {
        if (data[field] !== undefined) payload[field] = data[field];
    }
    return payload;
}

/**
 * Obtiene todos los servicios.
 * @param {string|null} categoria - Filtrar por categoría (opcional)
 */
export async function getAllServices(categoria = null) {
    let query = supabaseAdmin
        .from(TABLE)
        .select('*')
        .order('categoria', { ascending: true })
        .order('precio_base', { ascending: true });

    if (categoria) query = query.eq('categoria', categoria);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Obtiene un servicio por su ID.
 * @param {number} id
 */
export async function getServiceById(id) {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Crea un nuevo servicio.
 * @param {object} data - Datos del servicio
 */
export async function createService(data) {
    const { data: created, error } = await supabaseAdmin
        .from(TABLE)
        .insert(buildPayload(data))
        .select()
        .single();

    if (error) throw new Error(error.message);
    return created;
}

/**
 * Actualiza un servicio existente.
 * @param {number} id
 * @param {object} data - Campos a actualizar
 */
export async function updateService(id, data) {
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
 * Elimina un servicio.
 * @param {number} id
 */
export async function deleteService(id) {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .delete()
        .eq('id', id)
        .select('id');

    if (error) throw new Error(error.message);
    return (data || []).length > 0;
}

/**
 * Obtiene las categorías disponibles con conteo de servicios.
 */
export async function getCategories() {
    const { data, error } = await supabaseAdmin.from(TABLE).select('categoria');
    if (error) throw new Error(error.message);

    const counts = new Map();
    for (const row of data || []) {
        counts.set(row.categoria, (counts.get(row.categoria) || 0) + 1);
    }

    return [...counts.entries()]
        .map(([categoria, total]) => ({ categoria, total }))
        .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es'));
}

export default { getAllServices, getServiceById, createService, updateService, deleteService, getCategories };
