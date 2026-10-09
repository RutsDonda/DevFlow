import { Router } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { protect } from '../middleware/auth.js';
import { createProject, getProjects, getProject, updateProject, deleteProject, getProjectStats } from '../controllers/projectController.js';

const router = Router();
router.use(protect);

router.post('/', [
  body('name').notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('description').notEmpty().withMessage('Description is required').isLength({ max: 500 }),
  body('technology').notEmpty().withMessage('Technology is required').isLength({ max: 200 }),
  body('goal').notEmpty().withMessage('Goal is required').isLength({ max: 500 }),
  body('requirements').optional().isLength({ max: 5000 }),
  body('techStack').optional().isArray()
], validateRequest, createProject);

router.get('/', getProjects);

router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid project ID')
], validateRequest, getProject);

router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid project ID')
], validateRequest, updateProject);

router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid project ID')
], validateRequest, deleteProject);

router.get('/:id/stats', [
  param('id').isMongoId().withMessage('Invalid project ID')
], validateRequest, getProjectStats);

export default router;
