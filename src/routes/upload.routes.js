// ================================================================
// YESSY NAILS — Rutas: Carga de Imágenes (Upload)
// Endpoint: POST /api/upload
// ================================================================

import { Router } from 'express';
import { uploadImage } from '../middlewares/upload.middleware.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

/**
 * POST /api/upload
 * Sube una imagen a /public/uploads/ y devuelve su URL relativa pública.
 * Protegido con authMiddleware (solo Yessica/Admin).
 */
router.post('/', authMiddleware, (req, res) => {
    // Acepta campo 'imagen' o 'file'
    const uploadSingle = uploadImage.single('imagen');

    uploadSingle(req, res, (err) => {
        if (err) {
            return errorResponse(res, err.message || 'Error al subir la imagen.', 400);
        }

        if (!req.file) {
            return errorResponse(res, 'No se proporcionó ningún archivo de imagen.', 400);
        }

        const fileUrl = `/uploads/${req.file.filename}`;

        return successResponse(res, {
            filename: req.file.filename,
            url: fileUrl,
            size: req.file.size,
            mimetype: req.file.mimetype
        }, 'Imagen subida exitosamente al servidor 💅', 201);
    });
});

export default router;
