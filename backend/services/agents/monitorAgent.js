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

    const prompt = `Analyze the current state of this project and provide a comprehensive status report.

Task Statistics:
- Total tasks: ${stats.total}
- Completed: ${stats.completed}
- Failed: ${stats.failed}
- Pending: ${stats.pending}
- In Progress: ${stats.inProgress}

Provide:
1. Overall project health assessment
2. Progress summary
3. Potential risks or concerns
4. Recommendations for next steps
5. Priority items to address`;
    return this.execute(project, prompt, socketIO);
  }

  async assessRisks(project, socketIO = null) {
    const prompt = `Perform a risk assessment for this project. Analyze:
1. Technical risks based on the tech stack
2. Timeline risks
3. Complexity concerns
4. Dependencies and potential bottlenecks
5. Mitigation strategies for each identified risk`;
    return this.execute(project, prompt, socketIO);
  }
}

const monitorAgent = new MonitorAgent();
export default monitorAgent;
