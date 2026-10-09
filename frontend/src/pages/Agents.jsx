import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentAPI } from '../services/api';
import AgentCard from '../components/agents/AgentCard';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import { useAppContext } from '../context/AppContext';

const Agents = () => {
  const [agentsStatus, setAgentsStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const { projects, fetchProjects } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();

    const fetchAgentStatus = async () => {
      setIsLoading(true);
      const types = ['coding', 'documentation', 'monitor'];
      const statusMap = {};
      
      for (const type of types) {
        try {
          const res = await agentAPI.getStatus(type);
          if (res.success) {
            statusMap[type] = res.data.status;
          }
        } catch (error) {
          console.error(`Failed to fetch ${type} status:`, error);
          statusMap[type] = 'offline';
        }
      }
      setAgentsStatus(statusMap);
      setIsLoading(false);
    };

    fetchAgentStatus();
  }, [fetchProjects]);

  const agents = [
    {
      id: 'coding',
      name: 'Coding Agent',
      type: 'coding',
      description: 'Specializes in writing, refactoring, and debugging code. Uses advanced models to understand context and implement features based on requirements.',
    },
    {
      id: 'documentation',
      name: 'Documentation Agent',
      type: 'documentation',
      description: 'Automatically generates READMEs, API specifications, inline documentation, and architecture diagrams based on codebase analysis.',
    },
    {
      id: 'monitor',
      name: 'Monitor Agent',
      type: 'monitor',
      description: 'Continuously analyzes code quality, tracks performance metrics, oversees workflow, and flags potential security or architecture risks.',
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">System Agents</h1>
        <p className="mt-1 text-sm text-gray-400">View and manage specialized AI agents available in your workspace.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div key={agent.id} className="flex flex-col h-full bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
              <div className="flex-1 p-0">
                {/* We use AgentCard structure here but enhanced for the full page */}
                <AgentCard 
                  agent={{...agent, status: agentsStatus[agent.type] || 'offline'}} 
                  className="border-none bg-transparent hover:border-none shadow-none"
                />
              </div>
              <div className="p-5 border-t border-gray-800 bg-gray-900/50 mt-auto">
                <p className="text-sm text-gray-400 mb-4">{agent.description}</p>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500 uppercase">Use with Project</label>
                  {projects.length > 0 ? (
                    <div className="flex space-x-2">
                      <select 
                        className="input-field flex-1 text-sm py-1.5"
                        defaultValue=""
                        onChange={(e) => {
                          if(e.target.value) {
                            navigate(`/projects/${e.target.value}`);
                          }
                        }}
                      >
                        <option value="" disabled>Select Project...</option>
                        {projects.map(p => (
                          <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <Button 
                      variant="secondary" 
                      className="w-full text-xs" 
                      onClick={() => navigate('/projects/create')}
                    >
                      Create Project First
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Agents;
