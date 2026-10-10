import mongoose from 'mongoose';

const documentationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    type: { type: String, required: true, enum: ['readme', 'api', 'architecture', 'setup', 'database', 'development', 'changelog'] },
    title: { type: String, required: true },
    content: { type: String, required: true },
    version: { type: Number, default: 1 },
    generatedBy: { type: String, required: true }, // e.g., 'documentationAgent'
    status: { type: String, enum: ['up-to-date', 'outdated', 'missing'], default: 'up-to-date' }, // new status field
  },
  { timestamps: true }
);

// When a documentation is updated, create a version snapshot
documentationSchema.pre('save', async function (next) {
  if (!this.isNew) {
    const DocumentationVersion = mongoose.model('DocumentationVersion');
    await DocumentationVersion.create({
      docId: this._id,
      project: this.project,
      type: this.type,
      title: this.title,
      content: this.content,
      version: this.version,
      generatedBy: this.generatedBy,
      status: this.status,
    });
  }
  next();
});

export default mongoose.model('Documentation', documentationSchema);
