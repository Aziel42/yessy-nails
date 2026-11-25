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
    autoCancelExpired: async () => 0
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
