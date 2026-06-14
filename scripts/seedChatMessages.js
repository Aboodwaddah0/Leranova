/**
 * seedChatMessages.js
 * Creates GROUP chats and seeds realistic fake messages for test orgs.
 *
 * Works with any org that has teachers + subjects. Finds them automatically.
 *
 * Usage:
 *   docker exec learnova-api node scripts/seedChatMessages.js
 */

import "dotenv/config";
import prisma from "../src/utils/prisma.js";

const log = (msg) => console.log(`[CHAT-SEED] ${msg}`);

const CONVO_TEMPLATES = [
  [
    { role: "teacher", text: "Good morning everyone! Welcome to today's session. 👋" },
    { role: "student", text: "Good morning! Ready to learn 😊" },
    { role: "student", text: "Morning! Looking forward to it" },
    { role: "teacher", text: "Great! Today we'll cover the main concepts. Please make sure you've reviewed last week's material." },
    { role: "student", text: "I had a question about the homework. Can you explain step 3 again?" },
    { role: "teacher", text: "Of course! Step 3 is about applying the formula to the given data. Let me break it down for you..." },
    { role: "student", text: "That makes much more sense now, thank you! 🙏" },
    { role: "student", text: "Same question here, thanks for clarifying!" },
  ],
  [
    { role: "teacher", text: "Hi class! I've uploaded the notes for this week. Check the resources section." },
    { role: "student", text: "Thanks! I saw them, very helpful 📚" },
    { role: "student", text: "When is the assignment due?" },
    { role: "teacher", text: "The assignment is due next Friday at 11:59 PM. No late submissions." },
    { role: "student", text: "Got it, I'll start today 📝" },
    { role: "student", text: "Is it okay to work in groups?" },
    { role: "teacher", text: "Yes, groups of up to 3 are allowed. Just make sure each person submits their own copy." },
    { role: "student", text: "Perfect, thanks! 👍" },
  ],
  [
    { role: "teacher", text: "Great work on last week's quiz everyone! The average was 78%. 🎉" },
    { role: "student", text: "Yay! I was worried about it" },
    { role: "student", text: "Could we see the correct answers?" },
    { role: "teacher", text: "I'll post the answer key shortly. Focus on questions 4 and 7 — those were the hardest." },
    { role: "student", text: "Question 7 really got me 😅" },
    { role: "student", text: "Same! I guessed on that one haha" },
    { role: "teacher", text: "Let's go over it in class. It's an important concept that will come up again in the final." },
    { role: "student", text: "Thank you for always explaining things clearly! 🙌" },
  ],
  [
    { role: "teacher", text: "Reminder: class starts at 9:00 AM sharp tomorrow. Please be on time." },
    { role: "student", text: "Will the session be recorded?" },
    { role: "teacher", text: "Yes, I'll upload the recording to the course materials within 24 hours." },
    { role: "student", text: "That's great! Sometimes I miss things when taking notes quickly" },
    { role: "student", text: "Is there anything specific we should prepare?" },
    { role: "teacher", text: "Please review chapters 3 and 4 beforehand. We'll jump straight into examples." },
    { role: "student", text: "Got it! See you tomorrow 📖" },
  ],
  [
    { role: "student", text: "Quick question — is the textbook available online?" },
    { role: "teacher", text: "Yes! There's a PDF version in the course resources. Check the pinned message." },
    { role: "student", text: "Found it, thanks! 😄" },
    { role: "student", text: "Also, will there be extra credit opportunities this term?" },
    { role: "teacher", text: "I'm planning a bonus project for those interested. Details coming next week." },
    { role: "student", text: "That sounds awesome! Count me in 🙋" },
    { role: "student", text: "Me too!" },
    { role: "teacher", text: "Great enthusiasm! More details soon. Keep up the good work everyone 💪" },
  ],
];

const run = async () => {
  await prisma.$connect();
  log("Connected to database");

  // Find all orgs with teachers
  const orgs = await prisma.organization.findMany({
    where: { status: "APPROVED" },
    select: { id: true, Name: true, Role: true },
  });

  if (!orgs.length) { log("No approved orgs found."); return; }

  let totalChats = 0;
  let totalMessages = 0;

  for (const org of orgs) {
    log(`Processing org: ${org.Name} (id=${org.id}, type=${org.Role})`);

    // Get all teachers in this org
    const teachers = await prisma.teacher.findMany({
      where: { OrgId: org.id },
      select: { Teacher_id: true },
    });
    if (!teachers.length) { log(`  No teachers — skipping`); continue; }

    // Get all subjects taught by teachers in this org
    const teacherIds = teachers.map((t) => t.Teacher_id);
    const subjects = await prisma.course.findMany({
      where: { Teacher_id: { in: teacherIds } },
      select: { id: true, name: true, Course_id: true, Teacher_id: true },
    });
    if (!subjects.length) { log(`  No subjects — skipping`); continue; }

    // Get students in this org
    const schoolStudents = await prisma.student.findMany({
      where: { OrgId: org.id, AcademicStatus: "ACTIVE" },
      select: { Student_id: true, Course_id: true },
    });
    const academyStudents = await prisma.academy_user.findMany({
      where: { OrgId: org.id, AcademicStatus: "ACTIVE" },
      select: { user_academy_id: true },
      take: 20,
    });
    const allStudentIds = [
      ...schoolStudents.map((s) => s.Student_id),
      ...academyStudents.map((s) => s.user_academy_id),
    ];

    for (let sIdx = 0; sIdx < subjects.length; sIdx++) {
      const subj = subjects[sIdx];

      // Find or create GROUP chat for this subject
      let chat = await prisma.chats.findFirst({
        where: { organization_id: org.id, subject_id: subj.id, type: "GROUP" },
        select: { id: true },
      });

      if (!chat) {
        chat = await prisma.chats.create({
          data: {
            organization_id: org.id,
            subject_id:      subj.id,
            type:            "GROUP",
            title:           subj.name,
            created_by:      subj.Teacher_id,
          },
          select: { id: true },
        });
        log(`  Created chat for subject "${subj.name}" (chatId=${chat.id})`);
        totalChats++;
      } else {
        // Check if already has messages
        const existing = await prisma.messages.count({ where: { chat_id: chat.id } });
        if (existing > 0) { log(`  Chat ${chat.id} already has messages — skipping`); continue; }
      }

      // Add teacher as participant
      await prisma.chat_participants.upsert({
        where:  { chat_id_user_id: { chat_id: chat.id, user_id: subj.Teacher_id } },
        create: { chat_id: chat.id, user_id: subj.Teacher_id, role_in_chat: "admin" },
        update: {},
      });

      // Add students as participants (students in this class/track)
      const classStudentIds = schoolStudents
        .filter((s) => s.Course_id === subj.Course_id)
        .map((s) => s.Student_id);
      const participantIds = classStudentIds.length
        ? classStudentIds
        : allStudentIds.slice(0, 5);

      for (const sid of participantIds) {
        await prisma.chat_participants.upsert({
          where:  { chat_id_user_id: { chat_id: chat.id, user_id: sid } },
          create: { chat_id: chat.id, user_id: sid, role_in_chat: "member" },
          update: {},
        });
      }

      // Pick a conversation template (rotate through them)
      const template = CONVO_TEMPLATES[sIdx % CONVO_TEMPLATES.length];
      const teacherId = subj.Teacher_id;

      // Pick 2-3 student IDs for this conversation
      const convoStudents = participantIds.slice(0, 3);
      let studentPickIdx = 0;

      // Seed messages with staggered timestamps (oldest first)
      const baseTime = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const intervalMs = 4 * 60 * 1000; // 4 minutes between messages

      for (let mIdx = 0; mIdx < template.length; mIdx++) {
        const tmpl = template[mIdx];
        let senderId;
        if (tmpl.role === "teacher") {
          senderId = teacherId;
        } else {
          senderId = convoStudents[studentPickIdx % convoStudents.length];
          studentPickIdx++;
        }
        if (!senderId) continue;

        const sentAt = new Date(baseTime.getTime() + mIdx * intervalMs);
        await prisma.messages.create({
          data: {
            chat_id:       chat.id,
            sender_user_id: senderId,
            content:       tmpl.text,
            message_type:  "text",
            sent_at:       sentAt,
            is_seen:       mIdx < template.length - 2, // last 2 messages unread
          },
        });
        totalMessages++;
      }

      log(`  Seeded ${template.length} messages in chat ${chat.id} ("${subj.name}")`);
    }
  }

  console.log(`
╔══════════════════════════════════════════════════════╗
║           CHAT SEED COMPLETE ✓                       ║
╠══════════════════════════════════════════════════════╣
║  Chats created:   ${String(totalChats).padEnd(32)}║
║  Messages seeded: ${String(totalMessages).padEnd(32)}║
╚══════════════════════════════════════════════════════╝
`);

  await prisma.$disconnect();
};

run().catch((err) => {
  console.error("[CHAT-SEED] Error:", err.message);
  prisma.$disconnect();
  process.exit(1);
});
