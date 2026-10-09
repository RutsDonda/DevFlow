import BaseAgent from './baseAgent.js';

class CodingAgent extends BaseAgent {
  constructor() {
    super('coding');
  }

  async generateCode(project, requirements, socketIO = null) {
    const prompt = `Based on the project requirements, generate the code implementation:

Requirements:
${requirements}

Please provide:
1. File structure
2. Complete code for each file
3. Brief explanation of the architecture`;
    return this.execute(project, prompt, socketIO);
  }

  async refactorCode(project, code, instructions, socketIO = null) {
    const prompt = `Refactor the following code based on these instructions:

Instructions: ${instructions}

Code:
\`\`\`
${code}
\`\`\`

Provide the refactored code with explanations of changes made.`;
    return this.execute(project, prompt, socketIO);
  }

  async debugCode(project, code, error, socketIO = null) {
    const prompt = `Debug the following code that produces this error:

Error: ${error}

Code:
\`\`\`
${code}
\`\`\`

Identify the issue and provide the fixed code with explanation.`;
    return this.execute(project, prompt, socketIO);
  }
}

const codingAgent = new CodingAgent();
export default codingAgent;
