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
      logger.info(`Sending chat request to AI API, model: ${options.model || this.model}`);
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
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
        throw new Error(`AI API Error: ${response.status} - ${errorData}`);
      }
      
      const data = await response.json();
      logger.info('Successfully received chat response from AI API');
      return data.choices[0].message.content;
    } catch (error) {
      logger.error(`AI Service Error: ${error.message}`);
      throw ApiError.internal(error.message);
    }
  }

  async generateStructuredOutput(messages, options = {}) {
    return await this.chat(messages, { ...options, temperature: 0.3 });
  }
}

const llmService = new LLMService();
export default llmService;
