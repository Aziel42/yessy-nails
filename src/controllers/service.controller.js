// ================================================================
// YESSY NAILS — Controlador: Servicios
// Lógica de negocio para /api/servicios
// ================================================================

import * as ServiceModel from '../models/service.model.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * GET /api/servicios
 * Lista todos los servicios. Acepta query ?categoria=Acrílico
 */
export async function getAll(req, res) {
    try {
        const { categoria } = req.query;
        const servicios = await ServiceModel.getAllServices(categoria || null);

        return successResponse(res, servicios, `${servicios.length} servicio(s) encontrado(s).`);
    } catch (error) {
        return errorResponse(res, 'Error al obtener los servicios.', 500, error.message);
    }
}

/**
 * GET /api/servicios/categorias
 * Lista las categorías con conteo de servicios.
 */
export async function getCategories(req, res) {
    try {
        const categorias = await ServiceModel.getCategories();
        return successResponse(res, categorias, 'Categorías obtenidas.');
    } catch (error) {
        return errorResponse(res, 'Error al obtener las categorías.', 500, error.message);
    }
}

/**
 * GET /api/servicios/:id
 * Obtiene un servicio por ID.
 */
export async function getById(req, res) {
    try {
        const { id } = req.params;
        const servicio = await ServiceModel.getServiceById(Number(id));

        if (!servicio) {
            return errorResponse(res, 'Servicio no encontrado.', 404);
        }

        return successResponse(res, servicio, 'Servicio encontrado.');
    } catch (error) {
        return errorResponse(res, 'Error al obtener el servicio.', 500, error.message);
    }
}

/**
 * POST /api/servicios  (protegido - admin)
 * Crea un nuevo servicio.
 */
export async function create(req, res) {
    try {
        const { nombre, categoria, descripcion, precio_base, duracion_minutos } = req.body;

        // Validaciones básicas
        if (!nombre || !categoria || !precio_base || !duracion_minutos) {
            return errorResponse(res, 'Campos obligatorios: nombre, categoria, precio_base, duracion_minutos.', 400);
        }

        const categoriasValidas = ['Acrílico', 'Gelish', 'Soft Gel', 'Polygel', 'Retiro/Mantenimiento'];
        if (!categoriasValidas.includes(categoria)) {
            return errorResponse(res, `Categoría inválida. Opciones: ${categoriasValidas.join(', ')}`, 400);
        }

        const nuevo = await ServiceModel.createService(req.body);
        return successResponse(res, nuevo, 'Servicio creado exitosamente.', 201);
    } catch (error) {
        return errorResponse(res, 'Error al crear el servicio.', 500, error.message);
    }
}

/**
 * PUT /api/servicios/:id  (protegido - admin)
 * Actualiza un servicio existente.
 */
export async function update(req, res) {
    try {
        const { id } = req.params;
        const existing = await ServiceModel.getServiceById(Number(id));

        if (!existing) {
            return errorResponse(res, 'Servicio no encontrado.', 404);
        }

        const updated = await ServiceModel.updateService(Number(id), req.body);
        return successResponse(res, updated, 'Servicio actualizado correctamente.');
    } catch (error) {
        return errorResponse(res, 'Error al actualizar el servicio.', 500, error.message);
    }
}

/**
 * DELETE /api/servicios/:id  (protegido - admin)
 * Elimina un servicio.
 */
export async function remove(req, res) {
    try {
        const { id } = req.params;
        const deleted = await ServiceModel.deleteService(Number(id));

        if (!deleted) {
            return errorResponse(res, 'Servicio no encontrado.', 404);
        }

        return successResponse(res, null, 'Servicio eliminado correctamente.');
    } catch (error) {
        return errorResponse(res, 'Error al eliminar el servicio.', 500, error.message);
    }
}

export default { getAll, getCategories, getById, create, update, remove };
