import mongoose from 'mongoose';

const StepSchema = new mongoose.Schema({
  name: { type: String, required: true }, // coding | documentation | monitor
  status: { type: String, enum: ['queued','running','completed','failed'], default: 'queued' },
  startedAt: Date,
  completedAt: Date,
  result: mongoose.Schema.Types.Mixed,
  error: String,
});

const WorkflowRunSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['queued','running','completed','partially_completed','failed','blocked','cancelled'],
      default: 'queued',
    },
    correlationId: { type: String, required: true, unique: true },
    steps: [StepSchema],
    startedAt: Date,
    completedAt: Date,
    durationMs: Number,
    error: String,
  },
  { timestamps: true }
);

export default mongoose.model('WorkflowRun', WorkflowRunSchema);
