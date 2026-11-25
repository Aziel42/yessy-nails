// ================================================================
// YESSY NAILS — Rutas: Portafolio / Galería
// Endpoints: /api/portafolio
// ================================================================

import { Router } from 'express';
import * as PortfolioController from '../controllers/portfolio.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// ── Rutas públicas ──────────────────────────────────────────────
router.get('/',         PortfolioController.getAll);
router.get('/estilos',  PortfolioController.getStyles);
router.get('/:id',      PortfolioController.getById);

// ── Rutas protegidas (admin) ────────────────────────────────────
router.post('/',        authMiddleware, PortfolioController.create);
router.put('/:id',      authMiddleware, PortfolioController.update);
router.delete('/:id',   authMiddleware, PortfolioController.remove);

export default router;
