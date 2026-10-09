import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 500 },
  technology: { type: String, required: true, maxlength: 200 },
  goal: { type: String, required: true, maxlength: 500 },
  requirements: { type: String, maxlength: 5000 },
  techStack: [{ type: String }],
  status: { type: String, enum: ['planning', 'in-progress', 'review', 'completed', 'archived'], default: 'planning' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  justOne: false
});

projectSchema.virtual('conversations', {
  ref: 'Conversation',
  localField: '_id',
  foreignField: 'project',
  justOne: false
});

export default mongoose.model('Project', projectSchema);
