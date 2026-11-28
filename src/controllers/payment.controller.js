// ================================================================
// YESSY NAILS — Controlador: Pagos (Mercado Pago Sandbox)
// Endpoints para /api/pagos
// ================================================================

import * as AppointmentModel from '../models/appointment.model.js';
import * as PedidoModel from '../models/pedido.model.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { sanitizeStr } from '../utils/sanitize.js';

/**
 * POST /api/pagos/crear-preferencia
 * Crea una preferencia de pago en Mercado Pago (Sandbox) si MP_ACCESS_TOKEN
 * está configurado, o devuelve modo sandbox_simulado: true para desarrollo/demo.
 */
export async function createPreference(req, res) {
    try {
        const tipo = sanitizeStr(req.body.tipo) || 'cita';
        const referenciaId = req.body.referencia_id || req.body.id || null;
        const folio = sanitizeStr(req.body.folio) || '';
        const titulo = sanitizeStr(req.body.titulo) || (tipo === 'pedido' ? 'Pedido Yessy Nails' : 'Anticipo Cita Yessy Nails');
        const monto = Number(req.body.monto);
        const correoCliente = sanitizeStr(req.body.correo_cliente);
        const nombreCliente = sanitizeStr(req.body.nombre_cliente);

        if (!Number.isFinite(monto) || monto <= 0) {
            return errorResponse(res, 'El monto del pago debe ser mayor a 0.', 400);
        }

        const mpToken = process.env.MP_ACCESS_TOKEN;
        if (mpToken && mpToken.trim()) {
            const siteUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
            const returnPage = tipo === 'pedido' ? 'pedidos.html' : 'agendar.html';

            const mpBody = {
                items: [
                    {
                        title: titulo,
                        quantity: 1,
                        currency_id: 'MXN',
                        unit_price: Number(monto.toFixed(2))
                    }
                ],
                external_reference: folio || String(referenciaId || ''),
                back_urls: {
                    success: `${siteUrl}/${returnPage}?pago=aprobado&folio=${encodeURIComponent(folio)}`,
                    failure: `${siteUrl}/${returnPage}?pago=fallido&folio=${encodeURIComponent(folio)}`,
                    pending: `${siteUrl}/${returnPage}?pago=pendiente&folio=${encodeURIComponent(folio)}`
                },
                auto_return: 'approved'
            };

            if (correoCliente) {
                mpBody.payer = {
                    email: correoCliente,
                    name: nombreCliente || 'Clienta Yessy Nails'
                };
            }

            const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mpToken.trim()}`
                },
                body: JSON.stringify(mpBody)
            });

            const mpData = await mpRes.json();
            if (!mpRes.ok) {
                return errorResponse(res, mpData.message || 'Error al crear preferencia en Mercado Pago.', 502, mpData);
            }

            return successResponse(res, {
                sandbox_simulado: false,
                preference_id: mpData.id,
                init_point: mpData.sandbox_init_point || mpData.init_point,
                sandbox_init_point: mpData.sandbox_init_point,
                folio,
                monto: Number(monto.toFixed(2)),
                titulo
            }, 'Preferencia de Mercado Pago Sandbox creada.');
        }

        // Modo sandbox simulado cuando MP_ACCESS_TOKEN no está configurado
        return successResponse(res, {
            sandbox_simulado: true,
            preference_id: `SIM-MP-${Date.now()}`,
            init_point: null,
            sandbox_init_point: null,
            checkout_url: '#sandbox-checkout',
            folio,
            monto: Number(monto.toFixed(2)),
            titulo
        }, 'Preferencia de pago en modo Sandbox simulado.');
    } catch (error) {
        return errorResponse(res, 'Error al crear la preferencia de pago.', 500, error.message);
    }
}

/**
 * POST /api/pagos/confirmar
 * Marca una cita o pedido como pagado tras completar el checkout.
 */
export async function confirmPayment(req, res) {
    try {
        const tipo = sanitizeStr(req.body.tipo) || 'cita';
        const id = req.body.id ? Number(req.body.id) : null;
        const folio = sanitizeStr(req.body.folio);
        const paymentId = sanitizeStr(req.body.payment_id) || `MP-SANDBOX-${Date.now()}`;

        if (!id && !folio) {
            return errorResponse(res, 'Se requiere id o folio para confirmar el pago.', 400);
        }

        if (tipo === 'pedido') {
            let pedido = id ? await PedidoModel.getPedidoById(id) : null;
            if (!pedido && folio && typeof PedidoModel.getPedidoByFolio === 'function') {
                pedido = await PedidoModel.getPedidoByFolio(folio);
            }
            if (!pedido) {
                return errorResponse(res, 'Pedido no encontrado.', 404);
            }

            const updated = await PedidoModel.updatePedido(pedido.id, {
                pago_estado: 'pagado',
                estado_pedido: pedido.estado_pedido === 'pendiente' ? 'confirmado' : pedido.estado_pedido
            });

            return successResponse(res, {
                ...pedido,
                ...(updated || {}),
                pago_estado: 'pagado',
                payment_id: paymentId
            }, 'Pago de pedido confirmado correctamente.');
        }

        // Por defecto: cita
        let cita = id ? await AppointmentModel.getAppointmentById(id) : null;
        if (!cita && folio && typeof AppointmentModel.getAppointmentByFolio === 'function') {
            cita = await AppointmentModel.getAppointmentByFolio(folio);
        }
        if (!cita) {
            return errorResponse(res, 'Cita no encontrada.', 404);
        }

        const updated = await AppointmentModel.updateAppointment(cita.id, {
            pago_estado: 'pagado',
            estado_pago: 'pagado',
            estado_cita: cita.estado_cita === 'pendiente' ? 'confirmada' : cita.estado_cita,
            estado_confirmacion_cliente: 'respondido',
            folio_transferencia: paymentId
        });

        return successResponse(res, {
            ...cita,
            ...(updated || {}),
            pago_estado: 'pagado',
            estado_pago: 'pagado',
            payment_id: paymentId
        }, 'Pago de cita confirmado correctamente.');
    } catch (error) {
        return errorResponse(res, 'Error al confirmar el pago.', 500, error.message);
    }
}

export default { createPreference, confirmPayment };
