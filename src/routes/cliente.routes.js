// ================================================================
// YESSY NAILS — Rutas: Clientes
// Endpoints: /api/clientes
// ================================================================

import { Router } from 'express';
import * as ClienteController from '../controllers/cliente.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// ── Ruta pública (registro ligero desde el sitio) ───────────────
router.post('/', ClienteController.create);

// ── Ruta protegida (admin) ──────────────────────────────────────
router.get('/', authMiddleware, ClienteController.getAll);

export default router;
