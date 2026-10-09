import Project from '../models/Project.js';
import logger from '../../utils/logger.js';
import { ApiError } from '../../utils/ApiError.js';

class ProjectService {
  async create(data, ownerId) {
    const project = await Project.create({ ...data, owner: ownerId });
    logger.info(`Project created: ${project.name} (owner ${ownerId})`);
    return project;
  }

  async getAll(ownerId) {
    return await Project.find({ owner: ownerId }).sort({ createdAt: -1 });
  }

  async getById(id, ownerId) {
    const project = await Project.findOne({ _id: id, owner: ownerId });
    if (!project) throw ApiError.notFound('Project not found');
    return project;
  }

  async update(id, data, ownerId) {
    const project = await Project.findOneAndUpdate(
      { _id: id, owner: ownerId },
      data,
      { new: true, runValidators: true }
    );
    if (!project) throw ApiError.notFound('Project not found');
    return project;
  }

  async delete(id, ownerId) {
    const project = await Project.findOneAndDelete({ _id: id, owner: ownerId });
    if (!project) throw ApiError.notFound('Project not found');
    logger.info(`Project deleted: ${project.name}`);
    return project;
  }
}

export default new ProjectService();
