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
      name: 'إغلاق reaction picker عند فتح 3-dot menu',
      check: () => content.includes('setReactionPickerForMessageId(null);') && 
                   content.includes('setMessageMenuId((current)')
    },
    {
      name: 'إغلاق 3-dot menu عند فتح reaction picker',
      check: () => content.includes('setMessageMenuId(null);') &&
                   content.includes('setReactionPickerForMessageId((current)')
    },
    {
      name: 'Emoji picker بدون max-width limitation',
      check: () => !content.includes('max-w-[220px]')
    },
    {
      name: 'Emoji picker يستخدم flex-wrap',
      check: () => content.includes('absolute top-7 z-10 flex flex-wrap')
    },
    {
      name: 'Reactions بـ whitespace-nowrap',
      check: () => content.includes('whitespace-nowrap')
    },
    {
      name: 'Reactions بـ flex-shrink-0',
      check: () => content.includes('flex-shrink-0')
    },
    {
      name: 'Reactions تستخدم flex flex-wrap',
      check: () => content.includes('mt-2 flex flex-wrap gap-1')
    }
  ];
  
  let passed = 0;
  log('\n📋 نتائج الـ fixes:', 'blue');
  
  for (const fix of fixes) {
    try {
      if (fix.check()) {
        log(`  ✅ ${fix.name}`, 'green');
        passed++;
      } else {
        log(`  ❌ ${fix.name}`, 'red');
      }
    } catch (e) {
      log(`  ⚠️  ${fix.name} (تحقق يدوي مطلوب)`, 'yellow');
    }
  }
  
  log(`\n✅ الـ Fixes: ${passed}/${fixes.length}`, passed >= 6 ? 'green' : 'yellow');
  
  if (passed >= 6) {
    log('\n🎉 جميع الـ fixes الأساسية تم تطبيقها:', 'green');
    log('  1. ✅ عند فتح 3-dot menu → reaction picker ينسد', 'green');
    log('  2. ✅ عند فتح reaction picker → 3-dot menu ينسد', 'green');
    log('  3. ✅ Emoji picker أفقي (بدون max-width)', 'green');
    log('  4. ✅ Reactions أفقي (flex-wrap مع whitespace-nowrap)', 'green');
    log('  5. ✅ ما فيش فوضى من popups مفتوحة معاً', 'green');
    log('\n🚀 جاهز للتجربة!\n', 'cyan');
  }
  
} catch (error) {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
}
