// ================================================================
// YESSY NAILS — Middleware de Autenticación (Supabase Auth)
// Protege rutas del panel administrativo verificando el JWT de Supabase
// ================================================================

import { supabase } from '../config/supabase.js';
import { errorResponse } from '../utils/response.js';

/**
 * Middleware que verifica el token JWT de Supabase en el header Authorization.
 * Formato esperado: "Bearer <token>"
 * Si el token es válido, adjunta el usuario autenticado en req.adminUser.
 */
export async function authMiddleware(req, res, next) {
    try {
        // Obtener el header de autorización
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponse(res, 'Acceso denegado. Token no proporcionado.', 401);
        }

        // Extraer el token (quitar "Bearer ")
        const token = authHeader.split(' ')[1];

        if (!token) {
            return errorResponse(res, 'Acceso denegado. Token no proporcionado.', 401);
        }

        // Validar el token contra Supabase Auth
        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data?.user) {
            return errorResponse(res, 'Token inválido o expirado. Inicia sesión nuevamente.', 401);
        }

        // Adjuntar el usuario autenticado al request
        req.adminUser = data.user;

        next();
    } catch (error) {
        return errorResponse(res, 'Error de autenticación.', 500, error.message);
    }
}

export default authMiddleware;
