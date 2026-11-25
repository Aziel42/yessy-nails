// ================================================================
// YESSY NAILS — Rutas: Citas
// Endpoints: /api/citas
// ================================================================

import { Router } from 'express';
import * as AppointmentController from '../controllers/appointment.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// ── Rutas públicas ──────────────────────────────────────────────
router.get('/disponibilidad', AppointmentController.checkAvailability);
router.post('/',              AppointmentController.create);

// ── Rutas protegidas (admin) ────────────────────────────────────
router.post('/verificar',     authMiddleware, AppointmentController.verifyPending);
router.get('/',               authMiddleware, AppointmentController.getAll);
router.get('/hoy',            authMiddleware, AppointmentController.getToday);
router.get('/:id',            authMiddleware, AppointmentController.getById);
router.put('/:id',            authMiddleware, AppointmentController.update);
router.delete('/:id',         authMiddleware, AppointmentController.remove);

export default router;
