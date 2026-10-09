import React, { useState, useEffect } from 'react';
import { agentAPI } from '../../services/api';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import Loader from '../common/Loader';
import { HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineClock } from 'react-icons/hi2';

const TaskItem = ({ task }) => {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden mb-3">
      <div 
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-750 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-700 text-gray-300 capitalize">
              {task.agentType}
            </span>
            <StatusBadge status={task.status} />
          </div>
          <h4 className="text-sm font-medium text-white truncate">
            {task.action || 'Custom Task'}
          </h4>
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <HiOutlineClock className="w-3 h-3 mr-1" />
            {formatDate(task.createdAt)}
          </div>
        </div>
        <button className="text-gray-400">
          {expanded ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
        </button>
      </div>

      {expanded && (
        <div className="p-3 border-t border-gray-700 bg-gray-900">
          {task.description && (
            <div className="mb-3">
              <span className="text-xs text-gray-500 uppercase font-semibold">Description</span>
              <p className="text-sm text-gray-300 mt-1">{task.description}</p>
            </div>
          )}
          
          <div>
            <span className="text-xs text-gray-500 uppercase font-semibold">Output</span>
            <div className="mt-1 p-2 bg-gray-950 rounded border border-gray-800 max-h-60 overflow-y-auto text-sm text-gray-300 font-mono whitespace-pre-wrap">
              {task.output || (task.status === 'in_progress' ? 'Running...' : 'No output')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AgentTaskList = ({ agentType, projectId }) => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const response = await agentAPI.getTasks(agentType, projectId);
        if (response.success) {
          setTasks(response.data.tasks || []);
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (agentType && projectId) {
      fetchTasks();
    }
  }, [agentType, projectId]);

  if (isLoading) {
    return <div className="p-4 flex justify-center"><Loader size="md" /></div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No tasks found for this agent.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-full overflow-y-auto pr-2 custom-scrollbar">
      {tasks.map(task => (
        <TaskItem key={task._id || task.id} task={task} />
      ))}
    </div>
  );
};

export default AgentTaskList;
