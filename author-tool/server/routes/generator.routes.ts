import { Router } from 'express';
import { GeneratorController } from '../controllers/generator.controller.js';

const router = Router();
router.post('/questions', GeneratorController.generate);

export default router;
