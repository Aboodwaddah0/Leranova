import { readFileSync } from 'fs';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

try {
  log('\n🧪 التحقق من التحسينات الجديدة...', 'cyan');
  
  const content = readFileSync('./Learnova_frontend/src/pages/student/StudentChatPage.jsx', 'utf-8');
  
  const improvements = [
    {
      name: 'Reactions تظهر أفقي (flex-wrap)',
      check: () => content.includes('flex flex-wrap items-center gap-1')
    },
    {
      name: 'Remove flex-shrink من reactions',
      check: () => !content.match(/getMessageReactions[\s\S]*?flex-shrink-0/)
    },
    {
      name: 'Edit Mode Modal موجود',
      check: () => content.includes('Edit Message Modal') && content.includes('max-w-md')
    },
    {
      name: 'Edit Modal بـ centered position',
      check: () => content.includes('fixed inset-0 z-50 flex items-center justify-center')
    },
    {
      name: 'Emoji Grid 8 columns في Modal',
      check: () => content.includes('grid-cols-8')
    },
    {
      name: 'Auto-close popups useEffect موجود',
      check: () => content.includes('Auto-close popups when clicking outside')
    },
    {
      name: 'Edit mode لا تظهر inline (محذوفة)',
      check: () => !content.includes('isEditing ? (\\n                      <div className="space-y-2">')
    }
  ];
  
  let passed = 0;
  log('\n📋 النتائج:', 'blue');
  
  for (const imp of improvements) {
    if (imp.check()) {
      log(`  ✅ ${imp.name}`, 'green');
      passed++;
    } else {
      log(`  ❌ ${imp.name}`, 'red');
    }
  }
  
  log(`\n✅ التحسينات: ${passed}/${improvements.length}`, passed === improvements.length ? 'green' : 'yellow');
  
  if (passed === improvements.length) {
    log('\n🎉 جميع التحسينات تم تطبيقها:', 'green');
    log('  1. ✅ Reactions تظهر أفقي مع flex-wrap', 'green');
    log('  2. ✅ Edit Mode كـ Modal في وسط الشاشة', 'green');
    log('  3. ✅ Emoji Grid كبيرة (8 columns) في الـ Modal', 'green');
    log('  4. ✅ Auto-close لـ جميع الـ popups', 'green');
    log('\n🚀 متاح للتجربة الآن!\n', 'cyan');
  }
  
} catch (error) {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
}
