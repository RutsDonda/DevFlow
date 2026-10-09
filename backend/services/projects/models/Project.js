import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  requirements: { type: String, trim: true, maxlength: 5000 },
  technologyStack: [{ type: String }],
  status: {
    type: String,
    enum: ['planning', 'development', 'testing', 'completed', 'blocked'],
    default: 'planning'
  },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('Project', projectSchema);
