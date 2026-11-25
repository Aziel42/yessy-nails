// ================================================================
// YESSY NAILS — Modelo: Clientes (registro ligero de clientas)
// Acceso a la tabla clientes en Supabase
// ================================================================

import { supabaseAdmin } from '../config/supabase.js';

const TABLE = 'clientes';

/**
 * Busca una clienta por su correo electrónico.
 * @param {string} correo
 */
export async function getByEmail(correo) {
    if (!correo) return null;
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('*')
        .eq('correo', correo)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Registro/actualización ligero de una clienta por correo (sin contraseña).
 * - Si NO existe → la crea (acepta_promociones por defecto true).
 * - Si existe → actualiza nombre/teléfono y, sólo si se indica, acepta_promociones.
 * @param {object} data { nombre, correo, telefono, acepta_promociones }
 */
export async function upsertCliente(data) {
    const correo = (data.correo || '').trim().toLowerCase();
    if (!correo) return null;

    const nombre = (data.nombre || '').trim() || 'Clienta';
    const telefono = data.telefono ? String(data.telefono).trim() : null;

    const existing = await getByEmail(correo);

    if (existing) {
        const patch = {};
        if (nombre) patch.nombre = nombre;
        if (telefono) patch.telefono = telefono;
        if (data.acepta_promociones !== undefined) patch.acepta_promociones = Boolean(data.acepta_promociones);

        if (Object.keys(patch).length === 0) return existing;

        const { data: updated, error } = await supabaseAdmin
            .from(TABLE)
            .update(patch)
            .eq('id', existing.id)
            .select()
            .maybeSingle();

        if (error) throw new Error(error.message);
        return updated;
    }

    const { data: created, error } = await supabaseAdmin
        .from(TABLE)
        .insert({
            nombre,
            correo,
            telefono,
            acepta_promociones: data.acepta_promociones !== undefined ? Boolean(data.acepta_promociones) : true
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return created;
}

/**
 * Lista todas las clientas registradas.
 */
export async function getAllClientes() {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('*')
        .order('fecha_registro', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Lista las clientas que aceptaron recibir promociones.
 */
export async function getClientesPromociones() {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('id, nombre, correo')
        .eq('acepta_promociones', true)
        .order('fecha_registro', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export default { getByEmail, upsertCliente, getAllClientes, getClientesPromociones };
