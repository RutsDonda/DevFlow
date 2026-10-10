// backend/validators/taskValidator.js
const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

// Helper to check a valid ObjectId
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const validateTaskId = param('taskId')
  .custom(isObjectId)
  .withMessage('Invalid task ID');

const validateProjectId = param('projectId')
  .custom(isObjectId)
  .withMessage('Invalid project ID');

const createTask = [
  validateProjectId,
  body('title').isString().trim().notEmpty().withMessage('Title is required'),
  body('description').optional().isString(),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'completed', 'blocked']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('assignedAgent').optional().isIn(['CodingAgent', 'DocumentationAgent', 'ProjectMonitorAgent']),
  body('dependencies').optional().isArray(),
  body('dependencies.*').custom(isObjectId).withMessage('Invalid dependency ID'),
];

const updateTask = [
  validateProjectId,
  validateTaskId,
  body('title').optional().isString().trim().notEmpty(),
  body('description').optional().isString(),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'completed', 'blocked']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('assignedAgent').optional().isIn(['CodingAgent', 'DocumentationAgent', 'ProjectMonitorAgent']),
  body('dependencies').optional().isArray(),
  body('dependencies.*').custom(isObjectId).withMessage('Invalid dependency ID'),
];

const patchStatus = [
  validateProjectId,
  validateTaskId,
  body('status').isIn(['todo', 'in-progress', 'review', 'completed', 'blocked']).withMessage('Invalid status'),
];

const executeTask = [
  validateProjectId,
  validateTaskId,
];

const listTasks = [
  validateProjectId,
  query('status').optional().isIn(['todo', 'in-progress', 'review', 'completed', 'blocked']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('assignedAgent').optional().isIn(['CodingAgent', 'DocumentationAgent', 'ProjectMonitorAgent']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

module.exports = {
  createTask,
  updateTask,
  patchStatus,
  executeTask,
  listTasks,
  validateTaskId,
  validateProjectId,
};
