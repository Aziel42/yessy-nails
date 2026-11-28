// ================================================================
// YESSY NAILS — Pruebas Automatizadas de la API
// Ejecutar: npm test
//
// Los modelos que llaman a Supabase se mockean para que las pruebas
// sean deterministas y no dependan de conexión de red.
// ================================================================

import { jest } from '@jest/globals';
import request from 'supertest';

// ── Mocks de los modelos que usan Supabase ───────────────────────
// Deben declararse ANTES de importar app para que Jest los intercepte.

jest.unstable_mockModule('../src/models/config.model.js', () => ({
    getConfig: async () => ({
        id: 1,
        titulo_banner: 'Yessy Nails',
        anos_experiencia: 8,
        whatsapp: '5215587431290'
    }),
    updateConfig: async (data) => ({ id: 1, ...data })
}));

jest.unstable_mockModule('../src/models/service.model.js', () => ({
    getAllServices: async () => [
        { id: 1, nombre: 'Uñas Acrílicas', categoria: 'Acrílico', precio_base: 250 },
        { id: 2, nombre: 'Pedispa Completo', categoria: 'Pedicure/Spa', precio_base: 320 }
    ],
    getServiceById: async (id) => id === 1
        ? { id: 1, nombre: 'Uñas Acrílicas', precio_base: 250 }
        : null,
    getCategories: async () => [{ categoria: 'Acrílico', total: 1 }]
}));

jest.unstable_mockModule('../src/models/portfolio.model.js', () => ({
    getAllPortfolio: async () => [
        { id: 1, titulo: 'Diseño 01', estilo: 'Minimalista', imagen_url: '/img/diseno-01.jpg' }
    ],
    getStyles: async () => [{ estilo: 'Minimalista', total: 1 }],
    getPortfolioById: async (id) => id === 1
        ? { id: 1, titulo: 'Diseño 01', estilo: 'Minimalista' }
        : null
}));

jest.unstable_mockModule('../src/models/appointment.model.js', () => ({
    getAllAppointments: async () => [],
    checkAvailability: async () => true,
    getAppointmentById: async () => null,
    getTodayAppointments: async () => [],
    createAppointment: async (data) => ({ id: 99, ...data }),
    updateAppointment: async (id, data) => ({ id, ...data }),
    deleteAppointment: async () => true,
    countActiveAppointments: async () => 0,
    autoCancelExpired: async () => []   // ahora devuelve array de citas canceladas
}));

jest.unstable_mockModule('../src/models/chat.model.js', () => ({
    getAllRooms: async () => [],
    getMessagesByRoom: async () => [],
    createMessage: async (data) => ({ id: 1, ...data }),
    markAsRead: async () => 0,
    getUnreadCount: async () => 0
}));

jest.unstable_mockModule('../src/models/cliente.model.js', () => ({
    upsertCliente: async (data) => ({ id: 1, ...data }),
    getAllClientes: async () => []
}));

jest.unstable_mockModule('../src/models/pedido.model.js', () => ({
    createPedido: async (data) => ({ id: 1, ...data }),
    getAllPedidos: async () => [],
    updatePedido: async (id, data) => ({ id, ...data }),
    deletePedido: async () => true
}));

jest.unstable_mockModule('../src/models/material.model.js', () => ({
    getAllMaterials: async () => [
        { id: 1, nombre: 'Gelish Rosa Nude #01', categoria: 'Barniz', color_hex: '#E6B8B8', stock_actual: 12, stock_minimo: 3, consumo_por_cita: 1, precio_extra: 0, activo: true },
        { id: 8, nombre: 'Tips Coffin Cristal', categoria: 'Tip', color_hex: '#EAECEF', stock_actual: 0, stock_minimo: 3, consumo_por_cita: 1, precio_extra: 30, activo: true }
    ],
    getMaterialById: async (id) => {
        if (id === 1) return { id: 1, nombre: 'Gelish Rosa Nude #01', categoria: 'Barniz', stock_actual: 12, stock_minimo: 3, consumo_por_cita: 1, precio_extra: 0, activo: true };
        if (id === 8) return { id: 8, nombre: 'Tips Coffin Cristal', categoria: 'Tip', stock_actual: 0, stock_minimo: 3, consumo_por_cita: 1, precio_extra: 30, activo: true };
        return null;
    },
    createMaterial: async (data) => ({ id: 99, ...data }),
    updateMaterial: async (id, data) => ({ id, ...data }),
    deleteMaterial: async () => true,
    adjustMaterialStock: async (id, delta) => ({ id, stock_actual: Math.max(0, 12 + delta), stock_minimo: 3 })
}));

// Mockear Supabase Auth para el middleware de autenticación
jest.unstable_mockModule('../src/config/supabase.js', () => ({
    supabase: {
        auth: {
            signInWithPassword: async () => ({ data: null, error: { message: 'Invalid credentials' } }),
            getUser: async () => ({ data: { user: null }, error: { message: 'Invalid token' } })
        }
    },
    supabaseAdmin: {
        from: () => ({
            select: () => ({ data: [], error: null })
        })
    }
}));

// ── Importar app DESPUÉS de los mocks ────────────────────────────
const { app } = await import('../server.js');

// ── 1. GET /api/health ───────────────────────────────────────────
describe('GET /api/health', () => {
    it('responde 200 con { status: "ok" }', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ status: 'ok' });
    });
});

// ── 2. GET /api/config ───────────────────────────────────────────
describe('GET /api/config', () => {
    it('responde 200 y devuelve los datos del salón', async () => {
        const res = await request(app).get('/api/config');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({ titulo_banner: 'Yessy Nails' });
    });
});

// ── 3. GET /api/servicios ────────────────────────────────────────
describe('GET /api/servicios', () => {
    it('responde 200 con un arreglo de servicios', async () => {
        const res = await request(app).get('/api/servicios');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
    });
});

// ── 4. GET /api/portafolio ───────────────────────────────────────
describe('GET /api/portafolio', () => {
    it('responde 200 con los diseños del portafolio', async () => {
        const res = await request(app).get('/api/portafolio');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});

// ── 5. POST /api/citas sin datos obligatorios → 400 ─────────────
describe('POST /api/citas (sin campos obligatorios)', () => {
    it('responde 400 cuando faltan campos requeridos', async () => {
        const res = await request(app)
            .post('/api/citas')
            .send({})
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

// ── 6. GET /api/citas sin token de admin → 401 ───────────────────
describe('GET /api/citas (sin token de administrador)', () => {
    it('responde 401 cuando no hay token Bearer', async () => {
        const res = await request(app).get('/api/citas');
        expect(res.status).toBe(401);
    });
});

// ── 7. GET /api/materiales ───────────────────────────────────────
describe('GET /api/materiales', () => {
    it('responde 200 con la lista de materiales activos', async () => {
        const res = await request(app).get('/api/materiales');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
    });
});

// ── 8. POST /api/materiales sin token → 401 ──────────────────────
describe('POST /api/materiales (sin token de administrador)', () => {
    it('responde 401 cuando no hay token Bearer', async () => {
        const res = await request(app)
            .post('/api/materiales')
            .send({ nombre: 'Gelish Nuevo' });
        expect(res.status).toBe(401);
    });
});

// ── 9. POST /api/citas con material agotado → 409 ────────────────
describe('POST /api/citas (material agotado)', () => {
    it('responde 409 cuando un material seleccionado tiene stock_actual <= 0', async () => {
        const res = await request(app)
            .post('/api/citas')
            .send({
                nombre_cliente: 'Mariana Gómez',
                telefono_cliente: '5512345678',
                correo_cliente: 'mariana@example.com',
                servicio_id: 1,
                fecha_cita: '2027-05-20',
                hora_cita: '11:30',
                materiales_ids: [8]
            })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });
});
