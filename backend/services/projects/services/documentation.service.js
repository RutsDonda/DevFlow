import Documentation from '../../models/Documentation.js';

/**
 * Save a generated documentation piece.
 * @param {ObjectId} projectId
 * @param {String} type - one of the allowed doc types
 * @param {String} title
 * @param {String} content
 * @param {String} generatedBy - agent name
 * @returns {Promise<Document>}
 */
export const saveDocumentation = async (projectId, type, title, content, generatedBy) => {
  const doc = new Documentation({
    project: projectId,
    type,
    title,
    content,
    generatedBy,
    version: 1
  });
  return await doc.save();
};

export const getProjectDocs = async (projectId) => {
  return await Documentation.find({ project: projectId }).sort({ createdAt: -1 });
};

export const updateDocumentation = async (docId, updates) => {
  const doc = await Documentation.findById(docId);
  if (!doc) return null;
  Object.assign(doc, updates);
  // increment version on each update
  doc.version = (doc.version || 1) + 1;
  return await doc.save();
};
