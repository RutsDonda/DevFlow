import { Router } from 'express';
import { param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { getProjectDocs, updateDocumentation } from '../services/projects/services/documentation.service.js';
import documentationAgent from '../services/agents/documentationAgent.js';
import Documentation from '../models/Documentation.js';

const router = Router();

// Get all documentation for a project
router.get('/:projectId/docs', [param('projectId').isMongoId()], validateRequest, async (req, res) => {
  try {
    const docs = await getProjectDocs(req.params.projectId);
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch documentation' });
  }
});

// Regenerate a specific documentation piece (e.g., README) using the documentation agent
router.post('/:projectId/docs/:docId/regenerate', [
  param('projectId').isMongoId(),
  param('docId').isMongoId()
], validateRequest, async (req, res) => {
  try {
    const doc = await Documentation.findById(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Documentation not found' });
    // Only support README regeneration for demo
    if (doc.type === 'readme') {
      const regenerated = await documentationAgent.generateReadme({ _id: req.params.projectId }, null);
      await updateDocumentation(doc._id, { content: regenerated, status: 'up-to-date' });
      return res.json({ message: 'README regenerated', content: regenerated });
    }
    res.status(400).json({ message: 'Regeneration for this doc type not implemented' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Regeneration failed' });
  }
});

export default router;
