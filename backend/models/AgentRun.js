// backend/models/AgentRun.js
/**
 * Tracks the execution of an Agent (e.g., Coding Agent) including retry attempts.
 * Each document represents a single run of an agent for a given task/project.
 */
const mongoose = require('mongoose');
const { Schema } = mongoose;

const attemptSchema = new Schema({
  attemptNumber: { type: Number, required: true },
  validationResult: { type: Object, required: true }, // stores the full validation JSON
  changedFiles: [{ filePath: String, content: String }],
  status: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
});

const agentRunSchema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  task: { type: Schema.Types.ObjectId, ref: 'Task' },
  agentType: { type: String, required: true, enum: ['coding', 'documentation', 'monitor'] },
  maxAttempts: { type: Number, default: 3 },
  attempts: [attemptSchema],
  overallStatus: { type: String, enum: ['in-progress', 'completed', 'blocked'], default: 'in-progress' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('AgentRun', agentRunSchema);
