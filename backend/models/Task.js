// backend/models/Task.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const taskSchema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'review', 'completed', 'blocked'],
    default: 'todo',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true,
  },
  assignedAgent: { type: String, enum: ['CodingAgent', 'DocumentationAgent', 'ProjectMonitorAgent'] },
  dependencies: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: Date },
  executionStatus: { type: String, enum: ['idle', 'running', 'failed', 'succeeded'], default: 'idle' },
  workflowRunId: { type: Schema.Types.ObjectId, ref: 'WorkflowRun' },
  completedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
