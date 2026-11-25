// ================================================================
// YESSY NAILS — Rutas: Admin / Autenticación
// Endpoints: /api/admin
// ================================================================

import { Router } from 'express';
import * as AdminController from '../controllers/admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// ── Ruta pública (login) ────────────────────────────────────────
router.post('/login', AdminController.login);

// ── Rutas protegidas ────────────────────────────────────────────
router.get('/perfil',           authMiddleware, AdminController.getProfile);
router.put('/cambiar-password', authMiddleware, AdminController.changePassword);
router.post('/enviar-oferta', authMiddleware, AdminController.sendOffer);

export default router;
