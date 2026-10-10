import BaseAgent from './baseAgent.js';
import { saveDocumentation } from '../../services/projects/services/documentation.service.js';

class DocumentationAgent extends BaseAgent {
  constructor() {
    super('documentation');
  }

  /**
   * Save generated documentation.
   * @param {Object} params - includes project, type, title, content, generatedBy
   * @returns {Promise}
   */
  async _saveDoc({ project, type, title, content, generatedBy }) {
    return await saveDocumentation(project._id, type, title, content, generatedBy);
  }

  async generateReadme(project, socketIO = null) {
    const prompt = `Generate a comprehensive README.md for this project. Include:
1. Project title and description
2. Features list
3. Tech stack
4. Installation instructions
5. Usage guide
6. API documentation (if applicable)
7. Contributing guidelines
8. License section`;
    const response = await this.execute(project, prompt, socketIO);
    const title = 'README';
    await this._saveDoc({ project, type: 'readme', title, content: response, generatedBy: this.agentType });
    return response;
  }

  async generateApiDocs(project, endpoints, socketIO = null) {
    const prompt = `Generate API documentation for the following endpoints:

${endpoints}

Use clear formatting with:
- Endpoint URL and method
- Request parameters/body
- Response format
- Example requests and responses
- Error codes`;
    const response = await this.execute(project, prompt, socketIO);
    const title = 'API Documentation';
    await this._saveDoc({ project, type: 'api-docs', title, content: response, generatedBy: this.agentType });
    return response;
  }

  async generateArchitectureDocs(project, socketIO = null) {
    const prompt = `Generate architecture documentation for this project. Include:
1. System overview and high-level architecture
2. Component diagram description
3. Data flow
4. Technology choices and rationale
5. Design patterns used
6. Scalability considerations`;
    const response = await this.execute(project, prompt, socketIO);
    const title = 'Architecture Documentation';
    await this._saveDoc({ project, type: 'architecture', title, content: response, generatedBy: this.agentType });
    return response;
  }
}

const documentationAgent = new DocumentationAgent();
export default documentationAgent;
