// ================================================================
// YESSY NAILS — Rutas: Servicios
// Endpoints: /api/servicios
// ================================================================

import { Router } from 'express';
import * as ServiceController from '../controllers/service.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// ── Rutas públicas ──────────────────────────────────────────────
router.get('/',           ServiceController.getAll);
router.get('/categorias', ServiceController.getCategories);
router.get('/:id',        ServiceController.getById);

// ── Rutas protegidas (admin) ────────────────────────────────────
router.post('/',          authMiddleware, ServiceController.create);
router.put('/:id',        authMiddleware, ServiceController.update);
router.delete('/:id',     authMiddleware, ServiceController.remove);

export default router;
