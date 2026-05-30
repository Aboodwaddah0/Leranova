/**
 * Minimal bilingual helper.
 * Usage:  t('hello', isArabic)
 *         t({ en: 'Courses', ar: 'المواد' }, isArabic)
 */

type Translations = Record<string, { en: string; ar: string }>;

const strings: Translations = {
  // ── Generic ────────────────────────────────────────────────────────────
  back:             { en: 'Back',              ar: 'رجوع' },
  save:             { en: 'Save',              ar: 'حفظ' },
  cancel:           { en: 'Cancel',            ar: 'إلغاء' },
  loading:          { en: 'Loading…',          ar: 'جارٍ التحميل…' },
  retry:            { en: 'Try Again',         ar: 'حاول مجدداً' },
  noData:           { en: 'No data available', ar: 'لا توجد بيانات' },
  error:            { en: 'Something went wrong', ar: 'حدث خطأ ما' },
  noInternet:       { en: 'No internet connection', ar: 'لا يوجد اتصال بالإنترنت' },
  send:             { en: 'Send',              ar: 'إرسال' },
  search:           { en: 'Search…',           ar: 'بحث…' },
  submit:           { en: 'Submit',            ar: 'إرسال' },

  // ── Auth ──────────────────────────────────────────────────────────────
  login:            { en: 'Login',             ar: 'تسجيل الدخول' },
  logout:           { en: 'Logout',            ar: 'تسجيل الخروج' },
  email:            { en: 'Email',             ar: 'البريد الإلكتروني' },
  password:         { en: 'Password',          ar: 'كلمة المرور' },
  loginBtn:         { en: 'Sign In',           ar: 'دخول' },
  loginError:       { en: 'Invalid email or password', ar: 'البريد أو كلمة المرور غير صحيحة' },

  // ── Navigation ────────────────────────────────────────────────────────
  dashboard:        { en: 'Dashboard',         ar: 'الرئيسية' },
  courses:          { en: 'Courses',           ar: 'الدورات' },
  chat:             { en: 'Chat',              ar: 'المحادثات' },
  social:           { en: 'Social',            ar: 'الاجتماعي' },
  profile:          { en: 'Profile',           ar: 'الحساب' },
  marks:            { en: 'Marks',             ar: 'الدرجات' },
  settings:         { en: 'Settings',          ar: 'الإعدادات' },

  // ── Student ───────────────────────────────────────────────────────────
  welcomeBack:      { en: 'Welcome back',      ar: 'مرحباً بعودتك' },
  myProgress:       { en: 'My Progress',       ar: 'تقدمي' },
  subjects:         { en: 'Subjects',          ar: 'المواد' },
  lessons:          { en: 'Lessons',           ar: 'الدروس' },
  teachers:         { en: 'Teachers',          ar: 'المعلمون' },
  attachments:      { en: 'Attachments',       ar: 'المرفقات' },
  comments:         { en: 'Comments',          ar: 'التعليقات' },
  flashcards:       { en: 'Flashcards',        ar: 'البطاقات' },
  mindmap:          { en: 'Mind Map',          ar: 'الخريطة' },
  quiz:             { en: 'Quiz',              ar: 'الاختبار' },
  aiAssistant:      { en: 'AI Assistant',      ar: 'المساعد الذكي' },
  noLessons:        { en: 'No lessons yet',    ar: 'لا توجد دروس بعد' },
  noCourses:        { en: 'No courses found',  ar: 'لا توجد دورات' },
  writeComment:     { en: 'Write a comment…',  ar: 'اكتب تعليقاً…' },
  question:         { en: 'Question',          ar: 'السؤال' },
  answer:           { en: 'Answer',            ar: 'الإجابة' },
  clickReveal:      { en: 'Click to reveal',   ar: 'اضغط للكشف' },
  score:            { en: 'Score',             ar: 'النتيجة' },
  passed:           { en: 'Passed!',           ar: 'نجحت!' },
  failed:           { en: 'Try again',         ar: 'حاول مجدداً' },
  startQuiz:        { en: 'Start Quiz',        ar: 'ابدأ الاختبار' },

  // ── Parent ────────────────────────────────────────────────────────────
  myChildren:       { en: 'My Children',       ar: 'أبنائي' },
  teacherNotes:     { en: 'Teacher Notes',     ar: 'ملاحظات المعلم' },
  noNotes:          { en: 'No notes yet',      ar: 'لا توجد ملاحظات بعد' },
  childMarks:       { en: 'Child Marks',       ar: 'درجات الأبناء' },
};

export function t(key: string, isArabic: boolean): string {
  const entry = strings[key];
  if (!entry) return key;
  return isArabic ? entry.ar : entry.en;
}

export function tObj(obj: { en: string; ar: string }, isArabic: boolean): string {
  return isArabic ? obj.ar : obj.en;
}
