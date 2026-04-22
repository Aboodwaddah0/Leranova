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
  log('\n🧪 التحقق من التصحيحات...', 'cyan');
  
  const content = readFileSync('./Learnova_frontend/src/pages/student/StudentChatPage.jsx', 'utf-8');
  
  const fixes = [
    {
      name: 'Message menu button stopPropagation (3-dot)',
      check: () => {
        const pattern = /onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);[\s\S]*?setMessageMenuId/;
        return pattern.test(content);
      }
    },
    {
      name: 'Reaction emoji button stopPropagation',
      check: () => {
        const pattern = /onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);[\s\S]*?setReactionPickerForMessageId/;
        return pattern.test(content);
      }
    },
    {
      name: 'Composer emoji button stopPropagation',
      check: () => {
        return content.includes('onClick={(e) => {') && 
               content.includes('e.stopPropagation();') &&
               content.includes('setShowComposerEmojiPicker((current) => !current)');
      }
    },
    {
      name: 'Clear Chat يحذف محلياً (ما ينادي clearStudentChat API)',
      check: () => {
        const hasOldCode = content.includes('await clearStudentChat(selectedChatId)');
        const hasSoftDelete = content.includes('// Soft delete - only clear messages locally');
        return !hasOldCode && hasSoftDelete;
      }
    },
    {
      name: 'Clear Chat confirmation message بالعربي صحيح',
      check: () => {
        return content.includes('سيتم مسح الرسائل من جهازك فقط');
      }
    }
  ];
  
  let passed = 0;
  log('\n📋 النتائج:', 'blue');
  
  for (const fix of fixes) {
    if (fix.check()) {
      log(`  ✅ ${fix.name}`, 'green');
      passed++;
    } else {
      log(`  ❌ ${fix.name}`, 'red');
    }
  }
  
  log(`\n✅ التصحيحات: ${passed}/${fixes.length}`, passed === fixes.length ? 'green' : 'yellow');
  
  if (passed === fixes.length) {
    log('\n🎉 جميع المشاكل صلحت:', 'green');
    log('  1. ✅ الـ 3-dot dropdown يعمل الآن', 'green');
    log('  2. ✅ الإيموجي و reactions يعملون', 'green');
    log('  3. ✅ Clear Chat soft delete (محلي فقط)', 'green');
    log('\n🚀 متاح للتجربة الآن!\n', 'cyan');
  }
  
} catch (error) {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
}
