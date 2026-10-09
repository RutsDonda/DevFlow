// services/agents/DocumentationAgent.js

import BaseAgent from './BaseAgent.js';
import documentationPrompt from './prompts/documentation.prompt.js';

export default class DocumentationAgent extends BaseAgent {
  constructor() {
    super('DocumentationAgent', documentationPrompt);
  }

  // Additional documentation‑specific methods can be added here.
}
