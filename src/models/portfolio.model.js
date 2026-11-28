// ================================================================
// YESSY NAILS — Modelo: Portafolio
// Acceso a la tabla portafolio en Supabase
// ================================================================

import { supabaseAdmin } from '../config/supabase.js';

const TABLE = 'portafolio';
const ALLOWED_FIELDS = ['titulo', 'estilo', 'descripcion', 'imagen_url', 'precio'];

function buildPayload(data) {
    const payload = {};
    for (const field of ALLOWED_FIELDS) {
        if (data[field] !== undefined) payload[field] = data[field];
    }
    return payload;
}

/**
 * Obtiene todos los trabajos del portafolio.
 * @param {string|null} estilo - Filtrar por estilo (opcional)
 */
export async function getAllPortfolio(estilo = null) {
    let query = supabaseAdmin
        .from(TABLE)
        .select('*')
        .order('fecha_creacion', { ascending: false });

    if (estilo) query = query.eq('estilo', estilo);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Obtiene un trabajo del portafolio por su ID.
 * @param {number} id
 */
export async function getPortfolioById(id) {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Crea un nuevo trabajo en el portafolio.
 * @param {object} data - Datos del trabajo
 */
export async function createPortfolio(data) {
    const { data: created, error } = await supabaseAdmin
        .from(TABLE)
        .insert(buildPayload(data))
        .select()
        .single();

    if (error) throw new Error(error.message);
    return created;
}

/**
 * Actualiza un trabajo del portafolio.
 * @param {number} id
 * @param {object} data - Campos a actualizar
 */
export async function updatePortfolio(id, data) {
    const payload = buildPayload(data);
    if (Object.keys(payload).length === 0) return null;

    let { data: updated, error } = await supabaseAdmin
        .from(TABLE)
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle();

    if (error && error.message.includes('precio')) {
        delete payload.precio;
        if (Object.keys(payload).length === 0) return getPortfolioById(id);
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
    return updated;
}

/**
 * Elimina un trabajo del portafolio.
 * @param {number} id
 */
export async function deletePortfolio(id) {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .delete()
        .eq('id', id)
        .select('id');

    if (error) throw new Error(error.message);
    return (data || []).length > 0;
}

/**
 * Obtiene los estilos disponibles con conteo.
 */
export async function getStyles() {
    const { data, error } = await supabaseAdmin.from(TABLE).select('estilo');
    if (error) throw new Error(error.message);

    const counts = new Map();
    for (const row of data || []) {
        counts.set(row.estilo, (counts.get(row.estilo) || 0) + 1);
    }

    return [...counts.entries()]
        .map(([estilo, total]) => ({ estilo, total }))
        .sort((a, b) => a.estilo.localeCompare(b.estilo, 'es'));
}

export default { getAllPortfolio, getPortfolioById, createPortfolio, updatePortfolio, deletePortfolio, getStyles };
