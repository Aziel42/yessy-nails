// ================================================================
// YESSY NAILS — Rutas: Materiales / Inventario
// Endpoints: /api/materiales
// ================================================================

import { Router } from 'express';
import * as MaterialController from '../controllers/material.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// ── Ruta pública ────────────────────────────────────────────────
router.get('/', MaterialController.getAll);

// ── Rutas protegidas (admin) ────────────────────────────────────
router.post('/',      authMiddleware, MaterialController.create);
router.put('/:id',    authMiddleware, MaterialController.update);
router.delete('/:id', authMiddleware, MaterialController.remove);

export default router;
