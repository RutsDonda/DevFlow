// ProjectFile controller handling CRUD operations for code workspace files

import ProjectFileService from '../services/projectFile.service.js';
import { ApiError } from '../../utils/ApiError.js';

export const getProjectFiles = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const files = await ProjectFileService.getAll(projectId);
    res.status(200).json({ success: true, data: { files } });
  } catch (err) {
    next(err);
  }
};

export const getProjectFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const file = await ProjectFileService.getById(fileId);
    if (!file) return next(ApiError.notFound('File not found'));
    res.status(200).json({ success: true, data: { file } });
  } catch (err) {
    next(err);
  }
};

export const createProjectFile = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const createdBy = req.user.id;
    const fileData = { ...req.body, project: projectId, createdBy };
    const file = await ProjectFileService.create(fileData);
    res.status(201).json({ success: true, data: { file } });
  } catch (err) {
    next(err);
  }
};

export const updateProjectFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const file = await ProjectFileService.update(fileId, req.body);
    if (!file) return next(ApiError.notFound('File not found'));
    res.status(200).json({ success: true, data: { file } });
  } catch (err) {
    next(err);
  }
};

export const deleteProjectFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    await ProjectFileService.delete(fileId);
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
