import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

const tests = {
  loginAccounts: {
    testBuyer: 'test.buyer.one@learnova.com',
    academyBuyer: 'academy_buyer@learnova.com',
    schoolStudent: 'student.school.g10@learnova.com',
    academyStudent: 'student.academy.one@learnova.com',
  },
  password: '12345678',
};

async function testLogin(email, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.token) {
      return { success: true, token: data.token, user: data.user };
    }
    return { success: false, error: data.error };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function testGetCourses(token) {
  try {
    const res = await fetch(`${API_BASE}/academy/courses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function testGetChats(token) {
  try {
    const res = await fetch(`${API_BASE}/chat/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function runTests() {
  console.log('🧪 Starting System Tests...\n');

  // Test 1: Login with Academy Buyer
  console.log('📝 Test 1: Academy Buyer Login');
  const buyerLogin = await testLogin(tests.loginAccounts.academyBuyer, tests.password);
  if (buyerLogin.success) {
    console.log('✅ Login successful');
    console.log('   User:', buyerLogin.user.email);
    console.log('   Role:', buyerLogin.user.role);

    // Test 2: Get courses (should show paid courses)
    console.log('\n💰 Test 2: Get Paid Courses');
    const coursesResult = await testGetCourses(buyerLogin.token);
    if (coursesResult.success) {
      const paidCourses = coursesResult.data.filter(c => c.isPaid);
      console.log(`✅ Found ${coursesResult.data.length} courses (${paidCourses.length} paid)`);
      console.log('   Sample paid courses:');
      paidCourses.slice(0, 3).forEach(c => {
        console.log(`   - ${c.Name}: $${c.price}`);
      });
    } else {
      console.log('❌ Failed to get courses:', coursesResult.error);
    }

    // Test 3: Get chats
    console.log('\n💬 Test 3: Get Chat Rooms');
    const chatsResult = await testGetChats(buyerLogin.token);
    if (chatsResult.success) {
      console.log(`✅ Found ${chatsResult.data.length} chats`);
      chatsResult.data.forEach(chat => {
        console.log(`   - ${chat.title} (${chat.participants} participants)`);
      });
    } else {
      console.log('❌ Failed to get chats:', chatsResult.error);
    }
  } else {
    console.log('❌ Login failed:', buyerLogin.error);
  }

  // Test 4: Test Academy Student (with existing subscription)
  console.log('\n\n🎓 Test 4: Academy Student (Already Subscribed)');
  const studentLogin = await testLogin(tests.loginAccounts.academyStudent, tests.password);
  if (studentLogin.success) {
    console.log('✅ Login successful');
    console.log('   User:', studentLogin.user.email);
    console.log('   Subscriptions should be pre-loaded');
  } else {
    console.log('❌ Login failed:', studentLogin.error);
  }

  // Test 5: Test School Student
  console.log('\n\n🏫 Test 5: School Student');
  const schoolLogin = await testLogin(tests.loginAccounts.schoolStudent, tests.password);
  if (schoolLogin.success) {
    console.log('✅ Login successful');
    console.log('   User:', schoolLogin.user.email);

    const schoolChats = await testGetChats(schoolLogin.token);
    if (schoolChats.success) {
      console.log(`✅ Access to ${schoolChats.data.length} school chats`);
    }
  } else {
    console.log('❌ Login failed:', schoolLogin.error);
  }

  console.log('\n\n✅ System Test Complete!');
}

runTests().catch(console.error);
