// ================================================================
// YESSY NAILS — Rutas: Chat / Mensajes
// Endpoints: /api/chat
// ================================================================

import { Router } from 'express';
import * as ChatController from '../controllers/chat.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// ── Rutas protegidas (admin gestiona chat) ──────────────────────
router.get('/salas',               authMiddleware, ChatController.getRooms);
router.put('/salas/:salaId/leer',  authMiddleware, ChatController.markRead);
router.get('/no-leidos',           authMiddleware, ChatController.getUnread);

// ── Rutas públicas (clientes envían mensajes) ───────────────────
router.get('/salas/:salaId',       ChatController.getMessages);
router.get('/:salaId',             ChatController.getMessages);
router.post('/mensajes',           ChatController.sendMessage);
router.post('/',                   ChatController.sendMessage);

export default router;
