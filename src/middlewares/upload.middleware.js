// ================================================================
// YESSY NAILS — Middleware de Carga de Archivos (Multer)
// Permite subir imágenes directamente desde la computadora a /uploads
// ================================================================

import multer from 'multer';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Directorio destino: public/uploads
const UPLOAD_DIR = resolve(__dirname, '../../public/uploads');

// Asegurar que la carpeta exista
if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuración de almacenamiento en disco
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        // Generar nombre único: img-1732155000000-123456.jpg
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `img-${uniqueSuffix}${ext}`);
    }
});

// Filtro de tipos de archivo permitidos (solo imágenes)
const fileFilter = (_req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato de archivo no válido. Solo se permiten imágenes (JPG, PNG, WebP, GIF, SVG).'), false);
    }
};

// Instancia de Multer configurada
export const uploadImage = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Límite de 10 MB por archivo
    }
});

export default uploadImage;
