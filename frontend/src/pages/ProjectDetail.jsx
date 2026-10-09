import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectAPI } from '../services/api';
import ProjectInfo from '../components/project/ProjectInfo';
import AgentChat from '../components/agents/AgentChat';
import AgentTaskList from '../components/agents/AgentTaskList';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import { 
  HiOutlineArrowLeft, 
  HiOutlineInformationCircle, 
  HiOutlineCommandLine, 
  HiOutlineDocumentText, 
  HiOutlineShieldCheck,
  HiOutlineClipboardDocumentList
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchProjectData = async () => {
      setIsLoading(true);
      try {
        const [projectRes, statsRes] = await Promise.all([
          projectAPI.getById(id),
          projectAPI.getStats(id).catch(() => ({ success: true, data: { stats: null } }))
        ]);

        if (projectRes.success) {
          setProject(projectRes.data.project);
        }
        if (statsRes.success && statsRes.data.stats) {
          setStats(statsRes.data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch project:', error);
        toast.error('Failed to load project details');
        navigate('/projects');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [id, navigate]);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: HiOutlineInformationCircle },
    { id: 'coding', name: 'Coding Agent', icon: HiOutlineCommandLine },
    { id: 'documentation', name: 'Docs Agent', icon: HiOutlineDocumentText },
    { id: 'monitor', name: 'Monitor Agent', icon: HiOutlineShieldCheck },
    { id: 'tasks', name: 'All Tasks', icon: HiOutlineClipboardDocumentList },
  ];

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (!project) {
    return <div className="text-white">Project not found</div>;
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/projects')}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <HiOutlineArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{project.name}</h1>
          <p className="text-sm text-gray-400">Project Workspace</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 border-b border-gray-800 overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
              ${activeTab === tab.id 
                ? 'border-indigo-500 text-indigo-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
              }
            `}
          >
            <tab.icon className="w-5 h-5 mr-2" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
            <div className="lg:col-span-2">
              <ProjectInfo project={project} />
            </div>
            <div className="space-y-6">
              {/* Stats Card */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Project Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-800">
                    <span className="text-gray-400 text-sm">Tasks Completed</span>
                    <span className="text-white font-medium">{stats?.tasksCompleted || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-800">
                    <span className="text-gray-400 text-sm">Active Issues</span>
                    <span className="text-white font-medium">{stats?.activeIssues || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Files Modified</span>
                    <span className="text-white font-medium">{stats?.filesModified || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {['coding', 'documentation', 'monitor'].includes(activeTab) && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-full min-h-0">
              <AgentChat agentType={activeTab} projectId={project._id || project.id} />
            </div>
            <div className="h-full bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col min-h-0">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Recent Tasks
              </h3>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AgentTaskList agentType={activeTab} projectId={project._id || project.id} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="h-full bg-gray-900 border border-gray-800 rounded-xl p-4 overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-semibold text-white mb-4">All Agent Tasks</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
               {/* Fetch and show all tasks, simplified here for the layout. In a real scenario, you'd fetch all tasks or combine them */}
               <div className="col-span-full">
                  <p className="text-gray-400 text-center py-8">Select specific agents to view their tasks or use the overview.</p>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
