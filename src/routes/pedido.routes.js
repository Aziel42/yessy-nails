// ================================================================
// YESSY NAILS — Rutas: Pedidos
// Endpoints: /api/pedidos
// ================================================================

import { Router } from 'express';
import * as PedidoController from '../controllers/pedido.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// ── Ruta pública (clientas hacen pedidos) ───────────────────────
router.post('/', PedidoController.create);

// ── Rutas protegidas (admin) ────────────────────────────────────
router.get('/',       authMiddleware, PedidoController.getAll);
router.put('/:id',    authMiddleware, PedidoController.update);
router.delete('/:id', authMiddleware, PedidoController.remove);

export default router;
