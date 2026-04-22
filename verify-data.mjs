import prisma from './src/utils/prisma.js';

async function verifyData() {
  console.log('🔍 Verifying Database Data...\n');

  try {
    // Count organizations
    const orgs = await prisma.organization.findMany();
    console.log(`✅ Organizations: ${orgs.length}`);
    orgs.forEach(o => console.log(`   - ${o.Name} (${o.Role})`));

    // Count paid courses
    const paidCourses = await prisma.course.findMany({ where: { isPaid: true } });
    console.log(`\n✅ Paid Courses: ${paidCourses.length}`);
    paidCourses.slice(0, 5).forEach(c => console.log(`   - ${c.Name}: $${c.price}`));

    // Count students
    const students = await prisma.student.findMany();
    console.log(`\n✅ School Students: ${students.length}`);

    // Count academy users
    const academyUsers = await prisma.academy_user.findMany();
    console.log(`✅ Academy Users: ${academyUsers.length}`);

    // Count subject subscriptions (paid)
    const subscriptions = await prisma.student_subject_subscription.findMany();
    console.log(`\n✅ Subject Subscriptions (Paid): ${subscriptions.length}`);
    subscriptions.slice(0, 3).forEach(s => console.log(`   - Amount: $${s.amount}, Status: ${s.paymentStatus}`));

    // Count course payments
    const payments = await prisma.student_course_payment.findMany();
    console.log(`✅ Course Payments: ${payments.length}`);
    payments.slice(0, 3).forEach(p => console.log(`   - Amount: $${p.amount}, Status: ${p.status}`));

    // Count chats
    const chats = await prisma.chats.findMany({ include: { chat_participants: true, messages: true } });
    console.log(`\n✅ Chat Rooms: ${chats.length}`);
    chats.forEach(c => console.log(`   - ${c.title} (${c.chat_participants.length} members, ${c.messages.length} messages)`));

    // Count messages
    const messages = await prisma.messages.findMany();
    console.log(`\n✅ Total Messages: ${messages.length}`);

    // Verify paid subjects
    const paidSubjects = await prisma.subject.findMany({ where: { isPaid: true } });
    console.log(`✅ Paid Subjects: ${paidSubjects.length}`);
    paidSubjects.slice(0, 5).forEach(s => console.log(`   - ${s.name}: $${s.price}`));

    // Test Users
    console.log(`\n👥 Test Accounts Available:`);
    const testEmails = [
      'academy_buyer@learnova.com',
      'test.buyer.one@learnova.com',
      'test.buyer.two@learnova.com',
      'student.academy.one@learnova.com',
      'student.school.g10@learnova.com',
    ];
    
    for (const email of testEmails) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        console.log(`   ✅ ${email} (${user.role})`);
      }
    }

    console.log(`\n✅ Database Verification Complete!`);
    console.log(`\n🧪 Ready for Testing:`);
    console.log(`   Password for all accounts: 12345678`);
    console.log(`   Frontend: http://localhost:5173`);
    console.log(`   API: http://localhost:5000`);
    console.log(`   RAG Service: http://localhost:8000`);
    console.log(`   Chat Service: WebSocket on :5000`);

  } catch (err) {
    console.error('❌ Verification failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();
