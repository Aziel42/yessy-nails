// ================================================================
// YESSY NAILS — Utilidad de Folios y Códigos QR
// ================================================================

import QRCode from 'qrcode';

/**
 * Genera un folio único con formato YN-YYYY-XXXX (o prefijo personalizado).
 * @param {string} prefix
 * @returns {string}
 */
export function generateFolio(prefix = 'YN') {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${year}-${code}`;
}

/**
 * Genera una imagen QR en formato Data URL (PNG base64) vinculada al folio.
 * @param {string} folio
 * @returns {Promise<string>}
 */
export async function generateQrDataUrl(folio) {
    const text = String(folio || '').trim();
    if (!text) throw new Error('El folio es requerido para generar el código QR.');

    return QRCode.toDataURL(text, {
        width: 260,
        margin: 2,
        color: {
            dark: '#4A3F3F',
            light: '#FFFFFF'
        }
    });
}

export default { generateFolio, generateQrDataUrl };
