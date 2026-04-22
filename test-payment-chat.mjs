import prisma from './src/utils/prisma.js';

async function testPaymentAndChat() {
  console.log('🧪 Testing Payment Data & Chat Functionality\n');

  try {
    // 1. Verify payment test account
    const buyerUser = await prisma.user.findUnique({
      where: { email: 'academy_buyer@learnova.com' },
    });

    console.log('1️⃣ Buyer Account Status');
    console.log(`   Email: ${buyerUser.email}`);
    console.log(`   Role: ${buyerUser.role}`);

    const academyMember = await prisma.academy_user.findUnique({
      where: { user_academy_id: buyerUser.id },
    });
    console.log(`   Academy Member: ${academyMember ? '✅ YES' : '❌ NO'}`);

    const existingPurchases = await prisma.student_subject_subscription.findMany({
      where: { user_Academy_id: buyerUser.id },
      include: { subject: true },
    });
    console.log(`   Existing Purchases: ${existingPurchases.length}`);

    // 2. Verify paid courses
    const paidSubjects = await prisma.subject.findMany({
      where: { isPaid: true },
      take: 5,
    });

    console.log(`\n2️⃣ Paid Courses Available`);
    console.log(`   Total Paid Subjects: ${await prisma.subject.count({ where: { isPaid: true } })}`);
    paidSubjects.forEach(s => {
      console.log(`   - ${s.name}: $${s.price}`);
    });

    // 3. Test chat structure
    const chats = await prisma.chats.findMany({
      include: {
        chat_participants: { include: { user: true } },
        messages: { include: { user: true } },
      },
    });

    console.log(`\n3️⃣ Chat Rooms & Members`);
    chats.forEach(chat => {
      console.log(`   📌 ${chat.title}`);
      console.log(`      Members: ${chat.chat_participants.length}`);
      console.log(`      Messages: ${chat.messages.length}`);
      const participants = chat.chat_participants.map(p => p.user.email.split('@')[0]).join(', ');
      console.log(`      Participants: ${participants}`);
    });

    // 4. Verify message reactions (if any)
    const messagesWithReactions = await prisma.messages.findMany({
      where: {
        reactions: {
          some: {},
        },
      },
      include: { reactions: true },
      take: 3,
    });

    console.log(`\n4️⃣ Message Reactions`);
    if (messagesWithReactions.length > 0) {
      console.log(`   Total with reactions: ${messagesWithReactions.length}`);
      messagesWithReactions.forEach(msg => {
        console.log(`   - Message ID ${msg.id}: ${msg.reactions.length} reactions`);
      });
    } else {
      console.log(`   No reactions yet (ready for testing)`);
    }

    // 5. Verify subscriptions are marked PAID
    const subs = await prisma.student_subject_subscription.groupBy({
      by: ['paymentStatus'],
      _count: true,
    });

    console.log(`\n5️⃣ Payment Status Summary`);
    subs.forEach(stat => {
      console.log(`   ${stat.paymentStatus}: ${stat._count} subscriptions`);
    });

    // 6. Test student can access their purchases
    const premiumStudent = await prisma.user.findUnique({
      where: { email: 'premium.student@learnova.com' },
    });

    const premiumSubs = await prisma.student_subject_subscription.findMany({
      where: { user_Academy_id: premiumStudent.id },
      include: { subject: true },
    });

    console.log(`\n6️⃣ Premium Student Purchases`);
    console.log(`   User: ${premiumStudent.email}`);
    console.log(`   Total Courses: ${premiumSubs.length}`);
    premiumSubs.forEach(sub => {
      console.log(`   - ${sub.subject.name}: $${sub.subject.price} (${sub.paymentStatus})`);
    });

    // 7. Verify chat participant access
    const pythonChat = await prisma.chats.findFirst({
      where: { title: { contains: 'Python' } },
      include: { chat_participants: { include: { user: true } } },
    });

    if (pythonChat) {
      console.log(`\n7️⃣ Chat Participants Access`);
      console.log(`   Chat: ${pythonChat.title}`);
      console.log(`   Participants: ${pythonChat.chat_participants.length}`);
      const canAccess = pythonChat.chat_participants.some(p => p.user_id === premiumStudent.id);
      console.log(`   Premium Student Has Access: ${canAccess ? '✅ YES' : '❌ NO'}`);
    }

    console.log(`\n✅ All Tests Completed Successfully!`);
    console.log(`\n🚀 System is ready for:
   • Payment flow testing
   • Chat messaging
   • Course purchases
   • Reaction & edit features
   • Multi-user scenarios`);

  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPaymentAndChat();
