// ================================================================
// YESSY NAILS — Rutas: Configuración del Sitio
// Endpoints: /api/config
// ================================================================

import { Router } from 'express';
import * as ConfigController from '../controllers/config.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// ── Rutas públicas ──────────────────────────────────────────────
router.get('/', ConfigController.getConfig);

// ── Rutas protegidas (admin) ────────────────────────────────────
router.put('/', authMiddleware, ConfigController.updateConfig);

export default router;
