// ================================================================
// YESSY NAILS — Controlador: Portafolio / Galería
// Lógica de negocio para /api/portafolio
// ================================================================

import * as PortfolioModel from '../models/portfolio.model.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * GET /api/portafolio
 * Lista todos los trabajos. Acepta query ?estilo=Minimalista
 */
export async function getAll(req, res) {
    try {
        const { estilo } = req.query;
        const trabajos = await PortfolioModel.getAllPortfolio(estilo || null);

        return successResponse(res, trabajos, `${trabajos.length} trabajo(s) encontrado(s).`);
    } catch (error) {
        return errorResponse(res, 'Error al obtener el portafolio.', 500, error.message);
    }
}

/**
 * GET /api/portafolio/estilos
 * Lista los estilos con conteo.
 */
export async function getStyles(req, res) {
    try {
        const estilos = await PortfolioModel.getStyles();
        return successResponse(res, estilos, 'Estilos obtenidos.');
    } catch (error) {
        return errorResponse(res, 'Error al obtener los estilos.', 500, error.message);
    }
}

/**
 * GET /api/portafolio/:id
 * Obtiene un trabajo por ID.
 */
export async function getById(req, res) {
    try {
        const { id } = req.params;
        const trabajo = await PortfolioModel.getPortfolioById(Number(id));

        if (!trabajo) {
            return errorResponse(res, 'Trabajo no encontrado.', 404);
        }

        return successResponse(res, trabajo, 'Trabajo encontrado.');
    } catch (error) {
        return errorResponse(res, 'Error al obtener el trabajo.', 500, error.message);
    }
}

/**
 * POST /api/portafolio  (protegido - admin)
 * Agrega un nuevo trabajo al portafolio.
 */
export async function create(req, res) {
    try {
        const { titulo, estilo } = req.body;

        if (!titulo || !estilo) {
            return errorResponse(res, 'Campos obligatorios: titulo, estilo.', 400);
        }

        const estilosValidos = ['Minimalista', '3D', 'Francés', 'Temporada'];
        if (!estilosValidos.includes(estilo)) {
            return errorResponse(res, `Estilo inválido. Opciones: ${estilosValidos.join(', ')}`, 400);
        }

        const nuevo = await PortfolioModel.createPortfolio(req.body);
        return successResponse(res, nuevo, 'Trabajo agregado al portafolio.', 201);
    } catch (error) {
        return errorResponse(res, 'Error al crear el trabajo.', 500, error.message);
    }
}

/**
 * PUT /api/portafolio/:id  (protegido - admin)
 * Actualiza un trabajo del portafolio.
 */
export async function update(req, res) {
    try {
        const { id } = req.params;
        const existing = await PortfolioModel.getPortfolioById(Number(id));

        if (!existing) {
            return errorResponse(res, 'Trabajo no encontrado.', 404);
        }

        const updated = await PortfolioModel.updatePortfolio(Number(id), req.body);
        return successResponse(res, updated, 'Trabajo actualizado correctamente.');
    } catch (error) {
        return errorResponse(res, 'Error al actualizar el trabajo.', 500, error.message);
    }
}

/**
 * DELETE /api/portafolio/:id  (protegido - admin)
 * Elimina un trabajo del portafolio.
 */
export async function remove(req, res) {
    try {
        const { id } = req.params;
        const deleted = await PortfolioModel.deletePortfolio(Number(id));

        if (!deleted) {
            return errorResponse(res, 'Trabajo no encontrado.', 404);
        }

        return successResponse(res, null, 'Trabajo eliminado del portafolio.');
    } catch (error) {
        return errorResponse(res, 'Error al eliminar el trabajo.', 500, error.message);
    }
}

export default { getAll, getStyles, getById, create, update, remove };
