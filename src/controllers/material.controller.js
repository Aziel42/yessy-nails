// ================================================================
// YESSY NAILS — Controlador: Materiales / Inventario
// Lógica de negocio para /api/materiales
// ================================================================

import * as MaterialModel from '../models/material.model.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { sanitizeStr } from '../utils/sanitize.js';

/**
 * GET /api/materiales
 * Público: devuelve materiales activos (o todos si ?incluir_inactivos=true).
 */
export async function getAll(req, res) {
    try {
        const onlyActive = req.query.incluir_inactivos !== 'true';
        const materiales = await MaterialModel.getAllMaterials({ onlyActive });
        return successResponse(res, materiales, `${materiales.length} material(es) encontrado(s).`);
    } catch (error) {
        return errorResponse(res, 'Error al obtener los materiales.', 500, error.message);
    }
}

/**
 * POST /api/materiales (protegido - admin)
 * Crea un nuevo material en el inventario.
 */
export async function create(req, res) {
    try {
        const nombre = sanitizeStr(req.body.nombre);
        const categoria = sanitizeStr(req.body.categoria) || 'Barniz';
        const color_hex = sanitizeStr(req.body.color_hex) || '#D4A5A5';

        if (!nombre) {
            return errorResponse(res, 'El nombre del material es obligatorio.', 400);
        }

        const payload = {
            nombre,
            categoria,
            color_hex: /^#[0-9A-Fa-f]{3,8}$/.test(color_hex) ? color_hex : '#D4A5A5',
            stock_actual: Math.max(0, Number(req.body.stock_actual ?? 0)),
            stock_minimo: Math.max(0, Number(req.body.stock_minimo ?? 3)),
            consumo_por_cita: Math.max(1, Number(req.body.consumo_por_cita ?? 1)),
            precio_extra: Math.max(0, Number(req.body.precio_extra ?? 0)),
            activo: req.body.activo !== false
        };

        const creado = await MaterialModel.createMaterial(payload);
        return successResponse(res, creado, 'Material agregado al inventario.', 201);
    } catch (error) {
        return errorResponse(res, 'Error al crear el material.', 500, error.message);
    }
}

/**
 * PUT /api/materiales/:id (protegido - admin)
 * Actualiza un material existente (stock, precio, estado, etc.).
 */
export async function update(req, res) {
    try {
        const { id } = req.params;
        const data = {};

        if (req.body.nombre !== undefined) data.nombre = sanitizeStr(req.body.nombre);
        if (req.body.categoria !== undefined) data.categoria = sanitizeStr(req.body.categoria);
        if (req.body.color_hex !== undefined) {
            const hex = sanitizeStr(req.body.color_hex);
            if (/^#[0-9A-Fa-f]{3,8}$/.test(hex)) data.color_hex = hex;
        }
        if (req.body.stock_actual !== undefined) data.stock_actual = Math.max(0, Number(req.body.stock_actual));
        if (req.body.stock_minimo !== undefined) data.stock_minimo = Math.max(0, Number(req.body.stock_minimo));
        if (req.body.consumo_por_cita !== undefined) data.consumo_por_cita = Math.max(1, Number(req.body.consumo_por_cita));
        if (req.body.precio_extra !== undefined) data.precio_extra = Math.max(0, Number(req.body.precio_extra));
        if (req.body.activo !== undefined) data.activo = Boolean(req.body.activo);

        const actualizado = await MaterialModel.updateMaterial(Number(id), data);
        if (!actualizado) {
            return errorResponse(res, 'Material no encontrado.', 404);
        }

        return successResponse(res, actualizado, 'Material actualizado correctamente.');
    } catch (error) {
        return errorResponse(res, 'Error al actualizar el material.', 500, error.message);
    }
}

/**
 * DELETE /api/materiales/:id (protegido - admin)
 * Elimina un material del inventario.
 */
export async function remove(req, res) {
    try {
        const { id } = req.params;
        const eliminado = await MaterialModel.deleteMaterial(Number(id));
        if (!eliminado) {
            return errorResponse(res, 'Material no encontrado.', 404);
        }
        return successResponse(res, null, 'Material eliminado correctamente.');
    } catch (error) {
        return errorResponse(res, 'Error al eliminar el material.', 500, error.message);
    }
}

export default { getAll, create, update, remove };
