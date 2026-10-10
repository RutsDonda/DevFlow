// DocumentationVersion model to store immutable history of documentation snapshots
import mongoose from 'mongoose';

const documentationVersionSchema = new mongoose.Schema(
  {
    docId: { type: mongoose.Schema.Types.ObjectId, ref: 'Documentation', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    version: { type: Number, required: true },
    generatedBy: { type: String, required: true },
    status: { type: String, enum: ['up-to-date', 'outdated', 'missing'], default: 'up-to-date' },
  },
  { timestamps: true }
);

export default mongoose.model('DocumentationVersion', documentationVersionSchema);
