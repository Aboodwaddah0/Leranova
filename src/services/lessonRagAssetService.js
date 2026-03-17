import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { uploadLessonAssetFile } from './cloudinary.service.js';
import { triggerLessonRagDirectFileProcessing } from './rag.service.js';

const ALLOWED_FILE_TYPES = new Set(['pdf', 'docx', 'txt']);

const mapMimeTypeToAssetType = (mimeType) => {
  const normalized = String(mimeType || '').toLowerCase();

  if (normalized === 'application/pdf') {
    return 'pdf';
  }

  if (
    normalized ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }

  if (normalized === 'text/plain') {
    return 'txt';
  }

  return null;
};

const ensureLessonBelongsToOrganization = async (orgId, lessonId) => {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      subject: {
        course: {
          Org_id: orgId,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!lesson) {
    throw new AppError('Lesson not found or does not belong to your organization', 404);
  }
};

export const uploadLessonRagAsset = async ({ orgId, lessonId, file }) => {
  if (!file?.buffer) {
    throw new AppError('file is required', 400);
  }

  await ensureLessonBelongsToOrganization(orgId, lessonId);

  const type = mapMimeTypeToAssetType(file.mimetype);
  if (!type || !ALLOWED_FILE_TYPES.has(type)) {
    throw new AppError('Only pdf, docx, and txt files are allowed', 400);
  }

  const uploaded = await uploadLessonAssetFile(file.buffer, {
    folder: 'learnova/lessons/assets',
    use_filename: true,
    unique_filename: true,
    filename_override: file.originalname,
  });

  const asset = await prisma.lesson_rag_asset.create({
    data: {
      lessonId,
      type,
      fileUrl: uploaded.fileUrl,
      extractedText: null,
      sourceName: file.originalname,
    },
  });

  try {
    await triggerLessonRagDirectFileProcessing({
      lessonId,
      organizationId: orgId,
      fileType: type,
      sourceName: file.originalname,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
    });
  } catch (error) {
    console.error(`RAG trigger failed for lesson asset ${asset.id}:`, error.message);
  }

  return {
    id: asset.id,
    lessonId: asset.lessonId,
    type: asset.type,
    fileUrl: asset.fileUrl,
    extractedText: asset.extractedText,
    sourceName: asset.sourceName,
    createdAt: asset.createdAt,
  };
};
