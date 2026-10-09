import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import { getAgentColor } from '../../utils/helpers';
import { HiOutlineCpuChip, HiOutlineDocumentText, HiOutlineChartBar } from 'react-icons/hi2';

const agentIcons = {
  coding: HiOutlineCpuChip,
  documentation: HiOutlineDocumentText,
  monitor: HiOutlineChartBar,
};

const AgentCard = ({ agent }) => {
  const Icon = agentIcons[agent.type] || HiOutlineCpuChip;

  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${getAgentColor(agent.type)}/20`}>
            <Icon className={`h-6 w-6 text-${getAgentColor(agent.type).replace('bg-', '')}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-100">{agent.name}</h3>
            <p className="text-sm text-gray-400 mt-1">{agent.description}</p>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>
    </Card>
  );
};

export default AgentCard;
