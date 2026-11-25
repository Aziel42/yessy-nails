// ================================================================
// YESSY NAILS — Controlador: Citas
// Lógica de negocio para /api/citas
// ================================================================

import * as AppointmentModel from '../models/appointment.model.js';
import * as ServiceModel from '../models/service.model.js';
import * as ClienteModel from '../models/cliente.model.js';
import * as ConfigModel from '../models/config.model.js';
import * as EmailService from '../services/email.service.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { sanitizeStr, isValidEmail, safeInt } from '../utils/sanitize.js';

/**
 * Ejecuta la auto-cancelación si el interruptor está activado en la config.
 * Envía correo de cancelación a cada clienta afectada que tenga correo.
 * @returns {Promise<{activo:boolean, canceladas:number}>}
 */
async function runAutoCancel() {
    try {
        const config = await ConfigModel.getConfig();
        const activo = Boolean(config && config.auto_cancelar_sin_confirmar);
        if (!activo) return { activo: false, canceladas: 0 };

        const citasCanceladas = await AppointmentModel.autoCancelExpired(
            config.horas_limite_confirmacion || 24
        );

        const motivo = 'No se recibió el anticipo de $50 MXN en el tiempo establecido. Puedes reagendar tu cita cuando gustes.';

        // Notificar a cada clienta (en paralelo, sin bloquear si alguna falla)
        await Promise.allSettled(
            citasCanceladas
                .filter(c => c.correo_cliente)
                .map(c => enviarCorreoCancelacion(c, motivo))
        );

        return { activo: true, canceladas: citasCanceladas.length };
    } catch (e) {
        console.warn('⚠️  Error en auto-cancelación de citas:', e.message);
        return { activo: false, canceladas: 0 };
    }
}

/**
 * GET /api/citas
 * Lista todas las citas. Acepta queries: ?estado_cita=pendiente&fecha_cita=2026-11-20
 * Si `auto_cancelar_sin_confirmar` está activado, cancela antes las citas vencidas.
 */
export async function getAll(req, res) {
    try {
        await runAutoCancel();

        const { estado_cita, fecha_cita } = req.query;
        const citas = await AppointmentModel.getAllAppointments({ estado_cita, fecha_cita });

        return successResponse(res, citas, `${citas.length} cita(s) encontrada(s).`);
    } catch (error) {
        return errorResponse(res, 'Error al obtener las citas.', 500, error.message);
    }
}

/**
 * POST /api/citas/verificar  (protegido - admin)
 * Fuerza la revisión de citas pendientes vencidas. Solo cancela si el
 * interruptor `auto_cancelar_sin_confirmar` está activado.
 */
export async function verifyPending(req, res) {
    try {
        const resultado = await runAutoCancel();

        const message = resultado.activo
            ? `Verificación completada. ${resultado.canceladas} cita(s) cancelada(s) por falta de confirmación.`
            : 'La auto-cancelación está desactivada. Las citas pendientes permanecen para revisión manual.';

        return successResponse(res, resultado, message);
    } catch (error) {
        return errorResponse(res, 'Error al verificar las citas pendientes.', 500, error.message);
    }
}

/**
 * GET /api/citas/hoy
 * Obtiene las citas del día actual.
 */
export async function getToday(req, res) {
    try {
        const citas = await AppointmentModel.getTodayAppointments();
        return successResponse(res, citas, `${citas.length} cita(s) para hoy.`);
    } catch (error) {
        return errorResponse(res, 'Error al obtener las citas de hoy.', 500, error.message);
    }
}

/**
 * GET /api/citas/disponibilidad?fecha=YYYY-MM-DD&hora=HH:MM
 * Verifica si un horario está disponible.
 */
export async function checkAvailability(req, res) {
    try {
        const { fecha, hora } = req.query;

        if (!fecha || !hora) {
            return errorResponse(res, 'Parámetros requeridos: fecha (YYYY-MM-DD), hora (HH:MM).', 400);
        }

        const disponible = await AppointmentModel.checkAvailability(fecha, hora);
        return successResponse(res, { fecha, hora, disponible },
            disponible ? 'Horario disponible.' : 'Horario no disponible.'
        );
    } catch (error) {
        return errorResponse(res, 'Error al verificar disponibilidad.', 500, error.message);
    }
}

/**
 * GET /api/citas/:id
 * Obtiene una cita por ID.
 */
export async function getById(req, res) {
    try {
        const { id } = req.params;
        const cita = await AppointmentModel.getAppointmentById(Number(id));

        if (!cita) {
            return errorResponse(res, 'Cita no encontrada.', 404);
        }

        return successResponse(res, cita, 'Cita encontrada.');
    } catch (error) {
        return errorResponse(res, 'Error al obtener la cita.', 500, error.message);
    }
}

/**
 * POST /api/citas
 * Crea una nueva cita (acceso público — clientes agendan).
 */
export async function create(req, res) {
    try {
        const nombre_cliente   = sanitizeStr(req.body.nombre_cliente);
        const telefono_cliente = sanitizeStr(req.body.telefono_cliente);
        // Acepta tanto correo_cliente como el alias email por compatibilidad con el frontend
        const correo_cliente   = sanitizeStr(req.body.correo_cliente || req.body.email);
        const fecha_cita       = sanitizeStr(req.body.fecha_cita);
        const hora_cita        = sanitizeStr(req.body.hora_cita);
        const servicio_id      = safeInt(req.body.servicio_id);

        // Validaciones obligatorias
        if (!nombre_cliente || !telefono_cliente || !servicio_id || !fecha_cita || !hora_cita) {
            return errorResponse(res, 'Campos obligatorios: nombre_cliente, telefono_cliente, servicio_id, fecha_cita, hora_cita.', 400);
        }

        // Validar correo si se proporcionó
        if (correo_cliente && !isValidEmail(correo_cliente)) {
            return errorResponse(res, 'El correo electrónico no tiene un formato válido.', 400);
        }

        // Validar que el servicio exista
        const servicio = await ServiceModel.getServiceById(Number(servicio_id));
        if (!servicio) {
            return errorResponse(res, 'El servicio seleccionado no existe.', 404);
        }

        // Validar disponibilidad del horario
        const disponible = await AppointmentModel.checkAvailability(fecha_cita, hora_cita);
        if (!disponible) {
            return errorResponse(res, 'El horario seleccionado ya no está disponible. Por favor elige otro.', 409);
        }

        // Validar que la fecha no sea en el pasado
        const fechaCita = new Date(`${fecha_cita}T${hora_cita}`);
        if (fechaCita < new Date()) {
            return errorResponse(res, 'No puedes agendar una cita en una fecha pasada.', 400);
        }

        // Normalizar método de pago y anticipo:
        // 'sucursal' se normaliza a 'efectivo' para cumplir el CHECK de la tabla citas.
        const folio = sanitizeStr(req.body.folio_transferencia);
        const metodoRaw = sanitizeStr(req.body.metodo_pago);
        const metodoPago = ['efectivo', 'sucursal', 'transferencia', 'pasarela_futura'].includes(metodoRaw)
            ? (metodoRaw === 'sucursal' ? 'efectivo' : metodoRaw)
            : 'efectivo';
        const esPagoEnSucursal = metodoPago === 'efectivo';

        const data = {
            ...req.body,
            nombre_cliente,
            telefono_cliente,
            correo_cliente: correo_cliente || null,
            fecha_cita,
            hora_cita,
            servicio_id,
            metodo_pago: metodoPago,
            folio_transferencia: esPagoEnSucursal ? 'Sin anticipo (Pago en sucursal)' : (folio || null),
            anticipo_requerido: esPagoEnSucursal ? 0 : (req.body.anticipo_requerido != null ? req.body.anticipo_requerido : 50),
            estado_pago: 'pendiente',
            total_estimado: req.body.total_estimado || servicio.precio_base
        };

        // Registro ligero de la clienta (sin contraseña), si dejó correo.
        // acepta_promociones: true para que reciba futuras ofertas del salón.
        if (data.correo_cliente) {
            try {
                const clienta = await ClienteModel.upsertCliente({
                    nombre: data.nombre_cliente,
                    correo: data.correo_cliente,
                    telefono: data.telefono_cliente,
                    acepta_promociones: true
                });
                if (clienta) data.cliente_id = clienta.id;
            } catch (e) {
                console.warn('⚠️  No se pudo registrar a la clienta de la cita:', e.message);
            }
        }

        const nueva = await AppointmentModel.createAppointment(data);

        // Correos automáticos (no bloquean la respuesta si fallan)
        enviarCorreosNuevaCita(nueva, servicio.nombre).catch(() => {});

        return successResponse(res, nueva, '¡Cita agendada exitosamente! Revisa tu correo con el resumen. 💅', 201);
    } catch (error) {
        return errorResponse(res, 'Error al agendar la cita.', 500, error.message);
    }
}

/**
 * PUT /api/citas/:id  (protegido - admin)
 * Actualiza una cita (estado, pago, reprogramar, etc.).
 */
export async function update(req, res) {
    try {
        const { id } = req.params;
        const existing = await AppointmentModel.getAppointmentById(Number(id));

        if (!existing) {
            return errorResponse(res, 'Cita no encontrada.', 404);
        }

        // Si se está cambiando fecha/hora, verificar disponibilidad
        if (req.body.fecha_cita || req.body.hora_cita) {
            const fecha = req.body.fecha_cita || existing.fecha_cita;
            const hora = req.body.hora_cita || existing.hora_cita;
            const disponible = await AppointmentModel.checkAvailability(fecha, hora, Number(id));

            if (!disponible) {
                return errorResponse(res, 'El nuevo horario no está disponible.', 409);
            }
        }

        // Si se registra un folio de anticipo, se marca como respondido por la clienta
        const cambios = { ...req.body };
        if (req.body.folio_transferencia && String(req.body.folio_transferencia).trim()) {
            cambios.estado_confirmacion_cliente = 'respondido';
        }

        const updated = await AppointmentModel.updateAppointment(Number(id), cambios);

        // Correo de cancelación si cambió a 'cancelada'
        if (cambios.estado_cita === 'cancelada' && existing.estado_cita !== 'cancelada') {
            enviarCorreoCancelacion(existing, cambios.notas_diseno).catch(() => {});
        }

        return successResponse(res, updated, 'Cita actualizada correctamente.');
    } catch (error) {
        return errorResponse(res, 'Error al actualizar la cita.', 500, error.message);
    }
}

/**
 * DELETE /api/citas/:id  (protegido - admin)
 * Elimina una cita.
 */
export async function remove(req, res) {
    try {
        const { id } = req.params;
        const deleted = await AppointmentModel.deleteAppointment(Number(id));

        if (!deleted) {
            return errorResponse(res, 'Cita no encontrada.', 404);
        }

        return successResponse(res, null, 'Cita eliminada correctamente.');
    } catch (error) {
        return errorResponse(res, 'Error al eliminar la cita.', 500, error.message);
    }
}

/**
 * Envía los correos de una nueva cita: confirmación a la clienta y aviso al admin.
 */
async function enviarCorreosNuevaCita(cita, servicioNombre) {
    try {
        if (cita.correo_cliente) {
            const { subject, html } = EmailService.buildAppointmentClientEmail(cita, servicioNombre);
            await EmailService.sendEmail({ to: cita.correo_cliente, subject, html });
        }
        const adminTo = EmailService.getAdminEmail();
        if (adminTo) {
            const { subject, html } = EmailService.buildAppointmentAdminEmail(cita, servicioNombre);
            await EmailService.sendEmail({ to: adminTo, subject, html });
        }
    } catch (e) {
        console.warn('⚠️  Error enviando correos de cita:', e.message);
    }
}

/**
 * Envía el correo de cancelación a la clienta.
 */
async function enviarCorreoCancelacion(cita, motivo) {
    try {
        if (!cita.correo_cliente) return;
        const { subject, html } = EmailService.buildAppointmentCancelledEmail(cita, motivo || '');
        await EmailService.sendEmail({ to: cita.correo_cliente, subject, html });
    } catch (e) {
        console.warn('⚠️  Error enviando correo de cancelación:', e.message);
    }
}

export default { getAll, getToday, checkAvailability, getById, create, update, remove, verifyPending };
