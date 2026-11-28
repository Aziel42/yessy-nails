// ================================================================
// YESSY NAILS — Rutas: FAQs
// Endpoints: /api/faqs
// ================================================================

import { Router } from 'express';
import * as FaqController from '../controllers/faq.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// ── Rutas públicas ──────────────────────────────────────────────
router.get('/', FaqController.getAll);

// ── Rutas protegidas (admin) ────────────────────────────────────
router.post('/', authMiddleware, FaqController.create);
router.delete('/:id', authMiddleware, FaqController.remove);

export default router;