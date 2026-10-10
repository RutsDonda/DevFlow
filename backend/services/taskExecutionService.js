// backend/services/taskExecutionService.js
/**
 * Service that coordinates the execution of a Task through the existing development workflow.
 * It validates dependencies, updates task status, creates a WorkflowRun entry, and listens
 * for AgentActivity events to keep the task record in sync.
 */

const Task = require('../models/Task');
const WorkflowRun = require('../models/WorkflowRun'); // from Prompt 10
const developmentWorkflow = require('../services/workflows/developmentWorkflow');
const AgentActivityService = require('../services/agentActivityService'); // existing service that emits socket events

/**
 * Execute a task.
 * @param {String} projectId
 * @param {String} taskId
 * @param {Object} user – authenticated user object (contains _id)
 */
async function executeTask(projectId, taskId, user) {
  // Verify task belongs to project and fetch it
  const task = await Task.findOne({ _id: taskId, project: projectId }).exec();
  if (!task) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }

  // Prevent concurrent execution
  if (task.executionStatus === 'running') {
    const err = new Error('Task is already executing');
    err.status = 400;
    throw err;
  }

  // Ensure all dependencies are completed
  if (task.dependencies && task.dependencies.length > 0) {
    const depTasks = await Task.find({ _id: { $in: task.dependencies } }).exec();
    const incomplete = depTasks.filter((t) => t.status !== 'completed');
    if (incomplete.length > 0) {
      const err = new Error('Cannot execute: dependencies not completed');
      err.status = 400;
      err.blocking = incomplete.map((t) => ({ id: t._id, title: t.title, status: t.status }));
      throw err;
    }
  }

  // Mark task as in-progress and running
  task.status = 'in-progress';
  task.executionStatus = 'running';
  task.updatedBy = user._id;
  await task.save();

  // Emit activity start event
  AgentActivityService.emit('taskExecutionStarted', {
    projectId,
    taskId: task._id,
    userId: user._id,
  });

  // Start the existing development workflow. The workflow expects a task description and
  // maybe an assigned agent – we forward the task._id so that the workflow can store the run.
  const workflowRun = await developmentWorkflow.runTask({
    projectId,
    taskId: task._id,
    description: task.description,
    assignedAgent: task.assignedAgent,
  });

  // Persist workflowRunId on the task for later reference
  task.workflowRunId = workflowRun._id;
  await task.save();

  // Listen for workflow completion events (the workflow itself emits via AgentActivityService)
  // We'll set up a temporary listener that updates the task when the workflow finishes.
  const onWorkflowFinished = async (payload) => {
    if (payload.workflowRunId && payload.workflowRunId.toString() === workflowRun._id.toString()) {
      // Update task based on final workflow status
      const finalStatus = payload.success ? 'completed' : 'blocked';
      task.status = finalStatus;
      task.executionStatus = payload.success ? 'succeeded' : 'failed';
      if (payload.success) task.completedAt = new Date();
      await task.save();

      // Emit final activity event
      AgentActivityService.emit('taskExecutionFinished', {
        projectId,
        taskId: task._id,
        success: payload.success,
        details: payload,
      });

      // Clean up listener
      AgentActivityService.removeListener('workflowFinished', onWorkflowFinished);
    }
  };

  AgentActivityService.on('workflowFinished', onWorkflowFinished);

  // Return immediate info to caller (workflowRun id etc.)
  return { workflowRunId: workflowRun._id, message: 'Task execution started' };
}

module.exports = {
  executeTask,
};
