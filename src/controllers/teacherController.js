import {
  createTeacher,
  getTeachers,
  getTeacherByIdForRequester,
  updateTeacher,
  updateMyTeacherProfile,
  deleteTeacher,
  getTeacherSubjects,
  getTeacherLessons,
  getMyTeacherProfile,
  getMyTeacherCourses,
  getMyTeacherSubjects,
  getMyTeacherLessons,
  getMyTeacherStudents,
} from '../services/teacherService.js';
import {
  createTeacherSchema,
  updateTeacherSchema,
  updateMyTeacherProfileSchema,
  teacherListQuerySchema,
  teacherLessonsQuerySchema,
  teacherStudentsQuerySchema,
} from '../validations/teacherValidation.js';
import AppError from '../utils/appError.js';

export const getMyTeacherProfileController = async (req, res, next) => {
  try {
    const profile = await getMyTeacherProfile(req.user.id);

    return res.status(200).json({
      message: 'Teacher profile fetched successfully',
      data: profile,
    });
  } catch (err) {
    next(err);
  }
};

export const getMySubjectsController = async (req, res, next) => {
  try {
    const subjects = await getMyTeacherSubjects(req.user.id);

    return res.status(200).json({
      message: 'Teacher subjects fetched successfully',
      total: subjects.length,
      data: subjects,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyCoursesController = async (req, res, next) => {
  try {
    const courses = await getMyTeacherCourses(req.user.id);

    return res.status(200).json({
      message: 'Teacher courses fetched successfully',
      total: courses.length,
      data: courses,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyLessonsController = async (req, res, next) => {
  try {
    const { error, value } = teacherLessonsQuerySchema.validate(req.query);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const lessons = await getMyTeacherLessons(req.user.id, value);

    return res.status(200).json({
      message: 'Teacher lessons fetched successfully',
      total: lessons.length,
      data: lessons,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyStudentsController = async (req, res, next) => {
  try {
    const { error, value } = teacherStudentsQuerySchema.validate(req.query);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const students = await getMyTeacherStudents(req.user.id, value);

    return res.status(200).json({
      message: 'Teacher students fetched successfully',
      total: students.length,
      data: students,
    });
  } catch (err) {
    next(err);
  }
};

export const createTeacherController = async (req, res, next) => {
  try {
    const { error, value } = createTeacherSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const orgId = req.user.id;
    const { teacher, tempPassword, registrationNumber } = await createTeacher(orgId, value);

    return res.status(201).json({
      message: 'Teacher created successfully',
      data: { ...teacher, tempPassword, registrationNumber },
    });
  } catch (err) {
    next(err);
  }
};

export const getTeachersController = async (req, res, next) => {
  try {
    const { error, value } = teacherListQuerySchema.validate(req.query);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const teachers = await getTeachers(req.user, value);
    const search = String(value.search || '').trim().toLowerCase();
    const filteredTeachers = search
      ? teachers.filter((teacher) => {
          const haystack = [teacher?.name, teacher?.specialization, teacher?.bio, teacher?.work, teacher?.user?.name]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return haystack.includes(search);
        })
      : teachers;

    return res.status(200).json({
      message: 'Teachers fetched successfully',
      total: filteredTeachers.length,
      data: filteredTeachers,
    });
  } catch (err) {
    next(err);
  }
};

export const updateMyTeacherProfileController = async (req, res, next) => {
  try {
    const { error, value } = updateMyTeacherProfileSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));
    const profile = await updateMyTeacherProfile(req.user.id, value);
    return res.status(200).json({ message: 'Profile updated successfully', data: profile });
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

    const teacher = await getTeacherByIdForRequester(req.user, teacherId);

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
