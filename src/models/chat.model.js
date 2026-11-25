// ================================================================
// YESSY NAILS — Modelo: Chat / Mensajes
// Acceso a la tabla mensajes_chat en Supabase
// ================================================================

import { supabaseAdmin } from '../config/supabase.js';

const TABLE = 'mensajes_chat';

/**
 * Obtiene todas las salas de chat con el último mensaje de cada una.
 */
export async function getAllRooms() {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('*')
        .order('fecha_envio', { ascending: true })
        .order('id', { ascending: true });

    if (error) throw new Error(error.message);

    // Agrupar por sala quedándonos con el último mensaje (los registros llegan ordenados asc).
    // `nombre_cliente` se toma SIEMPRE de un mensaje con rol 'cliente' (nunca del salón/Yessica).
    const rooms = new Map();
    for (const m of data || []) {
        let room = rooms.get(m.sala_cliente_id);
        if (!room) {
            room = {
                sala_cliente_id: m.sala_cliente_id,
                nombre_cliente: null,
                nombre_remitente: m.nombre_remitente,
                ultimo_mensaje: m.mensaje,
                ultima_fecha: m.fecha_envio,
                mensajes_sin_leer: 0
            };
            rooms.set(m.sala_cliente_id, room);
        }

        room.nombre_remitente = m.nombre_remitente;
        room.ultimo_mensaje = m.mensaje;
        room.ultima_fecha = m.fecha_envio;

        if (m.rol === 'cliente') {
            room.nombre_cliente = m.nombre_remitente;
            if (!m.leido) room.mensajes_sin_leer += 1;
        }
    }

    // Respaldo: si la sala no tuviera mensajes de clienta, usar el último remitente conocido
    for (const room of rooms.values()) {
        if (!room.nombre_cliente) room.nombre_cliente = room.nombre_remitente;
    }

    return [...rooms.values()].sort(
        (a, b) => new Date(b.ultima_fecha) - new Date(a.ultima_fecha)
    );
}

/**
 * Obtiene todos los mensajes de una sala de chat.
 * @param {string} salaId - Identificador de la sala
 */
export async function getMessagesByRoom(salaId) {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('*')
        .eq('sala_cliente_id', salaId)
        .order('fecha_envio', { ascending: true })
        .order('id', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Envía un nuevo mensaje en una sala.
 * @param {object} data - Datos del mensaje
 */
export async function createMessage(data) {
    const { sala_cliente_id, nombre_remitente, rol, mensaje } = data;

    const { data: created, error } = await supabaseAdmin
        .from(TABLE)
        .insert({ sala_cliente_id, nombre_remitente, rol, mensaje })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return created;
}

/**
 * Marca todos los mensajes de una sala como leídos.
 * @param {string} salaId - Identificador de la sala
 * @param {string} rol - Rol cuyos mensajes se marcan como leídos
 */
export async function markAsRead(salaId, rol = 'cliente') {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .update({ leido: true })
        .eq('sala_cliente_id', salaId)
        .eq('rol', rol)
        .eq('leido', false)
        .select('id');

    if (error) throw new Error(error.message);
    return (data || []).length;
}

/**
 * Cuenta mensajes sin leer para el admin (mensajes de clientes).
 */
export async function getUnreadCount() {
    const { count, error } = await supabaseAdmin
        .from(TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('rol', 'cliente')
        .eq('leido', false);

    if (error) throw new Error(error.message);
    return count || 0;
}

export default { getAllRooms, getMessagesByRoom, createMessage, markAsRead, getUnreadCount };
