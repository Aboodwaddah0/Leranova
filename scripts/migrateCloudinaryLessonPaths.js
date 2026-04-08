import 'dotenv/config';
import prisma from '../src/utils/prisma.js';
import { configureCloudinary } from '../src/utils/cloudinary.js';
import { buildLessonUploadPublicId } from '../src/services/cloudinary.service.js';

const mapFileTypeToFolderType = (fileType) => {
  const normalized = String(fileType || '').toUpperCase();
  if (normalized === 'VIDEO') return 'video';
  if (normalized === 'PDF') return 'pdf';
  if (normalized === 'DOCX') return 'docx';
  if (normalized === 'TXT') return 'txt';
  return 'other';
};

const isAlreadyMigrated = (publicId) => String(publicId || '').startsWith('learnova/courses/');

const run = async () => {
  const cloudinary = configureCloudinary();
  const dryRun = !process.argv.includes('--apply');

  const attachments = await prisma.$queryRawUnsafe(`
    SELECT
      la.id,
      la.lessonId,
      la.fileUrl,
      la.filePublicId,
      la.fileResourceType,
      la.fileType,
      l.Subject_id AS subjectId,
      s.Course_id AS courseId
    FROM lesson_attachment la
    INNER JOIN lesson l ON l.id = la.lessonId
    INNER JOIN subject s ON s.id = l.Subject_id
    WHERE la.filePublicId IS NOT NULL
    ORDER BY la.id ASC
  `);

  let moved = 0;
  let skipped = 0;
  let failed = 0;

  for (const attachment of attachments) {
    const oldPublicId = attachment.filePublicId;
    if (!oldPublicId || isAlreadyMigrated(oldPublicId)) {
      skipped += 1;
      continue;
    }

    const lessonId = Number(attachment.lessonId);
    const subjectId = Number(attachment.subjectId);
    const courseId = Number(attachment.courseId);

    if (!lessonId || !subjectId || !courseId) {
      console.error('[MIGRATION ERROR] Missing relation context for attachment', { attachmentId: attachment.id });
      failed += 1;
      continue;
    }

    const targetType = mapFileTypeToFolderType(attachment.fileType);
    const newPublicId = buildLessonUploadPublicId({
      courseId,
      subjectId,
      lessonId,
      fileType: targetType,
    });

    if (dryRun) {
      console.info('[DRY RUN] would move', {
        attachmentId: attachment.id,
        from: oldPublicId,
        to: newPublicId,
      });
      moved += 1;
      continue;
    }

    try {
      const renamed = await cloudinary.uploader.rename(oldPublicId, newPublicId, {
        resource_type: attachment.fileResourceType || 'raw',
        overwrite: false,
        invalidate: true,
      });

      const secureUrl = renamed?.secure_url || attachment.fileUrl;

      await prisma.$executeRawUnsafe(
        'UPDATE lesson_attachment SET filePublicId = ?, fileUrl = ? WHERE id = ?',
        newPublicId,
        secureUrl,
        attachment.id,
      );

      moved += 1;
      console.info('[MIGRATION SUCCESS] moved', {
        attachmentId: attachment.id,
        from: oldPublicId,
        to: newPublicId,
      });
    } catch (error) {
      failed += 1;
      console.error('[MIGRATION ERROR] failed to move attachment', {
        attachmentId: attachment.id,
        from: oldPublicId,
        to: newPublicId,
        error: error.message,
      });
    }
  }

  console.info('[MIGRATION SUMMARY]', {
    total: attachments.length,
    moved,
    skipped,
    failed,
    dryRun,
  });

  await prisma.$disconnect();
};

run().catch(async (error) => {
  console.error('[MIGRATION FATAL]', error);
  await prisma.$disconnect();
  process.exit(1);
});
