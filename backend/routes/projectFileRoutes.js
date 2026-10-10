// Route definitions for ProjectFile CRUD operations
import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  getProjectFiles,
  getProjectFile,
  createProjectFile,
  updateProjectFile,
  deleteProjectFile,
} from '../../services/projects/controllers/projectFile.controller.js';

const router = Router({ mergeParams: true }); // mergeParams to access :projectId

router.use(protect);

// GET /api/projects/:projectId/files
router.get('/', getProjectFiles);
// POST /api/projects/:projectId/files
router.post('/', validateRequest, createProjectFile);

// Routes for specific file ID
router.get('/:fileId', getProjectFile);
router.put('/:fileId', validateRequest, updateProjectFile);
router.delete('/:fileId', deleteProjectFile);

export default router;
