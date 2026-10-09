// services/agents/CodingAgent.js

import BaseAgent from './BaseAgent.js';
import codingPrompt from './prompts/coding.prompt.js';

export default class CodingAgent extends BaseAgent {
  constructor() {
    super('CodingAgent', codingPrompt);
  }

  // Additional methods specific to coding can be added here.
}
