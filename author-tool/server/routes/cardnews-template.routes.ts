import { Router } from 'express';
import * as templateService from '../services/cardnews-template.service.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const templates = await templateService.listTemplates();
    res.json({ success: true, data: templates });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, canvas } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Name required' });
    const tmpl = await templateService.saveTemplate(name.trim(), canvas);
    res.json({ success: true, data: tmpl });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const tmpl = await templateService.updateTemplate(req.params.id, req.body);
    if (!tmpl) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: tmpl });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await templateService.deleteTemplate(req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
