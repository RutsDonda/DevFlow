import mongoose from 'mongoose';

const documentationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    type: { type: String, required: true, enum: ['readme', 'api', 'architecture', 'setup', 'database', 'development', 'changelog'] },
    title: { type: String, required: true },
    content: { type: String, required: true },
    version: { type: Number, default: 1 },
    generatedBy: { type: String, required: true }, // e.g., 'documentationAgent'
  },
  { timestamps: true }
);

export default mongoose.model('Documentation', documentationSchema);
