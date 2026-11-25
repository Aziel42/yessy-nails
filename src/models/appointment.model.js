// ================================================================
// YESSY NAILS — Modelo: Citas
// Acceso a la tabla citas en Supabase
// ================================================================

import { supabaseAdmin } from '../config/supabase.js';

const TABLE = 'citas';

// Selecciona la cita junto con los datos del servicio asociado
const SELECT_WITH_SERVICE = '*, servicios(nombre, categoria)';

const ALLOWED_FIELDS = [
    'cliente_id', 'nombre_cliente', 'correo_cliente', 'telefono_cliente', 'servicio_id',
    'fecha_cita', 'hora_cita', 'notas_diseno', 'total_estimado',
    'anticipo_requerido', 'metodo_pago', 'folio_transferencia',
    'estado_confirmacion_cliente', 'estado_cita', 'estado_pago'
];

function buildPayload(data) {
    const payload = {};
    for (const field of ALLOWED_FIELDS) {
        if (data[field] !== undefined) payload[field] = data[field];
    }
    return payload;
}

// Aplana el objeto embebido `servicios` para mantener el contrato del frontend
function flatten(row) {
    if (!row) return row;
    const { servicios, ...rest } = row;
    return {
        ...rest,
        servicio_nombre: servicios ? servicios.nombre : null,
        servicio_categoria: servicios ? servicios.categoria : null
    };
}

/**
 * Obtiene todas las citas, con datos del servicio asociado.
 * @param {object} filters - Filtros opcionales: estado_cita, fecha_cita
 */
export async function getAllAppointments(filters = {}) {
    let query = supabaseAdmin
        .from(TABLE)
        .select(SELECT_WITH_SERVICE)
        .order('fecha_cita', { ascending: true })
        .order('hora_cita', { ascending: true });

    if (filters.estado_cita) query = query.eq('estado_cita', filters.estado_cita);
    if (filters.fecha_cita) query = query.eq('fecha_cita', filters.fecha_cita);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map(flatten);
}

/**
 * Obtiene una cita por su ID, con datos del servicio.
 * @param {number} id
 */
export async function getAppointmentById(id) {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select(SELECT_WITH_SERVICE)
        .eq('id', id)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return flatten(data);
}

/**
 * Crea una nueva cita.
 * @param {object} data - Datos de la cita
 */
export async function createAppointment(data) {
    const { data: created, error } = await supabaseAdmin
        .from(TABLE)
        .insert(buildPayload(data))
        .select(SELECT_WITH_SERVICE)
        .single();

    if (error) throw new Error(error.message);
    return flatten(created);
}

/**
 * Actualiza una cita (estado, pago, etc.).
 * @param {number} id
 * @param {object} data - Campos a actualizar
 */
export async function updateAppointment(id, data) {
    const payload = buildPayload(data);
    if (Object.keys(payload).length === 0) return null;

    const { data: updated, error } = await supabaseAdmin
        .from(TABLE)
        .update(payload)
        .eq('id', id)
        .select(SELECT_WITH_SERVICE)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return flatten(updated);
}

/**
 * Elimina una cita.
 * @param {number} id
 */
export async function deleteAppointment(id) {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .delete()
        .eq('id', id)
        .select('id');

    if (error) throw new Error(error.message);
    return (data || []).length > 0;
}

/**
 * Verifica disponibilidad en una fecha y hora específicas.
 * @param {string} fecha - Formato YYYY-MM-DD
 * @param {string} hora - Formato HH:MM
 * @param {number|null} excludeId - ID de cita a excluir (para edición)
 */
export async function checkAvailability(fecha, hora, excludeId = null) {
    let query = supabaseAdmin
        .from(TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('fecha_cita', fecha)
        .eq('hora_cita', hora)
        .not('estado_cita', 'in', '("cancelada","completada")');

    if (excludeId) query = query.neq('id', excludeId);

    const { count, error } = await query;
    if (error) throw new Error(error.message);
    return (count || 0) === 0; // true = disponible
}

/**
 * Auto-cancelación de citas pendientes sin confirmar anticipo.
 * Cancela las citas en estado 'pendiente' cuya clienta aún no ha enviado
 * folio de anticipo y que superan el límite de horas configurado.
 * @param {number} hoursLimit - Horas máximas para confirmar
 * @returns {Promise<number>} Número de citas canceladas
 */
export async function autoCancelExpired(hoursLimit = 24) {
    const horas = Number(hoursLimit) > 0 ? Number(hoursLimit) : 24;
    const cutoff = new Date(Date.now() - horas * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .update({ estado_cita: 'cancelada' })
        .eq('estado_cita', 'pendiente')
        .eq('estado_confirmacion_cliente', 'pendiente')
        .is('folio_transferencia', null)
        .lt('fecha_creacion', cutoff)
        .select('id');

    if (error) throw new Error(error.message);
    return (data || []).length;
}

/**
 * Obtiene las citas de hoy con datos del servicio.
 */
export async function getTodayAppointments() {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select(SELECT_WITH_SERVICE)
        .eq('fecha_cita', today)
        .order('hora_cita', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map(flatten);
}

export default {
    getAllAppointments, getAppointmentById, createAppointment,
    updateAppointment, deleteAppointment, checkAvailability,
    getTodayAppointments, autoCancelExpired
};
