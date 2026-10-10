// Service to mark documentation as outdated when project files change
import Documentation from '../models/Documentation.js';

/**
 * Mark all documentation for a given project as outdated.
 * This will be called after any project file is created/updated.
 * @param {ObjectId} projectId
 */
export const markDocsOutdated = async (projectId) => {
  try {
    await Documentation.updateMany(
      { project: projectId },
      { $set: { status: 'outdated' } }
    );
    console.log(`Documentation marked outdated for project ${projectId}`);
  } catch (err) {
    console.error('Error marking documentation outdated:', err);
  }
};
