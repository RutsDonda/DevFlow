import { Router } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { protect } from '../middleware/auth.js';
import { executeAgent, getAgentConversation, getAgentTasks, getAgentStatus } from '../controllers/agentController.js';

const router = Router();
router.use(protect);

const validAgentTypes = ['coding', 'documentation', 'monitor'];

router.post('/:agentType/execute', [
  param('agentType').isIn(validAgentTypes).withMessage('Invalid agent type'),
  body('projectId').isMongoId().withMessage('Invalid project ID'),
  body('message').notEmpty().withMessage('Message is required').isLength({ max: 5000 })
], validateRequest, executeAgent);

router.get('/:agentType/status', getAgentStatus);

router.get('/:agentType/conversations/:projectId', [
  param('agentType').isIn(validAgentTypes),
  param('projectId').isMongoId()
], validateRequest, getAgentConversation);

router.get('/:agentType/tasks/:projectId', [
  param('agentType').isIn(validAgentTypes),
  param('projectId').isMongoId()
], validateRequest, getAgentTasks);

export default router;
