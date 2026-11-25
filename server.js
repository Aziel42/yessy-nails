// ================================================================
// YESSY NAILS — Servidor Principal (Entry Point)
// Salón de uñas de Yessica Marlen Calderón Luna
//
// Stack: Node.js + Express + Supabase (PostgreSQL + Auth, ES Modules)
// Ejecutar: npm run dev (desarrollo) | npm start (producción)
// ================================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Rutas de la API
import configRoutes      from './src/routes/config.routes.js';
import serviceRoutes     from './src/routes/service.routes.js';
import portfolioRoutes   from './src/routes/portfolio.routes.js';
import appointmentRoutes from './src/routes/appointment.routes.js';
import chatRoutes        from './src/routes/chat.routes.js';
import adminRoutes       from './src/routes/admin.routes.js';
import uploadRoutes      from './src/routes/upload.routes.js';
import pedidoRoutes      from './src/routes/pedido.routes.js';
import clienteRoutes    from './src/routes/cliente.routes.js';

// Middlewares de error
import { errorMiddleware, notFoundMiddleware } from './src/middlewares/error.middleware.js';
import { startAppointmentLifecycleScheduler } from './src/services/appointmentLifecycle.service.js';

// ── Configuración de rutas de archivos (ES Modules) ─────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Inicializar Express ─────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ────────────────────────────────────────
app.use(cors({
    origin: '*', // En producción: restringir al dominio real
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Cabeceras de seguridad HTTP ─────────────────────────────────
// Permite CDN de Leaflet (unpkg.com), Google Fonts y los propios scripts/estilos.
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader(
        'Content-Security-Policy',
        [
            "default-src 'self'",
            // Scripts: propios + Leaflet CDN
            "script-src 'self' 'unsafe-inline' https://unpkg.com",
            // Estilos: propios + Leaflet CDN + Google Fonts
            "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
            // Fuentes: Google Fonts
            "font-src 'self' https://fonts.gstatic.com",
            // Imágenes: todo (Unsplash, Supabase Storage, tiles OSM, datos inline)
            "img-src 'self' data: https: blob:",
            // Mapa de tiles OpenStreetMap
            "connect-src 'self' https://*.supabase.co https://nominatim.openstreetmap.org https://api.brevo.com https://tile.openstreetmap.org",
            // Workers de Leaflet
            "worker-src blob:",
            "frame-ancestors 'self'"
        ].join('; ')
    );
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Servir archivos estáticos del frontend ──────────────────────
app.use(express.static(resolve(__dirname, 'public')));

// ── Log de peticiones (desarrollo) ──────────────────────────────
app.use((req, _res, next) => {
    const timestamp = new Date().toLocaleTimeString('es-MX');
    console.log(`📋 [${timestamp}] ${req.method} ${req.originalUrl}`);
    next();
});

// ── Montar rutas de la API ──────────────────────────────────────
app.use('/api/config',        configRoutes);
app.use('/api/configuracion', configRoutes);
app.use('/api/servicios',   serviceRoutes);
app.use('/api/portafolio',  portfolioRoutes);
app.use('/api/citas',       appointmentRoutes);
app.use('/api/chat',        chatRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/upload',      uploadRoutes);
app.use('/api/pedidos',     pedidoRoutes);
app.use('/api/clientes',   clienteRoutes);

// ── Ruta raíz de la API (info) ───────────────────────────────────
app.get('/api', (_req, res) => {
    res.json({
        success: true,
        message: '💅 Yessy Nails API v1.0 — ¡Funcionando correctamente!',
        endpoints: {
            config:     'GET    /api/config',
            servicios:  'GET    /api/servicios',
            portafolio: 'GET    /api/portafolio',
            citas:      'POST   /api/citas',
            chat:       'POST   /api/chat/mensajes',
            admin:      'POST   /api/admin/login',
            pedidos:    'POST   /api/pedidos'
        },
        timestamp: new Date().toISOString()
    });
});

// ── Health check para Render ─────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── SPA Fallback: servir index.html para rutas no-API ───────────
app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(resolve(__dirname, 'public', 'index.html'));
});

// ── Middlewares de error (siempre al final) ─────────────────────
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ── Iniciar servidor (solo cuando no estamos en modo test) ───────
function startServer() {
    app.listen(PORT, () => {
        console.log('\n✨ ═══════════════════════════════════════════');
        console.log('   💅 YESSY NAILS — Servidor Iniciado');
        console.log('   ─────────────────────────────────────────');
        console.log(`   🌐 http://localhost:${PORT}`);
        console.log(`   📡 API: http://localhost:${PORT}/api`);
        console.log('   🗄️  Base de datos: Supabase (PostgreSQL)');
        console.log(`   🕐 ${new Date().toLocaleString('es-MX')}`);
        console.log('✨ ═══════════════════════════════════════════\n');
        startAppointmentLifecycleScheduler();
    });
}

// ── Manejo de cierre graceful ───────────────────────────────────
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    process.exit(0);
});

// ── Exportar app para los tests de Jest ─────────────────────────
export { app };

// ── Arrancar solo si no estamos en modo test ─────────────────────
if (process.env.NODE_ENV !== 'test') {
    startServer();
}
