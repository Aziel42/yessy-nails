// ================================================================
// YESSY NAILS — Controlador: Admin / Autenticación (Supabase Auth)
// Lógica de negocio para /api/admin
// ================================================================

import { supabase, supabaseAdmin } from '../config/supabase.js';
import * as ClienteModel from '../models/cliente.model.js';
import * as EmailService from '../services/email.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * POST /api/admin/login
 * Autenticación del administrador contra Supabase Auth.
 * Body esperado: { correo, password }  (se acepta también { email } o { usuario })
 */
export async function login(req, res) {
    try {
        const correo = (req.body.correo || req.body.email || req.body.usuario || '').trim();
        const password = (req.body.password || '').trim();

        if (!correo || !password) {
            return errorResponse(res, 'Correo y contraseña son obligatorios.', 400);
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: correo,
            password
        });

        if (error || !data?.session) {
            return errorResponse(res, 'Credenciales inválidas.', 401);
        }

        return successResponse(res, {
            token: data.session.access_token,
            admin: { id: data.user.id, email: data.user.email }
        }, 'Inicio de sesión exitoso. ¡Bienvenida, Yessica! 💅');
    } catch (error) {
        return errorResponse(res, 'Error en el inicio de sesión.', 500, error.message);
    }
}

/**
 * GET /api/admin/perfil  (protegido)
 * Obtiene el perfil del admin autenticado.
 */
export async function getProfile(req, res) {
    try {
        const user = req.adminUser;

        if (!user) {
            return errorResponse(res, 'Administrador no encontrado.', 404);
        }

        return successResponse(res, {
            id: user.id,
            email: user.email,
            last_sign_in_at: user.last_sign_in_at
        }, 'Perfil del administrador.');
    } catch (error) {
        return errorResponse(res, 'Error al obtener el perfil.', 500, error.message);
    }
}

/**
 * PUT /api/admin/cambiar-password  (protegido)
 * Cambia la contraseña del admin en Supabase Auth.
 * Body esperado: { password_actual, password_nueva }
 */
export async function changePassword(req, res) {
    try {
        const { password_actual, password_nueva } = req.body;

        if (!password_actual || !password_nueva) {
            return errorResponse(res, 'Se requiere la contraseña actual y la nueva.', 400);
        }

        if (password_nueva.length < 8) {
            return errorResponse(res, 'La nueva contraseña debe tener al menos 8 caracteres.', 400);
        }

        const email = req.adminUser.email;

        // Verificar la contraseña actual iniciando sesión
        const { error: verifyError } = await supabase.auth.signInWithPassword({
            email,
            password: password_actual
        });

        if (verifyError) {
            return errorResponse(res, 'La contraseña actual es incorrecta.', 401);
        }

        // Actualizar la contraseña con la API de administración
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            req.adminUser.id,
            { password: password_nueva }
        );

        if (updateError) {
            return errorResponse(res, 'No se pudo actualizar la contraseña.', 500, updateError.message);
        }

        return successResponse(res, null, 'Contraseña actualizada correctamente.');
    } catch (error) {
        return errorResponse(res, 'Error al cambiar la contraseña.', 500, error.message);
    }
}

/**
 * POST /api/admin/enviar-oferta  (protegido)
 * Envía una promoción a todas las clientas con acepta_promociones = true.
 * Body: { asunto, mensaje }
 */
export async function sendOffer(req, res) {
    try {
        const { asunto, mensaje } = req.body;

        if (!mensaje || !mensaje.trim()) {
            return errorResponse(res, 'El mensaje de la oferta no puede estar vacío.', 400);
        }

        const clientas = await ClienteModel.getClientesPromociones();

        if (clientas.length === 0) {
            return successResponse(res, { enviados: 0, fallidos: 0 },
                'No hay clientas con acepta_promociones = true registradas.');
        }

        let enviados = 0;
        let fallidos = 0;

        for (const clienta of clientas) {
            if (!clienta.correo) { fallidos++; continue; }
            try {
                const { subject, html } = EmailService.buildOfferEmail(
                    mensaje.trim(),
                    clienta.nombre || ''
                );
                const result = await EmailService.sendEmail({
                    to: clienta.correo,
                    subject: (asunto && asunto.trim()) ? asunto.trim() : subject,
                    html
                });
                if (result.sent) { enviados++; } else { fallidos++; }
            } catch (e) {
                fallidos++;
            }
        }

        return successResponse(res, { enviados, fallidos, total: clientas.length },
            `Oferta enviada: ${enviados} correo(s) enviados, ${fallidos} fallidos.`);
    } catch (error) {
        return errorResponse(res, 'Error al enviar la oferta.', 500, error.message);
    }
}

export default { login, getProfile, changePassword, sendOffer };
