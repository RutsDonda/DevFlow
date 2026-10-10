// Service layer for ProjectFile CRUD operations

import ProjectFile from '../models/ProjectFile.js';
import { ApiError } from '../../utils/ApiError.js';

class ProjectFileService {
  async getAll(projectId) {
    return await ProjectFile.find({ project: projectId }).sort({ updatedAt: -1 });
  }

  async getById(fileId) {
    return await ProjectFile.findById(fileId);
  }

  async create(fileData) {
    const file = new ProjectFile(fileData);
    return await file.save();
  }

  async update(fileId, updateData) {
    const file = await ProjectFile.findByIdAndUpdate(fileId, updateData, { new: true, runValidators: true });
    if (!file) throw ApiError.notFound('File not found');
    return file;
  }

  async delete(fileId) {
    const file = await ProjectFile.findByIdAndDelete(fileId);
    if (!file) throw ApiError.notFound('File not found');
    return file;
  }
}

export default new ProjectFileService();
