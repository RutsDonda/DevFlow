import { validationResult } from 'express-validator';
import ProjectService from '../services/project.service.js';
import { ApiError } from '../../utils/ApiError.js';

export const createProject = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Validation failed', errors.array()));
    }
    const project = await ProjectService.create(req.body, req.user.id);
    res.status(201).json({ success: true, data: { project } });
  } catch (err) {
    next(err);
  }
};

export const getProjects = async (req, res, next) => {
  try {
    const projects = await ProjectService.getAll(req.user.id);
    res.status(200).json({ success: true, data: { projects } });
  } catch (err) {
    next(err);
  }
};

export const getProject = async (req, res, next) => {
  try {
    const project = await ProjectService.getById(req.params.id, req.user.id);
    res.status(200).json({ success: true, data: { project } });
  } catch (err) {
    next(err);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Validation failed', errors.array()));
    }
    const project = await ProjectService.update(req.params.id, req.body, req.user.id);
    res.status(200).json({ success: true, data: { project } });
  } catch (err) {
    next(err);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    await ProjectService.delete(req.params.id, req.user.id);
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
