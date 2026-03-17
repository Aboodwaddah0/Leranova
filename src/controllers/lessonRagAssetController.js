import AppError from '../utils/appError.js';
import { lessonIdParamSchema } from '../validations/lessonValidation.js';
import { uploadLessonRagAsset } from '../services/lessonRagAssetService.js';

const parseLessonId = (req) => {
  const lessonId = Number(req.params.lessonId);
  const { error } = lessonIdParamSchema.validate({ lessonId });

  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  return lessonId;
};

export const uploadLessonAssetController = async (req, res, next) => {
  try {
    const lessonId = parseLessonId(req);
    const asset = await uploadLessonRagAsset({
      orgId: req.user.id,
      lessonId,
      file: req.file,
    });

    return res.status(201).json({
      message: 'Lesson asset uploaded successfully',
      data: asset,
    });
  } catch (error) {
    return next(error);
  }
};
