import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { uploadAttachment, deleteUploadedFile } from './cloudinary.service.js';
import { triggerLessonRagDirectFileProcessing } from './rag.service.js';

const toAttachmentType = (mimeType) => {
  const normalized = String(mimeType || '').toLowerCase();
  if (!normalized) {
    return 'OTHER';
  }

  if (normalized === 'application/pdf') {
    return 'PDF';
  }

  if (normalized === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'DOCX';
  }

  if (normalized === 'text/plain') {
    return 'TXT';
  }

  const [major] = normalized.split('/');

  if (major === 'image') {
    return 'IMAGE';
  }

  if (major === 'video') {
    return 'VIDEO';
  }

  if (major === 'audio') {
    return 'AUDIO';
  }

  return 'OTHER';
};

const toRagFileType = (fileType) => String(fileType || 'OTHER').toLowerCase();

const toJsonSafeSize = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'bigint') {
    const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
    return value <= maxSafe ? Number(value) : value.toString();
  }

  return value;
};

const serializeAttachment = (attachment) => ({
  id: attachment.id,
  lessonId: attachment.lessonId,
  fileUrl: attachment.fileUrl,
  filePublicId: attachment.filePublicId,
  fileResourceType: attachment.fileResourceType,
  mimeType: attachment.mimeType,
  originalName: attachment.originalName,
  fileType: attachment.fileType,
  sizeBytes: toJsonSafeSize(attachment.sizeBytes),
  createdAt: attachment.createdAt,
});

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

export const createLessonAttachment = async ({ orgId, lessonId, file }) => {
  if (!file?.buffer) {
    throw new AppError('file is required', 400);
  }

  await ensureLessonBelongsToOrganization(orgId, lessonId);

  const uploaded = await uploadAttachment(file.buffer, {
    folder: 'learnova/lessons/attachments',
    use_filename: true,
    unique_filename: true,
    filename_override: file.originalname,
  });

  const mimeType = String(file.mimetype || '').toLowerCase() || null;
  const fileType = toAttachmentType(mimeType);

  const attachment = await prisma.lesson_attachment.create({
    data: {
      lessonId,
      fileUrl: uploaded.fileUrl,
      filePublicId: uploaded.filePublicId,
      fileResourceType: uploaded.fileResourceType,
      mimeType,
      originalName: file.originalname || null,
      fileType,
      sizeBytes: typeof file.size === 'number' ? BigInt(file.size) : null,
    },
  });

  try {
    await triggerLessonRagDirectFileProcessing({
      lessonId,
      organizationId: orgId,
      fileType: toRagFileType(fileType),
      sourceName: file.originalname,
      fileBuffer: file.buffer,
      mimeType,
    });
  } catch (error) {
    console.error(`RAG trigger failed for lesson attachment ${attachment.id}:`, error.message);
  }

  return serializeAttachment(attachment);
};

export const listLessonAttachments = async ({ orgId, lessonId }) => {
  await ensureLessonBelongsToOrganization(orgId, lessonId);

  const attachments = await prisma.lesson_attachment.findMany({
    where: { lessonId },
    orderBy: { id: 'asc' },
  });

  return attachments.map(serializeAttachment);
};

export const deleteLessonAttachment = async ({ orgId, lessonId, attachmentId }) => {
  const attachment = await prisma.lesson_attachment.findFirst({
    where: {
      id: attachmentId,
      lessonId,
      lesson: {
        subject: {
          course: {
            Org_id: orgId,
          },
        },
      },
    },
  });

  if (!attachment) {
    throw new AppError('Attachment not found or does not belong to this lesson', 404);
  }

  if (attachment.filePublicId) {
    await deleteUploadedFile(attachment.filePublicId, attachment.fileResourceType || 'raw');
  }

  await prisma.lesson_attachment.delete({
    where: { id: attachmentId },
  });

  return { id: attachmentId };
};
