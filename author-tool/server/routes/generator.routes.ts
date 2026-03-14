import { Router } from 'express';
import { GeneratorController } from '../controllers/generator.controller.js';

const router = Router();
router.post('/questions', GeneratorController.generate);
router.post('/explanation', GeneratorController.generateExplanation);

export default router;
