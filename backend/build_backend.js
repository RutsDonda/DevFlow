const fs = require('fs');
const path = require('path');
const base = 'e:/project/Multiagent/AI-DevFlow/backend';

const files = {
  'models/User.js': `
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, match: /^\\w+([\\.-]?\\w+)*@\\w+([\\.-]?\\w+)*(\\.\\w{2,3})+$/ },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateAuthToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

export default mongoose.model('User', userSchema);
  `,
  'models/Project.js': `
import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 500 },
  requirements: { type: String, maxlength: 5000 },
  techStack: [{ type: String }],
  status: { type: String, enum: ['planning', 'in-progress', 'review', 'completed', 'archived'], default: 'planning' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  justOne: false
});

projectSchema.virtual('conversations', {
  ref: 'Conversation',
  localField: '_id',
  foreignField: 'project',
  justOne: false
});

export default mongoose.model('Project', projectSchema);
  `,
  'models/Task.js': `
import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  agentType: { type: String, enum: ['coding', 'documentation', 'monitor'], required: true },
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['pending', 'in-progress', 'completed', 'failed'], default: 'pending' },
  input: String,
  output: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});

export default mongoose.model('Task', taskSchema);
  `,
  'models/Conversation.js': `
import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  agentType: { type: String, enum: ['coding', 'documentation', 'monitor'], required: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

conversationSchema.index({ project: 1, agentType: 1 }, { unique: true });

conversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Conversation', conversationSchema);
  `,
  'middleware/auth.js': `
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw ApiError.unauthorized('Not authorized, no token');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        throw ApiError.unauthorized('User not found');
      }
      next();
    } catch (error) {
      throw ApiError.unauthorized('Not authorized, token failed');
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(ApiError.unauthorized('Not authorized for this action'));
    }
    next();
  };
};
  `,
  'controllers/authController.js': `
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.badRequest('Email already registered');
    }
    const user = await User.create({ name, email, password });
    const token = user.generateAuthToken();
    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      throw ApiError.unauthorized('Invalid credentials');
    }
    const token = user.generateAuthToken();
    res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: { user: req.user }
    });
  } catch (error) {
    next(error);
  }
};
  `,
  'routes/authRoutes.js': `
import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe } from '../controllers/authController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validateRequest, register);

router.post('/login', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], validateRequest, login);

router.get('/me', protect, getMe);

export default router;
  `,
  'services/ai/llmService.js': `
import logger from '../../utils/logger.js';
import { ApiError } from '../../utils/ApiError.js';

class LLMService {
  constructor() {
    this.apiKey = process.env.AI_API_KEY;
    this.apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1';
    this.model = process.env.AI_MODEL || 'gpt-4';
  }

  async chat(messages, options = {}) {
    if (!this.apiKey) {
      throw ApiError.internal('AI API key is missing');
    }
    try {
      logger.info(\`Sending chat request to AI API, model: \${options.model || this.model}\`);
      const response = await fetch(\`\${this.apiUrl}/chat/completions\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${this.apiKey}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: options.model || this.model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2048
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(\`AI API Error: \${response.status} - \${errorData}\`);
      }
      
      const data = await response.json();
      logger.info('Successfully received chat response from AI API');
      return data.choices[0].message.content;
    } catch (error) {
      logger.error(\`AI Service Error: \${error.message}\`);
      throw ApiError.internal(error.message);
    }
  }

  async generateStructuredOutput(messages, options = {}) {
    return await this.chat(messages, { ...options, temperature: 0.3 });
  }
}

const llmService = new LLMService();
export default llmService;
  `,
  'services/ai/promptTemplates.js': `
export const AGENT_SYSTEM_PROMPTS = {
  coding: \`You are an expert software engineer AI agent. Your role is to:
- Generate clean, production-quality code based on requirements
- Suggest architecture and design patterns
- Refactor and optimize existing code
- Debug and fix issues
- Follow best practices for the specified tech stack

Always respond with well-structured, commented code. When generating code, wrap it in appropriate markdown code blocks with language identifiers. Explain your design decisions briefly.\`,

  documentation: \`You are an expert technical documentation AI agent. Your role is to:
- Generate comprehensive project documentation
- Create README files, API documentation, and user guides  
- Document code architecture and design decisions
- Create setup instructions and deployment guides
- Maintain changelog and version notes

Always use clear, professional language. Structure documentation with proper headings, sections, and formatting. Use markdown format.\`,

  monitor: \`You are an expert project monitoring AI agent. Your role is to:
- Analyze project health and progress
- Identify potential risks and bottlenecks
- Suggest improvements and optimizations
- Track task completion and milestone progress
- Provide project status summaries and reports

Provide actionable insights with clear metrics when possible. Be concise but thorough in your analysis. Use bullet points for clarity.\`
};

export const buildProjectContext = (project) => {
  return \`Project: \${project.name}
Description: \${project.description}
Requirements: \${project.requirements || 'Not specified'}
Tech Stack: \${project.techStack?.join(', ') || 'Not specified'}
Status: \${project.status}\`;
};

export const buildAgentMessage = (agentType, projectContext, userMessage) => {
  return [
    { role: 'system', content: AGENT_SYSTEM_PROMPTS[agentType] },
    { role: 'system', content: \`Current project context:\\n\${projectContext}\` },
    { role: 'user', content: userMessage }
  ];
};
  `,
  'services/agents/baseAgent.js': `
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
      title: \`Task for \${this.agentType}\`,
      status: 'in-progress',
      input: userMessage
    });

    if (socketIO) {
      socketIO.to(\`project:\${project._id}\`).emit('agent:task-started', {
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
        socketIO.to(\`project:\${project._id}\`).emit('agent:task-completed', {
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
        socketIO.to(\`project:\${project._id}\`).emit('agent:task-failed', {
          agentType: this.agentType,
          taskId: task._id,
          projectId: project._id,
          error: error.message
        });
      }
      logger.error(\`Agent Execute Error: \${error.message}\`);
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
  `,
  'services/agents/codingAgent.js': `
import BaseAgent from './baseAgent.js';

class CodingAgent extends BaseAgent {
  constructor() {
    super('coding');
  }

  async generateCode(project, requirements, socketIO = null) {
    const prompt = \`Based on the project requirements, generate the code implementation:

Requirements:
\${requirements}

Please provide:
1. File structure
2. Complete code for each file
3. Brief explanation of the architecture\`;
    return this.execute(project, prompt, socketIO);
  }

  async refactorCode(project, code, instructions, socketIO = null) {
    const prompt = \`Refactor the following code based on these instructions:

Instructions: \${instructions}

Code:
\\\`\\\`\\\`
\${code}
\\\`\\\`\\\`

Provide the refactored code with explanations of changes made.\`;
    return this.execute(project, prompt, socketIO);
  }

  async debugCode(project, code, error, socketIO = null) {
    const prompt = \`Debug the following code that produces this error:

Error: \${error}

Code:
\\\`\\\`\\\`
\${code}
\\\`\\\`\\\`

Identify the issue and provide the fixed code with explanation.\`;
    return this.execute(project, prompt, socketIO);
  }
}

const codingAgent = new CodingAgent();
export default codingAgent;
  `,
  'services/agents/documentationAgent.js': `
import BaseAgent from './baseAgent.js';

class DocumentationAgent extends BaseAgent {
  constructor() {
    super('documentation');
  }

  async generateReadme(project, socketIO = null) {
    const prompt = \`Generate a comprehensive README.md for this project. Include:
1. Project title and description
2. Features list
3. Tech stack
4. Installation instructions
5. Usage guide
6. API documentation (if applicable)
7. Contributing guidelines
8. License section\`;
    return this.execute(project, prompt, socketIO);
  }

  async generateApiDocs(project, endpoints, socketIO = null) {
    const prompt = \`Generate API documentation for the following endpoints:

\${endpoints}

Use clear formatting with:
- Endpoint URL and method
- Request parameters/body
- Response format
- Example requests and responses
- Error codes\`;
    return this.execute(project, prompt, socketIO);
  }

  async generateArchitectureDocs(project, socketIO = null) {
    const prompt = \`Generate architecture documentation for this project. Include:
1. System overview and high-level architecture
2. Component diagram description
3. Data flow
4. Technology choices and rationale
5. Design patterns used
6. Scalability considerations\`;
    return this.execute(project, prompt, socketIO);
  }
}

const documentationAgent = new DocumentationAgent();
export default documentationAgent;
  `,
  'services/agents/monitorAgent.js': `
import BaseAgent from './baseAgent.js';
import Task from '../../models/Task.js';

class MonitorAgent extends BaseAgent {
  constructor() {
    super('monitor');
  }

  async analyzeProject(project, socketIO = null) {
    const tasks = await Task.find({ project: project._id });
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length
    };

    const prompt = \`Analyze the current state of this project and provide a comprehensive status report.

Task Statistics:
- Total tasks: \${stats.total}
- Completed: \${stats.completed}
- Failed: \${stats.failed}
- Pending: \${stats.pending}
- In Progress: \${stats.inProgress}

Provide:
1. Overall project health assessment
2. Progress summary
3. Potential risks or concerns
4. Recommendations for next steps
5. Priority items to address\`;
    return this.execute(project, prompt, socketIO);
  }

  async assessRisks(project, socketIO = null) {
    const prompt = \`Perform a risk assessment for this project. Analyze:
1. Technical risks based on the tech stack
2. Timeline risks
3. Complexity concerns
4. Dependencies and potential bottlenecks
5. Mitigation strategies for each identified risk\`;
    return this.execute(project, prompt, socketIO);
  }
}

const monitorAgent = new MonitorAgent();
export default monitorAgent;
  `,
  'services/project/projectService.js': `
import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import Conversation from '../../models/Conversation.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

class ProjectService {
  async create(data, userId) {
    const project = await Project.create({ ...data, owner: userId });
    logger.info(\`Project created: \${project.name} by user \${userId}\`);
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
    logger.info(\`Project deleted: \${project.name}\`);
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
  `,
  'controllers/projectController.js': `
import projectService from '../services/project/projectService.js';

export const createProject = async (req, res, next) => {
  try {
    const project = await projectService.create(req.body, req.user._id);
    res.status(201).json({ success: true, data: { project } });
  } catch (error) { next(error); }
};

export const getProjects = async (req, res, next) => {
  try {
    const projects = await projectService.getAll(req.user._id);
    res.status(200).json({ success: true, data: { projects } });
  } catch (error) { next(error); }
};

export const getProject = async (req, res, next) => {
  try {
    const project = await projectService.getById(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: { project } });
  } catch (error) { next(error); }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await projectService.update(req.params.id, req.body, req.user._id);
    res.status(200).json({ success: true, data: { project } });
  } catch (error) { next(error); }
};

export const deleteProject = async (req, res, next) => {
  try {
    await projectService.delete(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) { next(error); }
};

export const getProjectStats = async (req, res, next) => {
  try {
    const result = await projectService.getProjectStats(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};
  `,
  'routes/projectRoutes.js': `
import { Router } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { protect } from '../middleware/auth.js';
import { createProject, getProjects, getProject, updateProject, deleteProject, getProjectStats } from '../controllers/projectController.js';

const router = Router();
router.use(protect);

router.post('/', [
  body('name').notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('description').notEmpty().withMessage('Description is required').isLength({ max: 500 }),
  body('requirements').optional().isLength({ max: 5000 }),
  body('techStack').optional().isArray()
], validateRequest, createProject);

router.get('/', getProjects);

router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid project ID')
], validateRequest, getProject);

router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid project ID')
], validateRequest, updateProject);

router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid project ID')
], validateRequest, deleteProject);

router.get('/:id/stats', [
  param('id').isMongoId().withMessage('Invalid project ID')
], validateRequest, getProjectStats);

export default router;
  `,
  'controllers/agentController.js': `
import codingAgent from '../services/agents/codingAgent.js';
import documentationAgent from '../services/agents/documentationAgent.js';
import monitorAgent from '../services/agents/monitorAgent.js';
import Project from '../models/Project.js';
import Conversation from '../models/Conversation.js';
import { ApiError } from '../utils/ApiError.js';

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
  `,
  'routes/agentRoutes.js': `
import { Router } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { protect } from '../middleware/auth.js';
import { executeAgent, getAgentConversation, getAgentTasks, getAgentStatus } from '../controllers/agentController.js';

const router = Router();
router.use(protect);

const validAgentTypes = ['coding', 'documentation', 'monitor'];

router.post('/:agentType/execute', [
  param('agentType').isIn(validAgentTypes).withMessage('Invalid agent type'),
  body('projectId').isMongoId().withMessage('Invalid project ID'),
  body('message').notEmpty().withMessage('Message is required').isLength({ max: 5000 })
], validateRequest, executeAgent);

router.get('/:agentType/status', getAgentStatus);

router.get('/:agentType/conversations/:projectId', [
  param('agentType').isIn(validAgentTypes),
  param('projectId').isMongoId()
], validateRequest, getAgentConversation);

router.get('/:agentType/tasks/:projectId', [
  param('agentType').isIn(validAgentTypes),
  param('projectId').isMongoId()
], validateRequest, getAgentTasks);

export default router;
  `,
  'config/socket.js': `
import logger from '../utils/logger.js';

let ioInstance = null;

export const initializeSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    logger.info(\`Client connected: \${socket.id}\`);

    socket.on('join-project', (projectId) => {
      socket.join(\`project:\${projectId}\`);
      logger.debug(\`Socket \${socket.id} joined project:\${projectId}\`);
    });

    socket.on('leave-project', (projectId) => {
      socket.leave(\`project:\${projectId}\`);
      logger.debug(\`Socket \${socket.id} left project:\${projectId}\`);
    });

    socket.on('disconnect', () => {
      logger.info(\`Client disconnected: \${socket.id}\`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized');
  }
  return ioInstance;
};

export default { initializeSocket, getIO };
  `,
  'routes/index.js': `
import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import projectRoutes from './projectRoutes.js';
import agentRoutes from './agentRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/agents', agentRoutes);

export default router;
  `,
  'server.js': `
import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import { initializeSocket } from './config/socket.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  logger.error(\`UNCAUGHT EXCEPTION! Shutting down...\\n\${err.name}: \${err.message}\\n\${err.stack}\`);
  process.exit(1);
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Initialize Socket.IO event handlers
initializeSocket(io);

// Make io accessible to route handlers via app.set
app.set('io', io);

connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(\`Server running in \${process.env.NODE_ENV || 'development'} mode on port \${PORT}\`);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error(\`UNHANDLED REJECTION! Shutting down...\\n\${err.name}: \${err.message}\`);
  server.close(() => {
    process.exit(1);
  });
});
  `
};

Object.keys(files).forEach(f => {
  const full = path.join(base, f);
  fs.mkdirSync(path.dirname(full), {recursive: true});
  fs.writeFileSync(full, files[f].trim() + '\\n');
  console.log('Written ' + full);
});
