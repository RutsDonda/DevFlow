import projectService from '../services/project/projectService.js';

export const createProject = async (req, res, next) => {
  try {
    const project = await projectService.create(req.body, req.user._id);
    res.status(201).json({ success: true, data: { project } });
  } catch (error) { next(error); }
};

export const getProjects = async (req, res, next) => {
  try {
    const projects = await projectService.getAll(req.user._id);
    res.status(200).json({ success: true, data: { projects } });
  } catch (error) { next(error); }
};

export const getProject = async (req, res, next) => {
  try {
    const project = await projectService.getById(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: { project } });
  } catch (error) { next(error); }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await projectService.update(req.params.id, req.body, req.user._id);
    res.status(200).json({ success: true, data: { project } });
  } catch (error) { next(error); }
};

export const deleteProject = async (req, res, next) => {
  try {
    await projectService.delete(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) { next(error); }
};

export const getProjectStats = async (req, res, next) => {
  try {
    const result = await projectService.getProjectStats(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};
