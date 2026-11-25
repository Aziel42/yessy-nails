// ================================================================
// YESSY NAILS — Utilidades de Saneamiento y Validación
// Limpia entradas de usuario antes de pasarlas a los modelos.
// ================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Elimina etiquetas HTML y recorta espacios de un string.
 * @param {*} value
 * @returns {string}
 */
export function sanitizeStr(value) {
    if (value == null) return '';
    return String(value)
        .replace(/<[^>]*>/g, '')   // quita etiquetas HTML
        .replace(/[<>]/g, '')       // elimina < y > residuales
        .trim();
}

/**
 * Verifica que un correo tenga formato válido.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
    return EMAIL_REGEX.test(String(email || '').trim());
}

/**
 * Convierte un valor a número entero seguro; devuelve null si es inválido.
 * @param {*} value
 * @returns {number|null}
 */
export function safeInt(value) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
}

/**
 * Convierte un valor a número flotante seguro; devuelve null si es inválido.
 * @param {*} value
 * @returns {number|null}
 */
export function safeFloat(value) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
}
