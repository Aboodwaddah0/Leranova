import AppError from '../utils/appError.js';
import { attachmentIdParamSchema, lessonIdParamSchema } from '../validations/lessonValidation.js';
import {
  createLessonAttachment,
  listLessonAttachments,
  deleteLessonAttachment,
} from '../services/lessonAttachmentService.js';

const parseLessonId = (req) => {
  const lessonId = Number(req.params.lessonId);
  const { error } = lessonIdParamSchema.validate({ lessonId });

  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  return lessonId;
};

const parseAttachmentId = (req) => {
  const attachmentId = Number(req.params.attachmentId);
  const { error } = attachmentIdParamSchema.validate({ attachmentId });

  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  return attachmentId;
};

export const uploadLessonAttachmentController = async (req, res, next) => {
  try {
    const lessonId = parseLessonId(req);
    const { attachment, ingestion, warning } = await createLessonAttachment({
      actor: req.user,
      lessonId,
      file: req.file,
    });

    return res.status(201).json({
      message: 'Lesson attachment uploaded successfully',
      data: attachment,
      ingestion,
      warning,
    });
  } catch (error) {
    return next(error);
  }
};

export const listLessonAttachmentsController = async (req, res, next) => {
  try {
    const lessonId = parseLessonId(req);
    const attachments = await listLessonAttachments({
      actor: req.user,
      lessonId,
    });

    return res.status(200).json({
      message: 'Lesson attachments fetched successfully',
      total: attachments.length,
      data: attachments,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteLessonAttachmentController = async (req, res, next) => {
  try {
    const lessonId = parseLessonId(req);
    const attachmentId = parseAttachmentId(req);

    const deleted = await deleteLessonAttachment({
      actor: req.user,
      lessonId,
      attachmentId,
    });

    return res.status(200).json({
      message: 'Lesson attachment deleted successfully',
      data: deleted,
    });
  } catch (error) {
    return next(error);
  }
};
