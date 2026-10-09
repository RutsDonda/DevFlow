import React, { useState } from 'react';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';
import { HiOutlineCalendar, HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineCodeBracketSquare } from 'react-icons/hi2';

const ProjectInfo = ({ project }) => {
  const [isRequirementsExpanded, setIsRequirementsExpanded] = useState(false);

  if (!project) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{project.name}</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span className="flex items-center">
              <HiOutlineCalendar className="w-4 h-4 mr-1" />
              {formatDate(project.createdAt)}
            </span>
            <StatusBadge status={project.status || 'planning'} />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Description</h3>
        <p className="text-gray-400 whitespace-pre-wrap">{project.description}</p>
      </div>

      {project.techStack && project.techStack.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center">
            <HiOutlineCodeBracketSquare className="w-4 h-4 mr-1" />
            Tech Stack
          </h3>
          <div className="flex flex-wrap gap-2">
            {project.techStack.map((tech, index) => (
              <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {project.requirements && (
        <div className="flex-1 flex flex-col min-h-0">
          <div 
            className="flex justify-between items-center cursor-pointer py-2 border-b border-gray-800 mb-2"
            onClick={() => setIsRequirementsExpanded(!isRequirementsExpanded)}
          >
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Requirements</h3>
            <button className="text-gray-400 hover:text-white focus:outline-none">
              {isRequirementsExpanded ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
            </button>
          </div>
          
          <div className={`overflow-y-auto pr-2 custom-scrollbar ${isRequirementsExpanded ? 'flex-1' : 'max-h-32'}`}>
            <p className="text-gray-400 text-sm whitespace-pre-wrap">
              {project.requirements}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProjectInfo;
