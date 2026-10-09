import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { projectAPI } from '../services/api';
import ProjectCard from '../components/project/ProjectCard';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import { HiOutlineFolderPlus, HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const Projects = () => {
  const { projects, fetchProjects, isLoading, dispatch } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await projectAPI.delete(id);
      if (response.success) {
        dispatch({ type: 'DELETE_PROJECT', payload: id });
        toast.success('Project deleted successfully');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete project');
    }
  };

  const filteredProjects = projects.filter((project) => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-gray-400">Manage your development projects and AI environments.</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/projects/create')}>
          <HiOutlineFolderPlus className="w-5 h-5 mr-2" />
          New Project
        </Button>
      </div>

      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <HiOutlineMagnifyingGlass className="h-5 w-5 text-gray-500" />
        </div>
        <input
          type="text"
          className="input-field w-full pl-10"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader size="lg" />
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((project) => (
            <div key={project._id || project.id} className="relative group">
              <ProjectCard project={project} />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProject(project._id || project.id);
                }}
                className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-400 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                title="Delete Project"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-900 border border-gray-800 rounded-xl">
          <HiOutlineFolderPlus className="w-16 h-16 text-gray-700 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No projects found</h3>
          <p className="text-gray-400 mb-6 max-w-md">
            {searchQuery 
              ? "We couldn't find any projects matching your search." 
              : "You haven't created any projects yet. Start by creating your first AI-assisted project."}
          </p>
          {!searchQuery && (
            <Button variant="primary" onClick={() => navigate('/projects/create')}>
              Create Your First Project
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Projects;
