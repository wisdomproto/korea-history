import { Router } from 'express';
import * as projectService from '../services/project.service.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const projects = await projectService.readProjects();
    res.json({ success: true, data: projects });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, icon, type, categoryCode, examCount, questionCount } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Name required' });
    const project = await projectService.createProject({
      name: name.trim(),
      icon,
      type,
      categoryCode,
      examCount,
      questionCount,
    });
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body);
    if (!project) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await projectService.deleteProject(req.params.id);
    if (!ok) return res.status(400).json({ success: false, error: 'Cannot delete default project' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
