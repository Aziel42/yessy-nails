// ================================================================
// YESSY NAILS — Servicio: Ciclo de Vida Automático de Citas
// - Archiva citas cuya fecha pasó hace 7 días o más ('archivada')
// - Elimina definitivamente citas con 30 días o más de antigüedad
// ================================================================

import * as AppointmentModel from '../models/appointment.model.js';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * Devuelve la fecha YYYY-MM-DD correspondiente a `daysAgo` días atrás.
 * @param {number} daysAgo
 * @returns {string}
 */
function getDateDaysAgo(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
}

/**
 * Ejecuta el mantenimiento del ciclo de vida de citas en Supabase:
 * 1) Archiva citas con fecha <= hace 7 días que no estén archivadas.
 * 2) Elimina citas con fecha <= hace 30 días.
 * @returns {Promise<{archivadas: number, eliminadas: number}>}
 */
export async function runAppointmentLifecycleMaintenance() {
    try {
        const archiveCutoff = getDateDaysAgo(7);
        const deleteCutoff = getDateDaysAgo(30);

        const eliminadas = await AppointmentModel.deleteExpiredAppointments(deleteCutoff);
        const archivadas = await AppointmentModel.archiveOldAppointments(archiveCutoff);

        if (archivadas > 0 || eliminadas > 0) {
            console.log(
                `🗄️  Mantenimiento de citas: ${archivadas} archivada(s) (>=7 días), ${eliminadas} eliminada(s) (>=30 días).`
            );
        }

        return { archivadas, eliminadas };
    } catch (error) {
        console.warn('⚠️  Error en mantenimiento automático de citas:', error.message);
        return { archivadas: 0, eliminadas: 0 };
    }
}

/**
 * Inicia el mantenimiento al arrancar el servidor y lo programa cada 12 horas.
 * @returns {NodeJS.Timeout}
 */
export function startAppointmentLifecycleScheduler() {
    runAppointmentLifecycleMaintenance();
    const timer = setInterval(runAppointmentLifecycleMaintenance, TWELVE_HOURS_MS);
    if (typeof timer.unref === 'function') {
        timer.unref();
    }
    return timer;
}

export default {
    runAppointmentLifecycleMaintenance,
    startAppointmentLifecycleScheduler
};
