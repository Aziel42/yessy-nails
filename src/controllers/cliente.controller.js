// ================================================================
// YESSY NAILS — Controlador: Clientes
// Lógica de negocio para /api/clientes
// ================================================================

import * as ClienteModel from '../models/cliente.model.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { sanitizeStr, isValidEmail } from '../utils/sanitize.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/clientes  (público)
 * Registro ligero de una clienta (nombre + correo, sin contraseña).
 */
export async function create(req, res) {
    try {
        const nombre   = sanitizeStr(req.body.nombre);
        const correo   = sanitizeStr(req.body.correo);
        const telefono = sanitizeStr(req.body.telefono);
        const acepta   = req.body.acepta_promociones;

        if (!nombre || !correo) {
            return errorResponse(res, 'Nombre y correo son obligatorios.', 400);
        }
        if (!isValidEmail(correo)) {
            return errorResponse(res, 'El correo electrónico no es válido.', 400);
        }

        const clienta = await ClienteModel.upsertCliente({
            nombre,
            correo,
            telefono,
            acepta_promociones: acepta !== undefined ? acepta : true
        });

        return successResponse(res, clienta, '¡Listo! Te registramos para recibir nuestras promociones. 💕', 201);
    } catch (error) {
        return errorResponse(res, 'Error al registrar a la clienta.', 500, error.message);
    }
}

/**
 * GET /api/clientes  (protegido - admin)
 * Lista las clientas registradas.
 */
export async function getAll(req, res) {
    try {
        const clientas = await ClienteModel.getAllClientes();
        return successResponse(res, clientas, `${clientas.length} clienta(s) registrada(s).`);
    } catch (error) {
        return errorResponse(res, 'Error al obtener las clientas.', 500, error.message);
    }
}

export default { create, getAll };
