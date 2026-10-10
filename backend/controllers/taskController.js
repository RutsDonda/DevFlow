// backend/controllers/taskController.js
/**
 * Controllers for Task endpoints. They rely on the taskService and validators.
 * All routes are protected by the existing `protect` middleware (applied in routes).
 */
const asyncHandler = require('express-async-handler');
const taskService = require('../services/taskService');
const { createTask, updateTask, patchStatus, executeTask, listTasks } = require('../services/taskService'); // already imported above

/** Create a new task */
const createTaskCtrl = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user._id;
  const task = await taskService.createTask(projectId, req.body, userId);
  res.status(201).json(task);
});

/** List tasks with filters & pagination */
const getTasksCtrl = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const result = await taskService.listTasks(projectId, req.query);
  res.json(result);
});

/** Get a single task */
const getTaskCtrl = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const task = await taskService.getTask(projectId, taskId);
  res.json(task);
});

/** Update a task (full mutable fields) */
const updateTaskCtrl = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const userId = req.user._id;
  const task = await taskService.updateTask(projectId, taskId, req.body, userId);
  res.json(task);
});

/** Patch only status */
const patchStatusCtrl = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const userId = req.user._id;
  const task = await taskService.patchStatus(projectId, taskId, req.body.status, userId);
  res.json(task);
});

/** Delete a task */
const deleteTaskCtrl = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  await taskService.deleteTask(projectId, taskId);
  res.status(204).send();
});

/** Execute a task via existing workflow */
const executeTaskCtrl = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const user = req.user;
  const taskExecutionService = require('../services/taskExecutionService');
  const result = await taskExecutionService.executeTask(projectId, taskId, user);
  res.json(result);
});

module.exports = {
  createTaskCtrl,
  getTasksCtrl,
  getTaskCtrl,
  updateTaskCtrl,
  patchStatusCtrl,
  deleteTaskCtrl,
  executeTaskCtrl,
};
