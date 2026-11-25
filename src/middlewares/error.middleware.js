// ================================================================
// YESSY NAILS — Middleware Global de Errores
// Captura errores no manejados y devuelve respuesta estándar
// ================================================================

/**
 * Middleware de manejo centralizado de errores.
 * Debe registrarse como el último middleware en Express.
 */
export function errorMiddleware(err, req, res, _next) {
    // Log del error en consola (solo en desarrollo)
    console.error(`❌ [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.error(err.stack || err.message);

    // Determinar código de estado
    const statusCode = err.statusCode || err.status || 500;

    // Construir respuesta de error
    const response = {
        success: false,
        message: err.message || 'Error interno del servidor',
        timestamp: new Date().toISOString()
    };

    // Detalles extra solo en desarrollo
    if (process.env.NODE_ENV !== 'production') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

/**
 * Middleware para rutas no encontradas (404).
 */
export function notFoundMiddleware(req, res) {
    res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
    });
}

export default { errorMiddleware, notFoundMiddleware };
