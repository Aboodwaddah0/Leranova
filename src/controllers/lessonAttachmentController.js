import AppError from '../utils/appError.js';
import { attachmentIdParamSchema, lessonIdParamSchema } from '../validations/lessonValidation.js';
import {
  createLessonAttachment,
  listLessonAttachments,
  deleteLessonAttachment,
  retriggerLessonRagIngestion,
} from '../services/lessonAttachmentService.js';
import { verifyQdrantLessonChunks } from '../services/rag.service.js';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://rag-service:8000';

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
    const files = req.files?.length ? req.files : (req.file ? [req.file] : []);

    if (!files.length) {
      return next(new AppError('At least one file is required', 400));
    }

    const results = await Promise.all(
      files.map((file) => createLessonAttachment({ actor: req.user, lessonId, file }))
    );

    const attachments = results.map((r) => r.attachment);
    const warnings = results.map((r) => r.warning).filter(Boolean);

    return res.status(201).json({
      message: `${attachments.length} attachment(s) uploaded successfully`,
      data: attachments,
      warnings: warnings.length ? warnings : undefined,
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

export const getLessonRagStatusController = async (req, res, next) => {
  try {
    const lessonId = parseLessonId(req);
    const baseline = Number(req.query.baseline ?? 0);

    const [chunkCount, ragIngestionStatus] = await Promise.all([
      verifyQdrantLessonChunks(lessonId),
      fetch(`${RAG_SERVICE_URL}/ingest-status/${lessonId}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    const count = Number(chunkCount ?? 0);
    const ready = count > baseline;

    return res.status(200).json({
      lessonId,
      chunkCount: count,
      baseline,
      ready,
      status: ready ? 'ready' : (ragIngestionStatus?.status === 'failed' ? 'failed' : 'processing'),
      ingestion: ragIngestionStatus,
    });
  } catch (error) {
    return next(error);
  }
};

export const retriggerRagController = async (req, res, next) => {
  try {
    const lessonId = parseLessonId(req);
    const result = await retriggerLessonRagIngestion({ actor: req.user, lessonId });
    return res.status(200).json({ message: result.message, data: result });
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
