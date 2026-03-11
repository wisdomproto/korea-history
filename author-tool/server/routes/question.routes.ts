import { Router } from 'express';
import { QuestionController } from '../controllers/question.controller.js';

const router = Router();
router.get('/', QuestionController.list);
router.post('/', QuestionController.create);
router.post('/reorder', QuestionController.reorder);
router.post('/batch', QuestionController.addBatch);
router.put('/bulk-answers', QuestionController.bulkAnswers);
router.put('/bulk-explanations', QuestionController.bulkExplanations);
router.put('/:id', QuestionController.update);
router.delete('/:id', QuestionController.delete);

export default router;
