import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI } from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import { HiXMark } from 'react-icons/hi2';

const CreateProject = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [techStack, setTechStack] = useState([]);
  const [techInput, setTechInput] = useState('');
  const [technology, setTechnology] = useState('');
  const [goal, setGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleAddTech = (e) => {
    if (e.key === 'Enter' && techInput.trim()) {
      e.preventDefault();
      if (!techStack.includes(techInput.trim())) {
        setTechStack([...techStack, techInput.trim()]);
      }
      setTechInput('');
    }
  };

  const handleRemoveTech = (techToRemove) => {
    setTechStack(techStack.filter(tech => tech !== techToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !description) return;

    setIsSubmitting(true);
    try {
      const response = await projectAPI.create({
        name,
        description,
        requirements,
        techStack
      });
      
      if (response.success) {
        toast.success('Project created successfully');
        navigate(`/projects/${response.data.project._id || response.data.project.id}`);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to create project');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Create New Project</h1>
        <p className="text-gray-400">Initialize a new AI-assisted development environment.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="name">
                Project Name *
              </label>
              <input
                id="name"
                type="text"
                className="input-field w-full"
                placeholder="e.g. E-commerce Platform"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="description">
                Short Description *
              </label>
              <textarea
                id="description"
                className="input-field w-full h-24 resize-none"
                placeholder="Briefly describe what this project does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="technology">
                Technology *
              </label>
              <input
                id="technology"
                type="text"
                className="input-field w-full"
                placeholder="e.g. MERN + Python AI service"
                value={technology}
                onChange={(e) => setTechnology(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="goal">
                Goal *
              </label>
              <textarea
                id="goal"
                className="input-field w-full h-24 resize-none"
                placeholder="What the project aims to achieve..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="requirements">
                Detailed Requirements
              </label>
              <textarea
                id="requirements"
                className="input-field w-full h-48"
                placeholder="List features, user stories, and acceptance criteria..."
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="techStack">
                Tech Stack
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {techStack.map(tech => (
                  <span key={tech} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {tech}
                    <button
                      type="button"
                      onClick={() => handleRemoveTech(tech)}
                      className="ml-1.5 text-indigo-400 hover:text-indigo-200 focus:outline-none"
                    >
                      <HiXMark className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                id="techStack"
                type="text"
                className="input-field w-full"
                placeholder="Type a technology and press Enter (e.g. React, Node.js)"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={handleAddTech}
              />
              <p className="mt-1 text-xs text-gray-500">Press Enter to add tags</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting || !name || !description}
            >
              Create Project
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateProject;
