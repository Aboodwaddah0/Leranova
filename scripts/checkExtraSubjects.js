import "dotenv/config";
import prisma from "../src/utils/prisma.js";

try {
  console.log('Checking if extra subjects have lessons...\n');

  // Check lessons in extra subjects
  for (const subjectId of [280, 281, 282]) {
    const lessons = await prisma.lesson.count({
      where: { Subject_id: subjectId }
    });

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, name: true }
    });

    console.log(`Subject ${subjectId} (${subject?.name}): ${lessons} lessons`);
  }

  await prisma.$disconnect();
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
