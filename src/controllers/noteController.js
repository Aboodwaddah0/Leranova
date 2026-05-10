import AppError from '../utils/appError.js';
import { createNoteSchema } from '../validations/noteValidation.js';
import {
  createNote,
  getNotesForStudent,
  deleteNote,
  getNotesForParent,
  getChildrenForParent,
  markNoteRead,
  getMyParentProfile,
  updateMyParentProfile,
} from '../services/noteService.js';
import { getParentChildrenMarks } from '../services/marksService.js';
import { updateMyParentProfileSchema } from '../validations/parentValidation.js';

const respond = (res, status, data) =>
  res.status(status).json({ success: true, status, data, error: null, timestamp: new Date().toISOString() });

export const createNoteController = async (req, res, next) => {
  try {
    const { error, value } = createNoteSchema.validate(req.body, { abortEarly: true, stripUnknown: true });
    if (error) return next(new AppError(error.details[0].message, 400));

    const note = await createNote(req.user, value);
    return respond(res, 201, note);
  } catch (err) {
    return next(err);
  }
};

export const getNotesController = async (req, res, next) => {
  try {
    const studentId = Number(req.query.studentId);
    if (!studentId || !Number.isInteger(studentId)) {
      return next(new AppError('studentId query param is required', 400));
    }
    const notes = await getNotesForStudent(req.user, studentId);
    return respond(res, 200, notes);
  } catch (err) {
    return next(err);
  }
};

export const deleteNoteController = async (req, res, next) => {
  try {
    const noteId = Number(req.params.noteId);
    if (!noteId) return next(new AppError('Invalid note ID', 400));
    const result = await deleteNote(req.user, noteId);
    return respond(res, 200, result);
  } catch (err) {
    return next(err);
  }
};

export const getParentChildrenController = async (req, res, next) => {
  try {
    const children = await getChildrenForParent(req.user.id);
    return respond(res, 200, children);
  } catch (err) {
    return next(err);
  }
};

export const getParentNotesController = async (req, res, next) => {
  try {
    const data = await getNotesForParent(req.user.id);
    return respond(res, 200, data);
  } catch (err) {
    return next(err);
  }
};

export const markNoteReadController = async (req, res, next) => {
  try {
    const noteId = Number(req.params.noteId);
    if (!noteId) return next(new AppError('Invalid note ID', 400));
    const result = await markNoteRead(req.user.id, noteId);
    return respond(res, 200, result);
  } catch (err) {
    return next(err);
  }
};

export const getParentMarksController = async (req, res, next) => {
  try {
    const data = await getParentChildrenMarks(req.user.id);
    return respond(res, 200, data);
  } catch (err) {
    return next(err);
  }
};

export const getMyParentProfileController = async (req, res, next) => {
  try {
    const data = await getMyParentProfile(req.user.id);
    return respond(res, 200, data);
  } catch (err) {
    return next(err);
  }
};

export const updateMyParentProfileController = async (req, res, next) => {
  try {
    const { error, value } = updateMyParentProfileSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));
    const data = await updateMyParentProfile(req.user.id, value);
    return respond(res, 200, data);
  } catch (err) {
    return next(err);
  }
};
