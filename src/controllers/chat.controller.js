// ================================================================
// YESSY NAILS — Controlador: Chat / Mensajes
// Lógica de negocio para /api/chat
// ================================================================

import * as ChatModel from '../models/chat.model.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { sanitizeStr } from '../utils/sanitize.js';

/**
 * GET /api/chat/salas  (protegido - admin)
 * Lista todas las salas de chat con resumen.
 */
export async function getRooms(req, res) {
    try {
        const salas = await ChatModel.getAllRooms();
        return successResponse(res, salas, `${salas.length} sala(s) de chat.`);
    } catch (error) {
        return errorResponse(res, 'Error al obtener las salas.', 500, error.message);
    }
}

/**
 * GET /api/chat/salas/:salaId
 * Obtiene todos los mensajes de una sala.
 */
export async function getMessages(req, res) {
    try {
        const { salaId } = req.params;
        const mensajes = await ChatModel.getMessagesByRoom(salaId);

        return successResponse(res, mensajes, `${mensajes.length} mensaje(s) en la sala.`);
    } catch (error) {
        return errorResponse(res, 'Error al obtener los mensajes.', 500, error.message);
    }
}

/**
 * POST /api/chat/mensajes
 * Envía un mensaje (acceso público — clientes y admin).
 */
export async function sendMessage(req, res) {
    try {
        const sala_cliente_id  = sanitizeStr(req.body.sala_cliente_id);
        const nombre_remitente = sanitizeStr(req.body.nombre_remitente);
        const rol              = sanitizeStr(req.body.rol);
        const mensaje          = sanitizeStr(req.body.mensaje);

        if (!sala_cliente_id || !nombre_remitente || !rol || !mensaje) {
            return errorResponse(res, 'Campos obligatorios: sala_cliente_id, nombre_remitente, rol, mensaje.', 400);
        }

        const rolesValidos = ['cliente', 'yessica'];
        if (!rolesValidos.includes(rol)) {
            return errorResponse(res, 'Rol inválido. Opciones: cliente, yessica.', 400);
        }

        const nuevo = await ChatModel.createMessage({ sala_cliente_id, nombre_remitente, rol, mensaje });
        return successResponse(res, nuevo, 'Mensaje enviado.', 201);
    } catch (error) {
        return errorResponse(res, 'Error al enviar el mensaje.', 500, error.message);
    }
}

/**
 * PUT /api/chat/salas/:salaId/leer
 * Marca mensajes de una sala como leídos.
 */
export async function markRead(req, res) {
    try {
        const { salaId } = req.params;
        const { rol } = req.body; // Rol cuyos mensajes se marcan como leídos

        const count = await ChatModel.markAsRead(salaId, rol || 'cliente');
        return successResponse(res, { marcados: count }, `${count} mensaje(s) marcado(s) como leído(s).`);
    } catch (error) {
        return errorResponse(res, 'Error al marcar mensajes como leídos.', 500, error.message);
    }
}

/**
 * GET /api/chat/no-leidos  (protegido - admin)
 * Cuenta total de mensajes sin leer de clientes.
 */
export async function getUnread(req, res) {
    try {
        const count = await ChatModel.getUnreadCount();
        return successResponse(res, { sin_leer: count }, `${count} mensaje(s) sin leer.`);
    } catch (error) {
        return errorResponse(res, 'Error al contar mensajes sin leer.', 500, error.message);
    }
}

export default { getRooms, getMessages, sendMessage, markRead, getUnread };
