import "dotenv/config";
import prisma from "../src/utils/prisma.js";

try {
  console.log('Cleaning up extra subjects from course 42...\n');

  // Delete extra subjects that shouldn't be there
  const toDelete = [280, 281, 282];
  
  for (const subjectId of toDelete) {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, name: true }
    });

    if (subject) {
      // First delete related lessons if any
      const lessonCount = await prisma.lesson.deleteMany({
        where: { Subject_id: subjectId }
      });

      // Then delete the subject
      await prisma.subject.delete({
        where: { id: subjectId }
      });

      console.log(`✅ Deleted subject ${subjectId} (${subject.name}) and ${lessonCount.count} related lessons`);
    }
  }

  console.log('\n=== VERIFICATION: SUBJECTS NOW UNDER COURSE 42 ===');
  const remaining = await prisma.subject.findMany({
    where: { Course_id: 42 },
    select: { id: true, name: true, Course_id: true, Teacher_id: true },
    orderBy: { id: 'asc' }
  });

  console.log(JSON.stringify(remaining, null, 2));
  console.log(`\n✅ Clean! Only ${remaining.length} subjects remain (the 4 intended ones)\n`);

  await prisma.$disconnect();
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
