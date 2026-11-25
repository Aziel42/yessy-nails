// ================================================================
// YESSY NAILS — Utilidades de Respuesta Estándar
// Formato consistente para todas las respuestas JSON de la API
// ================================================================

/**
 * Respuesta exitosa estándar.
 * @param {object} res - Objeto response de Express
 * @param {*} data - Datos a devolver
 * @param {string} message - Mensaje descriptivo
 * @param {number} statusCode - Código HTTP (default: 200)
 */
export function successResponse(res, data, message = 'Operación exitosa', statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
}

/**
 * Respuesta de error estándar.
 * @param {object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código HTTP (default: 500)
 * @param {*} errors - Detalles adicionales del error (opcional)
 */
export function errorResponse(res, message = 'Error interno del servidor', statusCode = 500, errors = null) {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString()
    };

    // Solo incluir detalles de error en desarrollo
    if (errors && process.env.NODE_ENV !== 'production') {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
}

/**
 * Respuesta paginada.
 * @param {object} res - Objeto response de Express
 * @param {Array} data - Datos paginados
 * @param {number} total - Total de registros
 * @param {number} page - Página actual
 * @param {number} limit - Registros por página
 */
export function paginatedResponse(res, data, total, page, limit) {
    return res.status(200).json({
        success: true,
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
        },
        timestamp: new Date().toISOString()
    });
}
