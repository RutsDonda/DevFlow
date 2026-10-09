import BaseAgent from './baseAgent.js';

class DocumentationAgent extends BaseAgent {
  constructor() {
    super('documentation');
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
    return this.execute(project, prompt, socketIO);
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
    return this.execute(project, prompt, socketIO);
  }

  async generateArchitectureDocs(project, socketIO = null) {
    const prompt = `Generate architecture documentation for this project. Include:
1. System overview and high-level architecture
2. Component diagram description
3. Data flow
4. Technology choices and rationale
5. Design patterns used
6. Scalability considerations`;
    return this.execute(project, prompt, socketIO);
  }
}

const documentationAgent = new DocumentationAgent();
export default documentationAgent;
