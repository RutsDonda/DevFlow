// backend/services/taskService.js
/**
 * Service layer for Task CRUD operations and business rules.
 * All functions assume a valid authenticated user (req.user) is passed in.
 */
const Task = require('../models/Task');
const Project = require('../models/Project'); // Assuming Project model exists

/** Helper to ensure task belongs to the given project */
async function assertTaskInProject(projectId, taskId) {
  const task = await Task.findById(taskId).exec();
  if (!task) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }
  if (task.project.toString() !== projectId) {
    const err = new Error('Task does not belong to the specified project');
    err.status = 400;
    throw err;
  }
  return task;
}

/** Create a new task */
async function createTask(projectId, data, userId) {
  // Ensure the project exists and belongs to the user (ownership check done in route middleware)
  const task = new Task({
    project: projectId,
    title: data.title,
    description: data.description,
    status: data.status || 'todo',
    priority: data.priority || 'medium',
    assignedAgent: data.assignedAgent,
    dependencies: data.dependencies || [],
    createdBy: userId,
    updatedBy: userId,
    dueDate: data.dueDate,
  });
  return await task.save();
}

/** Get a paginated list of tasks with optional filters */
async function listTasks(projectId, query) {
  const filter = { project: projectId };
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.assignedAgent) filter.assignedAgent = query.assignedAgent;

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
    Task.countDocuments(filter).exec(),
  ]);

  return { tasks, total, page, limit };
}

/** Get a single task */
async function getTask(projectId, taskId) {
  return await assertTaskInProject(projectId, taskId);
}

/** Update a task (full replace of mutable fields) */
async function updateTask(projectId, taskId, data, userId) {
  const task = await assertTaskInProject(projectId, taskId);
  // Only allow mutable fields
  const mutable = ['title', 'description', 'status', 'priority', 'assignedAgent', 'dependencies', 'dueDate'];
  mutable.forEach((field) => {
    if (field in data) task[field] = data[field];
  });
  task.updatedBy = userId;
  task.updatedAt = Date.now();
  return await task.save();
}

/** Patch only the status field */
async function patchStatus(projectId, taskId, newStatus, userId) {
  const task = await assertTaskInProject(projectId, taskId);
  task.status = newStatus;
  task.updatedBy = userId;
  task.updatedAt = Date.now();
  return await task.save();
}

/** Delete a task after checking dependents */
async function deleteTask(projectId, taskId) {
  // Ensure no other task depends on this one
  const dependents = await Task.find({ project: projectId, dependencies: taskId }).exec();
  if (dependents.length > 0) {
    const err = new Error('Cannot delete task; other tasks depend on it');
    err.status = 400;
    throw err;
  }
  const result = await Task.deleteOne({ _id: taskId, project: projectId }).exec();
  if (result.deletedCount === 0) {
    const err = new Error('Task not found or could not be deleted');
    err.status = 404;
    throw err;
  }
  return true;
}

module.exports = {
  createTask,
  listTasks,
  getTask,
  updateTask,
  patchStatus,
  deleteTask,
  assertTaskInProject,
};
