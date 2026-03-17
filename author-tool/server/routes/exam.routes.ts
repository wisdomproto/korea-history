import { Router } from 'express';
import { ExamController } from '../controllers/exam.controller.js';

const router = Router();
router.get('/', ExamController.list);
router.get('/:id', ExamController.getById);
router.post('/', ExamController.create);
router.post('/reorder', ExamController.reorder);
router.post('/sync', ExamController.sync);
router.post('/deploy', ExamController.deploy);
router.put('/:id', ExamController.update);
router.delete('/:id', ExamController.delete);

export default router;
