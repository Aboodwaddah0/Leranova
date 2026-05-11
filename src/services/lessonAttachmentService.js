import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import {
  uploadAttachment,
  deleteUploadedFile,
  buildLessonUploadPublicId,
} from './cloudinary.service.js';
import { triggerLessonRagIngestion } from './rag.service.js';
import { resolveStudentContext } from './studentExperienceService.js';

const toRole = (value) => String(value || '').trim().toUpperCase();

const resolveAttachmentScope = async (actor) => {
  const role = toRole(actor?.role);

  if (role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({
      where: { Teacher_id: actor.id },
      select: { Teacher_id: true, OrgId: true },
    });

    if (!teacher) {
      throw new AppError('Teacher profile not found', 404);
    }

    return {
      role,
      orgId: teacher.OrgId,
      teacherId: teacher.Teacher_id,
    };
  }

  if (role === 'ACADEMY' || role === 'SCHOOL') {
    return {
      role,
      orgId: actor.id,
      teacherId: null,
    };
  }

  if (role === 'STUDENT') {
    const context = await resolveStudentContext(actor.id);

    return {
      role,
      orgId: context.orgId,
      teacherId: null,
      userId: actor.id,
      studentMode: context.mode,
      classCourseId: context.mode === 'SCHOOL' ? context.classCourseId : null,
    };
  }

  throw new AppError('Access denied. Teacher, student, or organization account required.', 403);
};

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

const serializeAttachment = (attachment, context = {}) => {
  return {
    id: attachment.id,
    lessonId: attachment.lessonId,
    subjectId: context.subjectId ?? null,
    courseId: context.courseId ?? null,
    fileUrl: attachment.fileUrl,
    filePublicId: attachment.filePublicId,
    fileResourceType: attachment.fileResourceType,
    url: attachment.fileUrl,
    public_id: attachment.filePublicId,
    resource_type: attachment.fileResourceType,
    mimeType: attachment.mimeType,
    originalName: attachment.originalName,
    name: attachment.originalName,
    fileType: attachment.fileType,
    type: String(attachment.fileType || '').toLowerCase(),
    sizeBytes: toJsonSafeSize(attachment.sizeBytes),
    createdAt: attachment.createdAt,
  };
};

const mapFileTypeToIngestionType = (fileType) => {
  const normalized = String(fileType || '').toUpperCase();
  if (normalized === 'VIDEO') return 'video';
  if (normalized === 'PDF') return 'pdf';
  if (normalized === 'DOCX') return 'docx';
  if (normalized === 'TXT') return 'txt';
  return null;
};

const ensureLessonBelongsToOrganization = async (scope, lessonId) => {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      subject: {
        ...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
        ...(scope.role === 'STUDENT' && scope.studentMode === 'SCHOOL'
          ? { Course_id: scope.classCourseId }
          : {}),
        ...(scope.role === 'STUDENT' && scope.studentMode === 'ACADEMY'
          ? {
              subscriptions: {
                some: {
                  user_Academy_id: scope.userId,
                  OR: [
                    { paymentStatus: 'PAID' },
                    { status: 'PAID' },
                    { status: 'SUCCESS' },
                  ],
                },
              },
            }
          : {}),
        course: {
          Org_id: scope.orgId,
        },
      },
    },
    select: {
      id: true,
      Subject_id: true,
      subject: {
        select: {
          id: true,
          Course_id: true,
        },
      },
    },
  });

  if (!lesson) {
    throw new AppError('Lesson not found or does not belong to your organization', 404);
  }

  return {
    lessonId: lesson.id,
    subjectId: lesson.subject?.id || lesson.Subject_id,
    courseId: lesson.subject?.Course_id,
  };
};

export const createLessonAttachment = async ({ actor, lessonId, file }) => {
  if (!file?.buffer) {
    throw new AppError('file is required', 400);
  }

  const scope = await resolveAttachmentScope(actor);
  if (scope.role === 'STUDENT') {
    throw new AppError('Students cannot upload lesson attachments', 403);
  }

  const lessonContext = await ensureLessonBelongsToOrganization(scope, lessonId);

  const mimeType = String(file.mimetype || '').toLowerCase() || null;
  const fileType = toAttachmentType(mimeType);
  const ingestionFileType = mapFileTypeToIngestionType(fileType);

  const cloudinaryPublicId = buildLessonUploadPublicId({
    courseId: lessonContext.courseId,
    subjectId: lessonContext.subjectId,
    lessonId,
    fileType: ingestionFileType || String(fileType).toLowerCase(),
  });

  const uploaded = await uploadAttachment(file.buffer, {
    resource_type: 'auto',
    public_id: cloudinaryPublicId,
    unique_filename: false,
    overwrite: false,
  });

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

  let warning = null;

  if (ingestionFileType) {
    triggerLessonRagIngestion({
      fileUrl: uploaded.fileUrl,
      fileType: ingestionFileType,
      organizationId: scope.orgId,
      courseId: lessonContext.courseId,
      subjectId: lessonContext.subjectId,
      lessonId,
    }).catch((error) => {
      console.error('[RAG ERROR] ingestion failed', {
        lessonId,
        subjectId: lessonContext.subjectId,
        courseId: lessonContext.courseId,
        fileType: ingestionFileType,
        error: error.message,
      });
    });
  } else {
    warning = {
      code: 'RAG_FILE_TYPE_UNSUPPORTED',
      message: 'File uploaded but skipped RAG ingestion due to unsupported type.',
      details: `Unsupported type: ${fileType}`,
    };
    console.warn('[RAG ERROR] ingestion failed', {
      lessonId,
      subjectId: lessonContext.subjectId,
      courseId: lessonContext.courseId,
      fileType,
      error: 'Unsupported file type for ingestion',
    });
  }

  return {
    attachment: serializeAttachment(attachment, lessonContext),
    ingestion: ingestionFileType ? {
      status: 'queued',
      fileType: ingestionFileType,
      courseId: lessonContext.courseId,
      subjectId: lessonContext.subjectId,
      lessonId,
    } : null,
    warning,
  };
};

export const retriggerLessonRagIngestion = async ({ actor, lessonId }) => {
  const scope = await resolveAttachmentScope(actor);
  if (scope.role === 'STUDENT') {
    throw new AppError('Students cannot trigger RAG ingestion', 403);
  }

  const lessonContext = await ensureLessonBelongsToOrganization(scope, lessonId);

  const attachments = await prisma.lesson_attachment.findMany({
    where: { lessonId },
    orderBy: { id: 'asc' },
  });

  const ingestable = attachments.filter((a) => mapFileTypeToIngestionType(a.fileType));

  if (!ingestable.length) {
    return { triggered: 0, message: 'No ingestable attachments found for this lesson.' };
  }

  let triggered = 0;
  for (const att of ingestable) {
    const ingestionFileType = mapFileTypeToIngestionType(att.fileType);
    triggerLessonRagIngestion({
      fileUrl: att.fileUrl,
      fileType: ingestionFileType,
      organizationId: scope.orgId,
      courseId: lessonContext.courseId,
      subjectId: lessonContext.subjectId,
      lessonId,
    }).catch((err) => {
      console.error('[RAG RETRIGGER ERROR]', { lessonId, attachmentId: att.id, error: err.message });
    });
    triggered += 1;
  }

  return { triggered, message: `RAG ingestion re-triggered for ${triggered} file(s).` };
};

export const listLessonAttachments = async ({ actor, lessonId }) => {
  const scope = await resolveAttachmentScope(actor);
  await ensureLessonBelongsToOrganization(scope, lessonId);

  const attachments = await prisma.lesson_attachment.findMany({
    where: { lessonId },
    orderBy: { id: 'asc' },
  });

  return attachments.map(serializeAttachment);
};

export const deleteLessonAttachment = async ({ actor, lessonId, attachmentId }) => {
  const scope = await resolveAttachmentScope(actor);
  if (scope.role === 'STUDENT') {
    throw new AppError('Students cannot delete lesson attachments', 403);
  }

  const attachment = await prisma.lesson_attachment.findFirst({
    where: {
      id: attachmentId,
      lessonId,
      lesson: {
        subject: {
          ...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
          course: {
            Org_id: scope.orgId,
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


