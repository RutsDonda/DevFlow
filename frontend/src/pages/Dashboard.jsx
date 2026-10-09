import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { agentAPI } from '../services/api';
import Card from '../components/common/Card';
import AgentCard from '../components/agents/AgentCard';
import Button from '../components/common/Button';
import ProjectCard from '../components/project/ProjectCard';
import { HiOutlineFolderPlus, HiOutlineCpuChip, HiOutlineChartBar } from 'react-icons/hi2';

const Dashboard = () => {
  const { projects, fetchProjects, isLoading } = useAppContext();
  const [agentsStatus, setAgentsStatus] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();

    const fetchAgentStatus = async () => {
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
    };

    fetchAgentStatus();
  }, [fetchProjects]);

  const stats = [
    { name: 'Total Projects', value: projects.length.toString(), icon: HiOutlineFolderPlus, color: 'text-blue-400' },
    { 
      name: 'Active Agents', 
      value: Object.values(agentsStatus).filter(s => s === 'idle' || s === 'working').length.toString(), 
      icon: HiOutlineCpuChip, 
      color: 'text-indigo-400' 
    },
    { name: 'Completed Tasks', value: '0', icon: HiOutlineChartBar, color: 'text-emerald-400' },
  ];

  const agentDetails = [
    {
      id: 'coding',
      name: 'Coding Agent',
      type: 'coding',
      description: 'Writes, refactors, and debugs code based on your requirements.',
    },
    {
      id: 'documentation',
      name: 'Docs Agent',
      type: 'documentation',
      description: 'Generates READMEs, API specs, and inline documentation.',
    },
    {
      id: 'monitor',
      name: 'Monitor Agent',
      type: 'monitor',
      description: 'Analyzes code quality, tracks metrics, and oversees workflow.',
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-400">Welcome to your AI-assisted development workspace.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="flex items-center p-6">
            <div className={`p-3 rounded-lg bg-gray-800 ${stat.color} mr-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">{stat.name}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Projects */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Recent Projects</h2>
              <Button variant="secondary" onClick={() => navigate('/projects')}>View All</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isLoading ? (
                <div className="col-span-2 text-center text-gray-500 py-8">Loading projects...</div>
              ) : projects.length > 0 ? (
                projects.slice(0, 4).map((project) => (
                  <ProjectCard key={project._id || project.id} project={project} />
                ))
              ) : (
                <Card className="col-span-2 text-center py-12">
                  <p className="text-gray-400 mb-4">You don't have any projects yet.</p>
                  <Button variant="primary" onClick={() => navigate('/projects/create')}>
                    Create Your First Project
                  </Button>
                </Card>
              )}
            </div>
          </section>

          {/* Agents Status */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">System Agents</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {agentDetails.map((agent) => (
                <AgentCard 
                  key={agent.id} 
                  agent={{...agent, status: agentsStatus[agent.type] || 'offline'}} 
                  onClick={() => navigate('/agents')}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar / Quick Actions */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button 
                variant="primary" 
                className="w-full justify-center"
                onClick={() => navigate('/projects/create')}
              >
                <HiOutlineFolderPlus className="w-5 h-5 mr-2" />
                New Project
              </Button>
              <Button 
                variant="secondary" 
                className="w-full justify-center"
                onClick={() => navigate('/agents')}
              >
                <HiOutlineCpuChip className="w-5 h-5 mr-2" />
                Manage Agents
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
