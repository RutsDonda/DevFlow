// backend/routes/taskRoutes.js
import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createTask,
  updateTask,
  patchStatus,
  executeTask,
  listTasks,
  validateTaskId,
  validateProjectId,
} from '../validators/taskValidator.js';
import {
  createTaskCtrl,
  getTasksCtrl,
  getTaskCtrl,
  updateTaskCtrl,
  patchStatusCtrl,
  deleteTaskCtrl,
  executeTaskCtrl,
} from '../controllers/taskController.js';

const router = Router({ mergeParams: true }); // inherit :projectId from parent

router.use(protect);

// Create task
router.post('/', [validateProjectId, ...createTask], validateRequest, createTaskCtrl);

// List tasks
router.get('/', [validateProjectId, ...listTasks], validateRequest, getTasksCtrl);

// Get task details
router.get('/:taskId', [validateProjectId, validateTaskId], validateRequest, getTaskCtrl);

// Update task (full mutable fields)
router.put('/:taskId', [validateProjectId, validateTaskId, ...updateTask], validateRequest, updateTaskCtrl);

// Patch status
router.patch('/:taskId/status', [validateProjectId, validateTaskId, ...patchStatus], validateRequest, patchStatusCtrl);

// Delete task
router.delete('/:taskId', [validateProjectId, validateTaskId], validateRequest, deleteTaskCtrl);

// Execute task
router.post('/:taskId/execute', [validateProjectId, validateTaskId, ...executeTask], validateRequest, executeTaskCtrl);

export default router;
