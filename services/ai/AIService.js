// services/ai/AIService.js

/**
 * AIService abstracts the underlying LLM provider.
 * For now it uses a simple stub implementation. Replace the
 * `generate` method with a real provider (e.g., OpenAI, Anthropic)
 * when you have API keys configured.
 */
export default class AIService {
  constructor() {
    // In a real implementation you could select a provider based on env vars.
    // this.provider = new OpenAIProvider();
  }

  /**
   * Generate a response from the LLM.
   * @param {string} prompt - Full prompt sent to the model.
   * @returns {Promise<string>} The generated text.
   */
  async generate(prompt) {
    // Placeholder – echo the prompt for now.
    return Promise.resolve(`AI response to: ${prompt}`);
  }
}
