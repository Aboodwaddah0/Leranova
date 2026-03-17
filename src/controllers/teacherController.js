import {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getTeacherSubjects,
  getTeacherLessons,
} from '../services/teacherService.js';
import {
  createTeacherSchema,
  updateTeacherSchema,
} from '../validations/teacherValidation.js';
import AppError from '../utils/appError.js';

export const createTeacherController = async (req, res, next) => {
  try {
    const { error, value } = createTeacherSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const orgId = req.user.id;
    const teacher = await createTeacher(orgId, value);

    return res.status(201).json({
      message: 'Teacher created successfully',
      data: teacher,
    });
  } catch (err) {
    next(err);
  }
};

export const getTeachersController = async (req, res, next) => {
  try {
    const orgId = req.user.id;
    const teachers = await getTeachers(orgId);

    return res.status(200).json({
      message: 'Teachers fetched successfully',
      total: teachers.length,
      data: teachers,
    });
  } catch (err) {
    next(err);
  }
};

export const getTeacherByIdController = async (req, res, next) => {
  try {
    const teacherId = Number(req.params.id);

    if (Number.isNaN(teacherId)) {
      return next(new AppError('Invalid teacher id', 400));
    }

    const orgId = req.user.id;
    const teacher = await getTeacherById(orgId, teacherId);

    return res.status(200).json({
      message: 'Teacher fetched successfully',
      data: teacher,
    });
  } catch (err) {
    next(err);
  }
};

export const updateTeacherController = async (req, res, next) => {
  try {
    const teacherId = Number(req.params.id);

    if (Number.isNaN(teacherId)) {
      return next(new AppError('Invalid teacher id', 400));
    }

    const { error, value } = updateTeacherSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const orgId = req.user.id;
    const teacher = await updateTeacher(orgId, teacherId, value);

    return res.status(200).json({
      message: 'Teacher updated successfully',
      data: teacher,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTeacherController = async (req, res, next) => {
  try {
    const teacherId = Number(req.params.id);

    if (Number.isNaN(teacherId)) {
      return next(new AppError('Invalid teacher id', 400));
    }

    const orgId = req.user.id;
    const result = await deleteTeacher(orgId, teacherId);

    return res.status(200).json({
      message: 'Teacher deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getTeacherSubjectsController = async (req, res, next) => {
  try {
    const teacherId = Number(req.params.id);

    if (Number.isNaN(teacherId)) {
      return next(new AppError('Invalid teacher id', 400));
    }

    const orgId = req.user.id;
    const subjects = await getTeacherSubjects(orgId, teacherId);

    return res.status(200).json({
      message: 'Teacher subjects fetched successfully',
      total: subjects.length,
      data: subjects,
    });
  } catch (err) {
    next(err);
  }
};

export const getTeacherLessonsController = async (req, res, next) => {
  try {
    const teacherId = Number(req.params.id);

    if (Number.isNaN(teacherId)) {
      return next(new AppError('Invalid teacher id', 400));
    }

    const orgId = req.user.id;
    const lessons = await getTeacherLessons(orgId, teacherId);

    return res.status(200).json({
      message: 'Teacher lessons fetched successfully',
      total: lessons.length,
      data: lessons,
    });
  } catch (err) {
    next(err);
  }
};
