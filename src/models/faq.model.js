// ================================================================
// YESSY NAILS — Modelo: FAQs
// Acceso a la tabla faqs en Supabase
// ================================================================

import { supabaseAdmin } from '../config/supabase.js';

const TABLE = 'faqs';

/**
 * Obtiene todas las FAQs activas (o todas si se pide).
 * @param {object} opts
 * @param {boolean} opts.onlyActive
 */
export async function getAllFaqs({ onlyActive = true } = {}) {
    let query = supabaseAdmin
        .from(TABLE)
        .select('*')
        .order('orden', { ascending: true })
        .order('id', { ascending: true });

    if (onlyActive) {
        query = query.eq('activa', true);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Crea una nueva FAQ.
 */
export async function createFaq(data) {
    const payload = {
        pregunta: (data.pregunta || '').trim(),
        respuesta: (data.respuesta || '').trim(),
        orden: Number(data.orden) || 0,
        activa: data.activa !== false
    };

    const { data: created, error } = await supabaseAdmin
        .from(TABLE)
        .insert(payload)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return created;
}

/**
 * Elimina una FAQ por ID.
 */
export async function deleteFaq(id) {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .delete()
        .eq('id', id)
        .select('id');

    if (error) throw new Error(error.message);
    return (data || []).length > 0;
}

export default { getAllFaqs, createFaq, deleteFaq };