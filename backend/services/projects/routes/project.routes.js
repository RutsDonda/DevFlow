import { Router } from 'express';
import { body, param } from 'express-validator';
import { protect } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} from '../controllers/project.controller.js';

const router = Router();

router.use(protect);

router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required').isLength({ max: 150 }),
    body('description').notEmpty().withMessage('Description is required').isLength({ max: 2000 }),
    body('technologyStack').optional().isArray(),
    body('requirements').optional().isString().isLength({ max: 5000 }),
    body('status')
      .optional()
      .isIn(['planning', 'development', 'testing', 'completed', 'blocked'])
      .withMessage('Invalid status'),
    body('progress')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Progress must be 0-100'),
  ],
  validateRequest,
  createProject
);

router.get('/', getProjects);

router.get('/:id', [param('id').isMongoId()], validateRequest, getProject);

router.put(
  '/:id',
  [
    param('id').isMongoId(),
    body('name').optional().isLength({ max: 150 }),
    body('description').optional().isLength({ max: 2000 }),
    body('technologyStack').optional().isArray(),
    body('requirements').optional().isString().isLength({ max: 5000 }),
    body('status')
      .optional()
      .isIn(['planning', 'development', 'testing', 'completed', 'blocked'])
      .withMessage('Invalid status'),
    body('progress')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Progress must be 0-100'),
  ],
  validateRequest,
  updateProject
);

router.delete('/:id', [param('id').isMongoId()], validateRequest, deleteProject);

export default router;
