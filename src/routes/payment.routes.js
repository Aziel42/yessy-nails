// ================================================================
// YESSY NAILS — Rutas: Pagos (Mercado Pago Sandbox)
// Endpoints: /api/pagos
// ================================================================

import { Router } from 'express';
import * as PaymentController from '../controllers/payment.controller.js';

const router = Router();

router.post('/crear-preferencia', PaymentController.createPreference);
router.post('/confirmar',         PaymentController.confirmPayment);

export default router;
