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
  log('\n🔍 التحقق من الـ fixes:', 'cyan');
  
  const content = readFileSync('./Learnova_frontend/src/pages/student/StudentChatPage.jsx', 'utf-8');
  
  const fixes = [
    {
      name: 'عند الضغط على 3-dot menu → إغلاق reaction picker',
      check: () => content.includes('setReactionPickerForMessageId(null);\n                              setMessageMenuId')
    },
    {
      name: 'عند الضغط على reaction emoji → إغلاق 3-dot menu',
      check: () => content.includes('setMessageMenuId(null);\n                              setReactionPickerForMessageId')
    },
    {
      name: 'Emoji picker بدون max-w constraint (أفقي)',
      check: () => !content.includes('max-w-[220px]')
    },
    {
      name: 'Emoji picker بـ flex-wrap للعرض الأفقي',
      check: () => content.includes('absolute top-7 z-10 flex flex-wrap')
    },
    {
      name: 'Reactions بـ whitespace-nowrap',
      check: () => content.match(/class.*whitespace-nowrap.*reaction/)
    },
    {
      name: 'Reactions بـ flex-shrink-0',
      check: () => content.match(/class.*flex-shrink-0.*reaction/)
    },
    {
      name: 'No multiple popups open simultaneously',
      check: () => content.includes('setReactionPickerForMessageId(null);') &&
                   content.includes('setMessageMenuId(null);') &&
                   content.match(/setReactionPickerForMessageId.*setMessageMenuId|setMessageMenuId.*setReactionPickerForMessageId/s)
    }
  ];
  
  let passed = 0;
  log('\n📋 نتائج الـ fixes:', 'blue');
  
  for (const fix of fixes) {
    if (fix.check()) {
      log(`  ✅ ${fix.name}`, 'green');
      passed++;
    } else {
      log(`  ❌ ${fix.name}`, 'red');
    }
  }
  
  log(`\n✅ الـ Fixes: ${passed}/${fixes.length}`, passed === fixes.length ? 'green' : 'yellow');
  
  if (passed === fixes.length) {
    log('\n🎉 جميع الـ fixes تم تطبيقها:', 'green');
    log('  1. ✅ عند فتح 3-dot menu → reaction picker ينسد', 'green');
    log('  2. ✅ عند فتح reaction picker → 3-dot menu ينسد', 'green');
    log('  3. ✅ Emoji picker أفقي (بدون max-width)', 'green');
    log('  4. ✅ Reactions أفقي مع whitespace-nowrap', 'green');
    log('  5. ✅ ما فيش فوضى من popups مفتوحة معاً', 'green');
    log('\n🚀 الآن بتشتغل بدون مشاكل!\n', 'cyan');
  }
  
} catch (error) {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
}
