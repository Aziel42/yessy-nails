// ================================================================
// YESSY NAILS — Modelo: Configuración del Sitio
// Acceso a la tabla configuracion_sitio en Supabase
// ================================================================

import { supabaseAdmin } from '../config/supabase.js';

const TABLE = 'configuracion_sitio';

// Columnas editables desde el panel administrativo
const ALLOWED_FIELDS = [
    'titulo_banner', 'subtitulo_banner', 'imagen_banner_url',
    'promo_mes_titulo', 'promo_mes_texto',
    'telefono_whatsapp', 'direccion_texto', 'latitud', 'longitud',
    'horario_atencion', 'bio_yessica', 'anos_experiencia',
    'titular_transferencia', 'clabe_transferencia', 'banco_transferencia',
    'auto_cancelar_sin_confirmar', 'horas_limite_confirmacion'
];

function buildPayload(data) {
    const payload = {};
    for (const field of ALLOWED_FIELDS) {
        if (data[field] !== undefined) payload[field] = data[field];
    }
    return payload;
}

/**
 * Obtiene la configuración actual del sitio (siempre es 1 registro, id = 1).
 */
export async function getConfig() {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('*')
        .eq('id', 1)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Actualiza la configuración del sitio.
 * @param {object} data - Campos a actualizar
 */
export async function updateConfig(data) {
    const payload = buildPayload(data);
    if (Object.keys(payload).length === 0) return null;

    const { data: updated, error } = await supabaseAdmin
        .from(TABLE)
        .update(payload)
        .eq('id', 1)
        .select()
        .maybeSingle();

    if (error) throw new Error(error.message);
    return updated;
}

export default { getConfig, updateConfig };
