import llmService from '../ai/llmService.js';
import { buildProjectContext, buildAgentMessage } from '../ai/promptTemplates.js';
import Task from '../../models/Task.js';
import Conversation from '../../models/Conversation.js';
import logger from '../../utils/logger.js';

class BaseAgent {
  constructor(agentType) {
    this.agentType = agentType;
  }

  async execute(project, userMessage, socketIO = null) {
    const task = await Task.create({
      project: project._id,
      agentType: this.agentType,
      title: `Task for ${this.agentType}`,
      status: 'in-progress',
      input: userMessage
    });

    if (socketIO) {
      socketIO.to(`project:${project._id}`).emit('agent:task-started', {
        agentType: this.agentType,
        taskId: task._id,
        projectId: project._id
      });
    }

    try {
      let conversation = await Conversation.findOne({ project: project._id, agentType: this.agentType });
      if (!conversation) {
        conversation = await Conversation.create({
          project: project._id,
          agentType: this.agentType,
          messages: []
        });
      }

      conversation.messages.push({ role: 'user', content: userMessage });
      const projectContext = buildProjectContext(project);
      const systemMessages = buildAgentMessage(this.agentType, projectContext, userMessage);
      
      const history = conversation.messages.slice(0, -1).slice(-10).map(m => ({ role: m.role, content: m.content }));
      const fullMessages = [
        ...systemMessages.slice(0, 2),
        ...history,
        systemMessages[2]
      ];

      const response = await llmService.chat(fullMessages);

      conversation.messages.push({ role: 'assistant', content: response });
      await conversation.save();

      task.status = 'completed';
      task.output = response;
      task.completedAt = Date.now();
      await task.save();

      if (socketIO) {
        socketIO.to(`project:${project._id}`).emit('agent:task-completed', {
          agentType: this.agentType,
          taskId: task._id,
          projectId: project._id,
          output: response
        });
      }

      return { task, response };
    } catch (error) {
      task.status = 'failed';
      task.output = error.message;
      await task.save();
      
      if (socketIO) {
        socketIO.to(`project:${project._id}`).emit('agent:task-failed', {
          agentType: this.agentType,
          taskId: task._id,
          projectId: project._id,
          error: error.message
        });
      }
      logger.error(`Agent Execute Error: ${error.message}`);
      throw error;
    }
  }

  async getConversation(projectId) {
    return await Conversation.findOne({ project: projectId, agentType: this.agentType });
  }

  async getTasks(projectId) {
    return await Task.find({ project: projectId, agentType: this.agentType }).sort({ createdAt: -1 });
  }
}

export default BaseAgent;
