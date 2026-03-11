import { Router } from 'express';
import multer from 'multer';
import { ImageController } from '../controllers/image.controller.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.post('/upload', upload.single('image'), ImageController.upload);
router.post('/generate', ImageController.generate);
router.get('/models', ImageController.models);
router.post('/delete', ImageController.delete);
router.get('/proxy', ImageController.proxy);

export default router;
