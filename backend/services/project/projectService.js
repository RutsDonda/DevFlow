import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import Conversation from '../../models/Conversation.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

class ProjectService {
  async create(data, userId) {
    const project = await Project.create({ ...data, owner: userId });
    logger.info(`Project created: ${project.name} by user ${userId}`);
    return project;
  }

  async getAll(userId) {
    return await Project.find({ owner: userId }).sort({ createdAt: -1 });
  }

  async getById(projectId, userId) {
    const project = await Project.findOne({ _id: projectId, owner: userId });
    if (!project) throw ApiError.notFound('Project not found');
    return project;
  }

  async update(projectId, data, userId) {
    const project = await Project.findOneAndUpdate(
      { _id: projectId, owner: userId },
      data,
      { new: true, runValidators: true }
    );
    if (!project) throw ApiError.notFound('Project not found');
    return project;
  }

  async delete(projectId, userId) {
    const project = await Project.findOneAndDelete({ _id: projectId, owner: userId });
    if (!project) throw ApiError.notFound('Project not found');
    
    await Task.deleteMany({ project: projectId });
    await Conversation.deleteMany({ project: projectId });
    logger.info(`Project deleted: ${project.name}`);
    return project;
  }

  async getProjectStats(projectId, userId) {
    const project = await this.getById(projectId, userId);
    const tasks = await Task.find({ project: projectId });
    const conversations = await Conversation.find({ project: projectId });
    
    return {
      project,
      stats: {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        failedTasks: tasks.filter(t => t.status === 'failed').length,
        activeConversations: conversations.length,
        tasksByAgent: {
          coding: tasks.filter(t => t.agentType === 'coding').length,
          documentation: tasks.filter(t => t.agentType === 'documentation').length,
          monitor: tasks.filter(t => t.agentType === 'monitor').length
        }
      }
    };
  }
}

const projectService = new ProjectService();
export default projectService;
