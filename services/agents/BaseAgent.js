// services/agents/BaseAgent.js

import AIService from '../../ai/AIService.js';

/**
 * BaseAgent provides a common interface for all agents.
 * It hides the direct LLM calls behind AIService.
 */
export default class BaseAgent {
  /**
   * @param {string} name - Human‑readable name of the agent
   * @param {string} promptPath - Path to the prompt module that exports a `prompt` string
   */
  constructor(name, prompt) {
    this.name = name;
    this.prompt = prompt; // static prompt string
    this.ai = new AIService();
  }

  /**
   * Process a user request.
   * Sub‑classes may overload this to add custom logic.
   * @param {string} userInput
   * @returns {Promise<string>} LLM response
   */
  async handle(userInput) {
    const fullPrompt = `${this.prompt}\n\nUser input: ${userInput}`;
    return await this.ai.generate(fullPrompt);
  }
}
