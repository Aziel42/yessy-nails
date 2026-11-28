// ================================================================
// YESSY NAILS — Controlador: FAQs
// Lógica de negocio para /api/faqs
// ================================================================

import { successResponse, errorResponse } from '../utils/response.js';
import { getAllFaqs, createFaq, deleteFaq } from '../models/faq.model.js';

/**
 * GET /api/faqs
 * Obtiene las preguntas frecuentes (público).
 * Si la tabla aún no tiene datos, devuelve un conjunto de preguntas de respaldo.
 */
export async function getAll(req, res) {
    try {
        const faqs = await getAllFaqs({ onlyActive: true });

        // Fallback: si no hay FAQs en la tabla, devolver 3 preguntas comunes
        if (!faqs || faqs.length === 0) {
            const fallback = [
                {
                    pregunta: '¿Cuál es la política de cancelación?',
                    respuesta: 'Las citas pueden cancelarse hasta 24 horas antes sin cargo. Pasado este tiempo, se cobrará el anticipo de $50 MXN.'
                },
                {
                    pregunta: '¿Aceptan tarjetas de crédito?',
                    respuesta: 'Sí, aceptamos pagos con tarjeta en modo prueba. También transferencia SPEI y efectivo en sucursal.'
                },
                {
                    pregunta: '¿Cuánto cuesta el anticipo?',
                    respuesta: 'El anticipo es de $50 MXN para apartar tu cita.'
                }
            ];
            return successResponse(res, fallback, 'Preguntas frecuentes (respaldo).');
        }

        return successResponse(res, faqs, 'Preguntas frecuentes obtenidas.');
    } catch (error) {
        return errorResponse(res, 'Error al obtener las preguntas frecuentes.', 500, error.message);
    }
}

/**
 * POST /api/faqs
 * Crea una nueva FAQ (protegido - admin).
 */
export async function create(req, res) {
    try {
        const created = await createFaq(req.body);
        return successResponse(res, created, 'FAQ creada correctamente.');
    } catch (error) {
        return errorResponse(res, 'No se pudo crear la FAQ.', 500, error.message);
    }
}

/**
 * DELETE /api/faqs/:id
 * Elimina una FAQ (protegido - admin).
 */
export async function remove(req, res) {
    try {
        const removed = await deleteFaq(req.params.id);
        if (!removed) {
            return errorResponse(res, 'FAQ no encontrada.', 404);
        }
        return successResponse(res, null, 'FAQ eliminada correctamente.');
    } catch (error) {
        return errorResponse(res, 'Error al eliminar la FAQ.', 500, error.message);
    }
}

export default { getAll, create, remove };