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
const FALLBACK_FAQS = [
    {
        pregunta: '¿Cuál es la política de cancelación?',
        respuesta: 'Las citas pueden cancelarse hasta 24 horas antes sin cargo. Pasado este tiempo, se cobrará el anticipo de $50 MXN.',
        orden: 1
    },
    {
        pregunta: '¿Aceptan tarjetas de crédito?',
        respuesta: 'Sí, aceptamos pagos con tarjeta en modo prueba y Mercado Pago Sandbox. También transferencia SPEI y efectivo en sucursal.',
        orden: 2
    },
    {
        pregunta: '¿Cuánto cuesta el anticipo?',
        respuesta: 'El anticipo es de $50 MXN para apartar tu cita.',
        orden: 3
    }
];

export async function getAll(req, res) {
    try {
        const faqs = await getAllFaqs({ onlyActive: true });

        // Fallback: si no hay FAQs en la tabla, devolver 3 preguntas comunes
        if (!faqs || faqs.length === 0) {
            return successResponse(res, FALLBACK_FAQS, 'Preguntas frecuentes (respaldo).');
        }

        return successResponse(res, faqs, 'Preguntas frecuentes obtenidas.');
    } catch (error) {
        console.warn('⚠️  Usando FAQs de respaldo:', error.message);
        return successResponse(res, FALLBACK_FAQS, 'Preguntas frecuentes (respaldo).');
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