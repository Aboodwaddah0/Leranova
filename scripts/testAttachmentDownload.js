const API_BASE = 'http://localhost:5000/api';

// Test helper
const loginAsStudent = async () => {
  try {
    const res = await fetch(`${API_BASE}/auth/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'academy_student@learnova.com',
        password: 'password123',
      }),
    });
    const data = await res.json();
    return data?.data?.token || null;
  } catch (error) {
    console.error('Login failed:', error.message);
    return null;
  }
};

const getStudentLessons = async (token) => {
  try {
    // Get courses  
    let res = await fetch(`${API_BASE}/my/courses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let data = await res.json();
    const courses = data?.data || [];
    
    if (courses.length === 0) {
      console.log('No courses found');
      return [];
    }

    const course = courses[0];
    console.log(`  Found course: ${course.id} - ${course.Name}`);

    // Get subjects
    res = await fetch(`${API_BASE}/courses/${course.id}/subjects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    data = await res.json();
    const subjects = data?.data || [];

    if (subjects.length === 0) {
      console.log('  No subjects found');
      return [];
    }

    const subject = subjects[0];
    console.log(`  Found subject: ${subject.id} - ${subject.name}`);

    // Get lessons
    res = await fetch(`${API_BASE}/subjects/${subject.id}/lessons`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    data = await res.json();
    return data?.data || [];
  } catch (error) {
    console.error('Failed to get lessons:', error.message);
    return [];
  }
};

const getAttachments = async (token, lessonId) => {
  try {
    const res = await fetch(`${API_BASE}/lessons/${lessonId}/assets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data?.data || [];
  } catch (error) {
    console.error(`Failed to get attachments for lesson ${lessonId}:`, error.message);
    return [];
  }
};

const testDownload = async (token, lessonId, attachmentId) => {
  try {
    console.log(`\n  📥 Testing download for attachment ${attachmentId} in lesson ${lessonId}...`);
    
    const response = await fetch(
      `${API_BASE}/lessons/${lessonId}/attachments/${attachmentId}/download`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log(`    Status: ${response.status}`);
    console.log(`    Content-Type: ${response.headers.get('content-type')}`);
    console.log(`    Content-Disposition: ${response.headers.get('content-disposition')}`);
    
    // Extract filename from header
    const dispHeader = response.headers.get('content-disposition');
    if (dispHeader) {
      const match = dispHeader.match(/filename="([^"]+)"/);
      if (match) {
        console.log(`    ✓ Filename from header: ${match[1]}`);
      }
    }

    if (response.ok) {
      const blob = await response.blob();
      console.log(`    ✓ File downloaded successfully (${blob.size} bytes)`);
      return true;
    } else {
      console.log(`    ✗ Download failed with status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('    ✗ Download test error:', error.message);
    return false;
  }
};


async function main() {
  console.log('🧪 Testing Lesson Attachment Download Endpoint\n');

  // Login
  console.log('1️⃣ Logging in as student...');
  const token = await loginAsStudent();
  if (!token) {
    console.error('Failed to login');
    return;
  }
  console.log('✓ Login successful\n');

  // Get lessons
  console.log('2️⃣ Fetching lessons with attachments...');
  const lessons = await getStudentLessons(token);
  
  if (lessons.length === 0) {
    console.log('No lessons found');
    return;
  }

  // Find a lesson with attachments
  let targetLesson = null;
  let targetAttachment = null;

  for (const lesson of lessons) {
    const attachments = await getAttachments(token, lesson.id);
    if (attachments.length > 0) {
      targetLesson = lesson;
      targetAttachment = attachments[0];
      console.log(`✓ Found lesson with attachments: ${lesson.id} - ${lesson.name}`);
      console.log(`  Attachment: ${targetAttachment.id} - ${targetAttachment.originalName}`);
      break;
    }
  }

  if (!targetLesson || !targetAttachment) {
    console.log('No attachments found in any lesson');
    return;
  }

  // Test download
  console.log('\n3️⃣ Testing download endpoint...');
  const success = await testDownload(token, targetLesson.id, targetAttachment.id);

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`  Download Endpoint: ${success ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`\n💡 Expected behavior on browser:
  - File download dialog appears
  - File saves with correct original name + extension
  - NOT with generic name like "course_42_subject_278_lesson_1455_pdf_177"`);
}

main().catch(console.error);
