// ================================================================
// YESSY NAILS — Modelo: Materiales / Inventario
// Acceso a la tabla materiales en Supabase (con respaldo en memoria)
// ================================================================

import { supabaseAdmin } from '../config/supabase.js';

const TABLE = 'materiales';

// Respaldo en memoria en caso de que Supabase no tenga la tabla aún o falle la red
let memoryMaterials = [
    { id: 1, nombre: 'Gelish Rosa Nude #01', categoria: 'Barniz', color_hex: '#E6B8B8', stock_actual: 12, stock_minimo: 3, consumo_por_cita: 1, precio_extra: 0, activo: true },
    { id: 2, nombre: 'Gelish Blanco Leche #04', categoria: 'Barniz', color_hex: '#FAF6F0', stock_actual: 10, stock_minimo: 3, consumo_por_cita: 1, precio_extra: 0, activo: true },
    { id: 3, nombre: 'Gelish Rojo Cereza #12', categoria: 'Barniz', color_hex: '#B71C1C', stock_actual: 2, stock_minimo: 3, consumo_por_cita: 1, precio_extra: 15, activo: true },
    { id: 4, nombre: 'Gelish Negro Ónix #20', categoria: 'Barniz', color_hex: '#1F1B1C', stock_actual: 8, stock_minimo: 3, consumo_por_cita: 1, precio_extra: 0, activo: true },
    { id: 5, nombre: 'Acrílico Cristal Transparente', categoria: 'Acrílico', color_hex: '#F2F4F8', stock_actual: 15, stock_minimo: 4, consumo_por_cita: 1, precio_extra: 0, activo: true },
    { id: 6, nombre: 'Acrílico Cover Pink', categoria: 'Acrílico', color_hex: '#F3C6C6', stock_actual: 9, stock_minimo: 3, consumo_por_cita: 1, precio_extra: 25, activo: true },
    { id: 7, nombre: 'Tips Soft Gel Almendra', categoria: 'Tip', color_hex: '#F5E6DA', stock_actual: 14, stock_minimo: 4, consumo_por_cita: 1, precio_extra: 30, activo: true },
    { id: 8, nombre: 'Tips Coffin Cristal', categoria: 'Tip', color_hex: '#EAECEF', stock_actual: 0, stock_minimo: 3, consumo_por_cita: 1, precio_extra: 30, activo: true },
    { id: 9, nombre: 'Cristales Swarovski Mix', categoria: 'Decoración', color_hex: '#D4AF37', stock_actual: 10, stock_minimo: 3, consumo_por_cita: 1, precio_extra: 45, activo: true },
    { id: 10, nombre: 'Hoja de Oro 24k', categoria: 'Decoración', color_hex: '#C9A84C', stock_actual: 3, stock_minimo: 3, consumo_por_cita: 1, precio_extra: 35, activo: true }
];
let nextMemoryId = 11;

function normalizeMaterial(row) {
    if (!row) return row;
    return {
        id: Number(row.id),
        nombre: row.nombre || '',
        categoria: row.categoria || 'General',
        color_hex: row.color_hex || '#D4A5A5',
        stock_actual: Number(row.stock_actual ?? 0),
        stock_minimo: Number(row.stock_minimo ?? 3),
        consumo_por_cita: Math.max(1, Number(row.consumo_por_cita ?? 1)),
        precio_extra: Number(row.precio_extra ?? 0),
        activo: row.activo !== false
    };
}

/**
 * Obtiene todos los materiales.
 * @param {object} opts
 * @param {boolean} opts.onlyActive
 */
export async function getAllMaterials({ onlyActive = true } = {}) {
    try {
        let query = supabaseAdmin
            .from(TABLE)
            .select('*')
            .order('categoria', { ascending: true })
            .order('nombre', { ascending: true });

        if (onlyActive) {
            query = query.eq('activo', true);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return (data || []).map(normalizeMaterial);
    } catch (err) {
        console.warn('⚠️  Usando inventario en memoria (materiales):', err.message);
        const list = onlyActive ? memoryMaterials.filter(m => m.activo !== false) : memoryMaterials;
        return list.map(normalizeMaterial);
    }
}

/**
 * Obtiene un material por ID.
 * @param {number} id
 */
export async function getMaterialById(id) {
    const numId = Number(id);
    if (!Number.isFinite(numId)) return null;

    try {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .select('*')
            .eq('id', numId)
            .maybeSingle();

        if (error) throw new Error(error.message);
        return data ? normalizeMaterial(data) : null;
    } catch (err) {
        const found = memoryMaterials.find(m => m.id === numId);
        return found ? normalizeMaterial(found) : null;
    }
}

/**
 * Crea un nuevo material.
 * @param {object} data
 */
export async function createMaterial(data) {
    const payload = {
        nombre: String(data.nombre || '').trim(),
        categoria: String(data.categoria || 'General').trim(),
        color_hex: String(data.color_hex || '#D4A5A5').trim(),
        stock_actual: Math.max(0, Number(data.stock_actual ?? 0)),
        stock_minimo: Math.max(0, Number(data.stock_minimo ?? 3)),
        consumo_por_cita: Math.max(1, Number(data.consumo_por_cita ?? 1)),
        precio_extra: Math.max(0, Number(data.precio_extra ?? 0)),
        activo: data.activo !== false
    };

    try {
        const { data: created, error } = await supabaseAdmin
            .from(TABLE)
            .insert(payload)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return normalizeMaterial(created);
    } catch (err) {
        console.warn('⚠️  Creando material en memoria:', err.message);
        const created = { id: nextMemoryId++, ...payload };
        memoryMaterials.push(created);
        return normalizeMaterial(created);
    }
}

/**
 * Actualiza un material existente por ID.
 * @param {number} id
 * @param {object} data
 */
export async function updateMaterial(id, data) {
    const numId = Number(id);
    const payload = {};
    if (data.nombre !== undefined) payload.nombre = String(data.nombre).trim();
    if (data.categoria !== undefined) payload.categoria = String(data.categoria).trim();
    if (data.color_hex !== undefined) payload.color_hex = String(data.color_hex).trim();
    if (data.stock_actual !== undefined) payload.stock_actual = Math.max(0, Number(data.stock_actual));
    if (data.stock_minimo !== undefined) payload.stock_minimo = Math.max(0, Number(data.stock_minimo));
    if (data.consumo_por_cita !== undefined) payload.consumo_por_cita = Math.max(1, Number(data.consumo_por_cita));
    if (data.precio_extra !== undefined) payload.precio_extra = Math.max(0, Number(data.precio_extra));
    if (data.activo !== undefined) payload.activo = Boolean(data.activo);

    if (Object.keys(payload).length === 0) return null;

    try {
        const { data: updated, error } = await supabaseAdmin
            .from(TABLE)
            .update(payload)
            .eq('id', numId)
            .select()
            .maybeSingle();

        if (error) throw new Error(error.message);
        return updated ? normalizeMaterial(updated) : null;
    } catch (err) {
        const idx = memoryMaterials.findIndex(m => m.id === numId);
        if (idx === -1) return null;
        memoryMaterials[idx] = { ...memoryMaterials[idx], ...payload };
        return normalizeMaterial(memoryMaterials[idx]);
    }
}

/**
 * Elimina un material por ID.
 * @param {number} id
 */
export async function deleteMaterial(id) {
    const numId = Number(id);
    try {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .delete()
            .eq('id', numId)
            .select('id');

        if (error) throw new Error(error.message);
        return (data || []).length > 0;
    } catch (err) {
        const before = memoryMaterials.length;
        memoryMaterials = memoryMaterials.filter(m => m.id !== numId);
        return memoryMaterials.length < before;
    }
}

/**
 * Ajusta el stock actual de un material (delta positivo o negativo).
 * @param {number} id
 * @param {number} delta
 */
export async function adjustMaterialStock(id, delta) {
    const mat = await getMaterialById(id);
    if (!mat) return null;
    const nextStock = Math.max(0, Number(mat.stock_actual) + Number(delta));
    return updateMaterial(mat.id, { stock_actual: nextStock });
}

export default {
    getAllMaterials,
    getMaterialById,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    adjustMaterialStock
};
