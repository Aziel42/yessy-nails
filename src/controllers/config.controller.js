// ================================================================
// YESSY NAILS — Controlador: Configuración del Sitio
// Lógica de negocio para /api/config
// ================================================================

import * as ConfigModel from '../models/config.model.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * GET /api/config
 * Obtiene la configuración pública del sitio.
 */
export async function getConfig(req, res) {
    try {
        const config = await ConfigModel.getConfig();

        if (!config) {
            return errorResponse(res, 'Configuración no encontrada.', 404);
        }

        return successResponse(res, config, 'Configuración del sitio obtenida.');
    } catch (error) {
        return errorResponse(res, 'Error al obtener la configuración.', 500, error.message);
    }
}

/**
 * PUT /api/config  (protegido - admin)
 * Actualiza la configuración del sitio.
 */
export async function updateConfig(req, res) {
    try {
        const updated = await ConfigModel.updateConfig(req.body);

        if (!updated) {
            return errorResponse(res, 'No se proporcionaron campos válidos para actualizar.', 400);
        }

        return successResponse(res, updated, 'Configuración actualizada correctamente.');
    } catch (error) {
        return errorResponse(res, 'Error al actualizar la configuración.', 500, error.message);
    }
}

export default { getConfig, updateConfig };
