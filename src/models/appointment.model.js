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
    'estado_confirmacion_cliente', 'estado_cita', 'estado_pago',
    'materiales_ids', 'materiales_seleccionados',
    'folio', 'codigo_qr', 'pago_estado', 'monto_total'
];

// Respaldo en memoria para metadatos QR/folio si la migración SQL aún no se ha ejecutado
const qrMetaById = new Map();
const qrMetaByFolio = new Map();

function saveQrMeta(row, source = {}) {
    if (!row || !row.id) return row;
    const meta = {
        folio: row.folio || source.folio || qrMetaById.get(row.id)?.folio || null,
        codigo_qr: row.codigo_qr || source.codigo_qr || qrMetaById.get(row.id)?.codigo_qr || null,
        pago_estado: row.pago_estado || source.pago_estado || qrMetaById.get(row.id)?.pago_estado || (row.estado_pago === 'pagado' ? 'pagado' : 'pendiente'),
        monto_total: row.monto_total ?? source.monto_total ?? qrMetaById.get(row.id)?.monto_total ?? row.total_estimado ?? null
    };
    qrMetaById.set(row.id, meta);
    if (meta.folio) qrMetaByFolio.set(meta.folio.toUpperCase(), row.id);
    return { ...row, ...meta };
}

function stripMissingColumns(payload, errorMsg = '') {
    const optionalCols = ['materiales_ids', 'materiales_seleccionados', 'folio', 'codigo_qr', 'pago_estado', 'monto_total'];
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

// Aplana el objeto embebido `servicios` para mantener el contrato del frontend
function flatten(row) {
    if (!row) return row;
    const { servicios, ...rest } = row;
    const flat = {
        ...rest,
        servicio_nombre: servicios ? servicios.nombre : null,
        servicio_categoria: servicios ? servicios.categoria : null
    };
    const cached = qrMetaById.get(flat.id);
    if (cached) {
        flat.folio = flat.folio || cached.folio;
        flat.codigo_qr = flat.codigo_qr || cached.codigo_qr;
        flat.pago_estado = flat.pago_estado || cached.pago_estado;
        flat.monto_total = flat.monto_total ?? cached.monto_total;
    }
    return flat;
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
    const payload = buildPayload(data);
    let { data: created, error } = await supabaseAdmin
        .from(TABLE)
        .insert(payload)
        .select(SELECT_WITH_SERVICE)
        .single();

    // Respaldo si columnas opcionales aún no existen en Supabase
    let attempts = 0;
    while (error && attempts < 4 && stripMissingColumns(payload, error.message)) {
        attempts++;
        const retry = await supabaseAdmin
            .from(TABLE)
            .insert(payload)
            .select(SELECT_WITH_SERVICE)
            .single();
        created = retry.data;
        error = retry.error;
    }

    if (error) throw new Error(error.message);
    return saveQrMeta(flatten(created), data);
}

/**
 * Actualiza una cita (estado, pago, etc.).
 * @param {number} id
 * @param {object} data - Campos a actualizar
 */
export async function updateAppointment(id, data) {
    const payload = buildPayload(data);
    if (Object.keys(payload).length === 0) return null;

    let { data: updated, error } = await supabaseAdmin
        .from(TABLE)
        .update(payload)
        .eq('id', id)
        .select(SELECT_WITH_SERVICE)
        .maybeSingle();

    let attempts = 0;
    while (error && attempts < 4 && stripMissingColumns(payload, error.message)) {
        attempts++;
        if (Object.keys(payload).length === 0) {
            const existing = await getAppointmentById(id);
            return saveQrMeta(existing, data);
        }
        const retry = await supabaseAdmin
            .from(TABLE)
            .update(payload)
            .eq('id', id)
            .select(SELECT_WITH_SERVICE)
            .maybeSingle();
        updated = retry.data;
        error = retry.error;
    }

    if (error) throw new Error(error.message);
    return saveQrMeta(flatten(updated), data);
}

/**
 * Busca una cita por folio (ej. YN-2026-XXXX) o por ID numérico (#12).
 * @param {string} codigo
 */
export async function getAppointmentByFolio(codigo) {
    const clean = String(codigo || '').trim();
    if (!clean) return null;

    const upper = clean.toUpperCase();
    const cachedId = qrMetaByFolio.get(upper);
    if (cachedId) {
        const found = await getAppointmentById(cachedId);
        if (found) return found;
    }

    // Intentar búsqueda directa por columna folio
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select(SELECT_WITH_SERVICE)
        .eq('folio', upper)
        .maybeSingle();

    if (!error && data) {
        return flatten(data);
    }

    // Si es numérico o #ID, buscar por id
    const numericMatch = clean.replace(/^#/, '');
    if (/^\d+$/.test(numericMatch)) {
        return getAppointmentById(Number(numericMatch));
    }

    return null;
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
 * Cuenta citas activas (pendiente/confirmada) de un mismo correo o teléfono.
 * @param {string|null} email
 * @param {string|null} phone
 */
export async function countActiveAppointments(email = null, phone = null) {
    const conditions = [];
    if (email) conditions.push(`correo_cliente.eq.${encodeURIComponent(email)}`);
    if (phone) conditions.push(`telefono_cliente.eq.${encodeURIComponent(phone)}`);

    let query = supabaseAdmin
        .from(TABLE)
        .select('id', { count: 'exact', head: true })
        .in('estado_cita', ['pendiente', 'confirmada']);

    if (conditions.length > 0) {
        query = query.or(conditions.join(','));
    }

    const { count, error } = await query;
    if (error) throw new Error(error.message);
    return count || 0;
}

/**
 * Auto-cancelación de citas pendientes sin confirmar anticipo.
 * Cancela las citas en estado 'pendiente' cuya clienta aún no ha enviado
 * folio de anticipo y que superan el límite de horas configurado.
 * Excluye explícitamente citas con pago en sucursal ('efectivo' / 'sucursal')
 * y transferencia ('transferencia'), aplicando solo a tarjeta no confirmada.
 * @param {number} hoursLimit - Horas máximas para confirmar
 * @returns {Promise<Array>} Citas canceladas (con correo_cliente para notificaciones)
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
        .not('metodo_pago', 'in', '("efectivo","sucursal","transferencia")')
        .not('estado_pago', 'in', '("Sin anticipo (Pago en sucursal)","Anticipo vía transferencia")')
        .lt('fecha_creacion', cutoff)
        .select('id, nombre_cliente, correo_cliente, fecha_cita, hora_cita, materiales_ids');

    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Archiva citas según su estado y antigüedad:
 * - Cerradas ('completada' o 'cancelada'): cuando su fecha_cita tiene 7 días o más.
 * - Caducadas ('pendiente' o 'confirmada'): cuando fecha_cita + hora_cita ya pasó hace 24 horas o más.
 * @param {string} cutoffDate - Fecha límite YYYY-MM-DD para citas cerradas (7 días atrás)
 * @returns {Promise<number>} Cantidad total de citas archivadas
 */
export async function archiveOldAppointments(cutoffDate) {
    // 1. Citas cerradas ('completada' o 'cancelada') con >= 7 días
    const { data: closedArchived, error: closedError } = await supabaseAdmin
        .from(TABLE)
        .update({ estado_cita: 'archivada' })
        .in('estado_cita', ['completada', 'cancelada'])
        .lte('fecha_cita', cutoffDate)
        .select('id');

    if (closedError) throw new Error(closedError.message);

    // 2. Citas abiertas ('pendiente' o 'confirmada') cuya fecha y hora ya pasaron hace >= 24 horas
    const nowMs = Date.now();
    const cutoff24hMs = nowMs - 24 * 60 * 60 * 1000;
    const todayStr = new Date(nowMs).toISOString().split('T')[0];

    const { data: openCandidates, error: openError } = await supabaseAdmin
        .from(TABLE)
        .select('id, fecha_cita, hora_cita')
        .in('estado_cita', ['pendiente', 'confirmada'])
        .lte('fecha_cita', todayStr);

    if (openError) throw new Error(openError.message);

    const expiredIds = (openCandidates || [])
        .filter(c => {
            const timePart = c.hora_cita || '23:59:59';
            const apptMs = new Date(`${c.fecha_cita}T${timePart}`).getTime();
            return !Number.isNaN(apptMs) && apptMs <= cutoff24hMs;
        })
        .map(c => c.id);

    let expiredArchivedCount = 0;
    if (expiredIds.length > 0) {
        const { data: expiredArchived, error: expireUpdateError } = await supabaseAdmin
            .from(TABLE)
            .update({ estado_cita: 'archivada' })
            .in('id', expiredIds)
            .select('id');

        if (expireUpdateError) throw new Error(expireUpdateError.message);
        expiredArchivedCount = (expiredArchived || []).length;
    }

    return (closedArchived || []).length + expiredArchivedCount;
}

/**
 * Elimina definitivamente citas cuya fecha tiene 30 días o más de antigüedad.
 * @param {string} cutoffDate - Fecha límite YYYY-MM-DD
 * @returns {Promise<number>} Cantidad de citas eliminadas
 */
export async function deleteExpiredAppointments(cutoffDate) {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .delete()
        .lte('fecha_cita', cutoffDate)
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
    getAllAppointments, getAppointmentById, getAppointmentByFolio, createAppointment,
    updateAppointment, deleteAppointment, checkAvailability,
    getTodayAppointments, autoCancelExpired,
    archiveOldAppointments, deleteExpiredAppointments
};
