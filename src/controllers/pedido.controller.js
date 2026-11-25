// ================================================================
// YESSY NAILS — Controlador: Pedidos
// Lógica de negocio para /api/pedidos
// ================================================================

import * as PedidoModel from '../models/pedido.model.js';
import * as ClienteModel from '../models/cliente.model.js';
import * as EmailService from '../services/email.service.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { sanitizeStr, isValidEmail, safeFloat } from '../utils/sanitize.js';

const TIPOS_ENTREGA = ['estudio', 'punto_medio_domicilio'];

/**
 * POST /api/pedidos  (público)
 * Registra un pedido de productos (tienda pedidos.html).
 */
export async function create(req, res) {
    try {
        const nombre_cliente   = sanitizeStr(req.body.nombre_cliente);
        const correo_cliente   = sanitizeStr(req.body.correo_cliente);
        const telefono_cliente = sanitizeStr(req.body.telefono_cliente);
        const {
            items_json, tipo_entrega, direccion_entrega,
            lat_entrega, lng_entrega
        } = req.body;

        if (!nombre_cliente || !telefono_cliente) {
            return errorResponse(res, 'Nombre y teléfono son obligatorios.', 400);
        }

        if (correo_cliente && !isValidEmail(correo_cliente)) {
            return errorResponse(res, 'El correo electrónico no tiene un formato válido.', 400);
        }

        const items = Array.isArray(items_json) ? items_json : [];
        if (items.length === 0) {
            return errorResponse(res, 'El carrito está vacío.', 400);
        }

        const tipoEntrega = TIPOS_ENTREGA.includes(tipo_entrega) ? tipo_entrega : 'estudio';

        // Recalcular el total en el servidor (no confiar en el cliente)
        const total = items.reduce((sum, it) => {
            const precio = parseFloat(it.precio) || 0;
            const cantidad = parseInt(it.cantidad) || 0;
            return sum + precio * cantidad;
        }, 0);

        const data = {
            nombre_cliente,
            correo_cliente: correo_cliente || null,
            telefono_cliente,
            items_json: items,
            total,
            tipo_entrega: tipoEntrega,
            direccion_entrega: sanitizeStr(direccion_entrega) || null,
            lat_entrega: safeFloat(lat_entrega),
            lng_entrega: safeFloat(lng_entrega),
            estado_pedido: 'pendiente'
        };

        // Registro ligero de la clienta (sin contraseña), si dejó correo
        if (data.correo_cliente) {
            try {
                const clienta = await ClienteModel.upsertCliente({
                    nombre: data.nombre_cliente,
                    correo: data.correo_cliente,
                    telefono: data.telefono_cliente
                });
                if (clienta) data.cliente_id = clienta.id;
            } catch (e) {
                console.warn('⚠️  No se pudo registrar a la clienta del pedido:', e.message);
            }
        }

        const pedido = await PedidoModel.createPedido(data);

        // Correos (no bloquean la respuesta si fallan)
        enviarCorreosPedido(pedido).catch(() => {});

        return successResponse(res, pedido, '¡Pedido recibido! Te contactaremos para coordinar la entrega. 🛍️', 201);
    } catch (error) {
        return errorResponse(res, 'Error al registrar el pedido.', 500, error.message);
    }
}

async function enviarCorreosPedido(pedido) {
    try {
        if (pedido.correo_cliente) {
            const { subject, html } = EmailService.buildOrderClientEmail(pedido);
            await EmailService.sendEmail({ to: pedido.correo_cliente, subject, html });
        }
        const adminTo = EmailService.getAdminEmail();
        if (adminTo) {
            const { subject, html } = EmailService.buildOrderAdminEmail(pedido);
            await EmailService.sendEmail({ to: adminTo, subject, html });
        }
    } catch (e) {
        console.warn('⚠️  Error enviando correos del pedido:', e.message);
    }
}

/**
 * GET /api/pedidos  (protegido - admin)
 */
export async function getAll(req, res) {
    try {
        const pedidos = await PedidoModel.getAllPedidos();
        return successResponse(res, pedidos, `${pedidos.length} pedido(s).`);
    } catch (error) {
        return errorResponse(res, 'Error al obtener los pedidos.', 500, error.message);
    }
}

/**
 * PUT /api/pedidos/:id  (protegido - admin)
 */
export async function update(req, res) {
    try {
        const { id } = req.params;
        const updated = await PedidoModel.updatePedido(Number(id), req.body);
        if (!updated) {
            return errorResponse(res, 'Pedido no encontrado o sin cambios.', 404);
        }
        return successResponse(res, updated, 'Pedido actualizado correctamente.');
    } catch (error) {
        return errorResponse(res, 'Error al actualizar el pedido.', 500, error.message);
    }
}

/**
 * DELETE /api/pedidos/:id  (protegido - admin)
 */
export async function remove(req, res) {
    try {
        const { id } = req.params;
        const deleted = await PedidoModel.deletePedido(Number(id));
        if (!deleted) {
            return errorResponse(res, 'Pedido no encontrado.', 404);
        }
        return successResponse(res, null, 'Pedido eliminado correctamente.');
    } catch (error) {
        return errorResponse(res, 'Error al eliminar el pedido.', 500, error.message);
    }
}

export default { create, getAll, update, remove };
