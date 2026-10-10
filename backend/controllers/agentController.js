import codingAgent from '../services/agents/codingAgent.js';
import documentationAgent from '../services/agents/documentationAgent.js';
import monitorAgent from '../services/agents/monitorAgent.js';
import Project from '../models/Project.js';
import Conversation from '../models/Conversation.js';
import { ApiError } from '../utils/ApiError.js';
import { saveDocumentation } from '../services/projects/services/documentation.service.js';

const agents = {
  coding: codingAgent,
  documentation: documentationAgent,
  monitor: monitorAgent
};

export const executeAgent = async (req, res, next) => {
  try {
    const { agentType } = req.params;
    const { projectId, message, action } = req.body;
    const agent = agents[agentType];
    
    if (!agent) throw ApiError.badRequest('Invalid agent type');

    const project = await Project.findOne({ _id: projectId, owner: req.user._id });
    if (!project) throw ApiError.notFound('Project not found');

    const io = req.app.get('io');
    let result;

    if (agentType === 'coding' && action === 'generate') {
      result = await agent.generateCode(project, req.body.requirements || message, io);
    } else if (agentType === 'coding' && action === 'refactor') {
      result = await agent.refactorCode(project, req.body.code, message, io);
    } else if (agentType === 'coding' && action === 'debug') {
      result = await agent.debugCode(project, req.body.code, message, io);
    } else if (agentType === 'documentation' && action === 'readme') {
      result = await agent.generateReadme(project, io);
    } else if (agentType === 'documentation' && action === 'api-docs') {
      result = await agent.generateApiDocs(project, req.body.endpoints || message, io);
    } else if (agentType === 'documentation' && action === 'architecture') {
      result = await agent.generateArchitectureDocs(project, io);
    } else if (agentType === 'monitor' && action === 'analyze') {
      result = await agent.analyzeProject(project, io);
    } else if (agentType === 'monitor' && action === 'risks') {
      result = await agent.assessRisks(project, io);
    } else {
      result = await agent.execute(project, message, io);
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const getAgentConversation = async (req, res, next) => {
  try {
    const { agentType, projectId } = req.params;
    if (!agents[agentType]) throw ApiError.badRequest('Invalid agent type');

    const project = await Project.findOne({ _id: projectId, owner: req.user._id });
    if (!project) throw ApiError.notFound('Project not found');

    const conversation = await Conversation.findOne({ project: projectId, agentType });
    res.status(200).json({ success: true, data: { conversation } });
  } catch (error) { next(error); }
};

export const getAgentTasks = async (req, res, next) => {
  try {
    const { agentType, projectId } = req.params;
    if (!agents[agentType]) throw ApiError.badRequest('Invalid agent type');

    const project = await Project.findOne({ _id: projectId, owner: req.user._id });
    if (!project) throw ApiError.notFound('Project not found');

    const agent = agents[agentType];
    const tasks = await agent.getTasks(projectId);
    res.status(200).json({ success: true, data: { tasks } });
  } catch (error) { next(error); }
};

export const getAgentStatus = async (req, res, next) => {
  try {
    const { agentType } = req.params;
    if (!agents[agentType]) throw ApiError.badRequest('Invalid agent type');
    
    res.status(200).json({
      success: true,
      data: {
        agentType,
        status: 'idle',
        available: !!process.env.AI_API_KEY && process.env.AI_API_KEY !== 'your_ai_api_key_here'
      }
    });
  } catch (error) { next(error); }
};
