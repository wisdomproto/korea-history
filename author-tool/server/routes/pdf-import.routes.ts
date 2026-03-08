import { Router } from 'express';
import multer from 'multer';
import { PdfImportController } from '../controllers/pdf-import.controller.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const router = Router();
router.post('/parse', upload.single('pdf'), PdfImportController.parse);

export default router;
