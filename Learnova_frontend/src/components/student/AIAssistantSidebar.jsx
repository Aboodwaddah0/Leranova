import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, SendHorizontal, Bot, MessageCircle } from 'lucide-react';
import { useLocation, useParams } from 'react-router-dom';
import { askStudentTutor, fetchLessonDetails } from '../../services/studentService';
import { useTheme } from '../../contexts/ThemeContext';

const STORAGE_KEY = 'learnova_student_ai_sidebar_open';
const CHAT_STORAGE_PREFIX = 'learnova_student_ai_chat_v1';
const MAX_HISTORY_MESSAGES = 16;

const parseRouteContext = (pathname, searchParams, routeParams = {}) => {
  const courseMatch = pathname.match(/\/courses\/(\d+)/i);
  const subjectMatch = pathname.match(/\/subjects\/(\d+)/i);
  const lessonMatch = pathname.match(/\/lessons\/(\d+)/i);

  const courseId = Number(searchParams.get('courseId') || routeParams.courseId || courseMatch?.[1]);
  const subjectId = Number(searchParams.get('subjectId') || routeParams.subjectId || subjectMatch?.[1]);
  const lessonId = Number(searchParams.get('lessonId') || routeParams.lessonId || lessonMatch?.[1]);

  return {
    courseId: Number.isFinite(courseId) ? courseId : null,
    subjectId: Number.isFinite(subjectId) ? subjectId : null,
    lessonId: Number.isFinite(lessonId) ? lessonId : null,
  };
};

const suggestedQuestionsByLanguage = {
  ar: [
    'لخّص أهم النقاط في هذا الدرس',
    'ما المهارات التي سأتعلمها من هذا المحتوى؟',
    'ما أهم سؤال امتحاني متوقع من هذا الموضوع؟',
  ],
  en: [
    'Summarize the main points of this lesson',
    'What skills will I gain from this course?',
    'What are the key takeaways I should review?',
  ],
};

function SourceBadge({ source, isArabic }) {
  if (!source || source === 'none' || source === 'lesson') return null;
  const config = {
    general: { label: isArabic ? 'معرفة عامة' : 'General Knowledge', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    hybrid:  { label: isArabic ? 'درس + معرفة عامة' : 'Lesson + General', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  };
  const badge = config[source];
  if (!badge) return null;
  return (
    <span className={`mb-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
      {badge.label}
    </span>
  );
}

export default function AIAssistantSidebar({ isArabic, lessonId: lessonIdProp }) {
  const { isDark } = useTheme();
  const A = {
    panel:       isDark ? '#111029'                : 'rgba(255,255,255,0.97)',
    panelBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
    header:      isDark ? '#111029'                : '#ffffff',
    headerBorder:isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
    body:        isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
    emptyBorder: isDark ? 'rgba(255,255,255,0.1)'  : '#e2e8f0',
    emptyBg:     isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
    emptyText:   isDark ? 'rgba(255,255,255,0.35)' : '#64748b',
    botBubble:   isDark ? '#1e1c38'                : '#ffffff',
    botBubbleBrd:isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    botText:     isDark ? 'rgba(255,255,255,0.75)' : '#374151',
    botLabel:    isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8',
    thinkBg:     isDark ? '#1e1c38'                : '#ffffff',
    thinkBorder: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    thinkText:   isDark ? 'rgba(255,255,255,0.4)'  : '#64748b',
    suggBorder:  isDark ? 'rgba(129,140,248,0.2)'  : '#e0e7ff',
    suggBg:      isDark ? 'rgba(99,102,241,0.07)'  : '#ffffff',
    suggText:    isDark ? 'rgba(255,255,255,0.6)'  : '#374151',
    footer:      isDark ? '#111029'                : '#ffffff',
    footerBorder:isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
    inputBg:     isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    inputBorder: isDark ? 'rgba(255,255,255,0.1)'  : '#e2e8f0',
    inputText:   isDark ? '#f1f0f5'                : '#0f172a',
    btnBg:       isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
    btnText:     isDark ? 'rgba(255,255,255,0.55)' : '#475569',
    btnBorder:   isDark ? 'rgba(255,255,255,0.1)'  : '#e2e8f0',
    titleText:   isDark ? '#f1f0f5'                : '#0f172a',
  };
  const location = useLocation();
  const params = useParams();
  const currentUser = useSelector((state) => state.auth?.user);
  const [isOpen, setIsOpen] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [resolvedContext, setResolvedContext] = useState({ courseId: null, subjectId: null, lessonId: null });
  const listRef = useRef(null);

  const routeContext = useMemo(() => {
    const search = new URLSearchParams(location.search || '');
    const ctx = parseRouteContext(location.pathname, search, params);
    // When a parent component knows the active lesson (e.g. inline viewer), override URL-derived lessonId
    if (lessonIdProp && Number.isFinite(Number(lessonIdProp))) {
      ctx.lessonId = Number(lessonIdProp);
    }
    return ctx;
  }, [location.pathname, location.search, params, lessonIdProp]);

  useEffect(() => {
    const lessonMatch = location.pathname.match(/\/lessons\/(\d+)/i);
    if (lessonMatch) {
      setMessages([]);
    }
  }, [location.pathname]);

  // Clear messages when the active lesson changes in the inline viewer
  useEffect(() => {
    if (lessonIdProp) setMessages([]);
  }, [lessonIdProp]);

  useEffect(() => {
    let cancelled = false;

    const resolveContext = async () => {
      const lessonId = Number(routeContext.lessonId);

      if (Number.isFinite(routeContext.courseId)) {
        setResolvedContext(routeContext);
        return;
      }

      if (Number.isFinite(lessonId)) {
        try {
          const details = await fetchLessonDetails(lessonId);
          if (cancelled) return;

          setResolvedContext({
            courseId: Number(details?.course?.id) || null,
            subjectId: Number(details?.subject?.id) || null,
            lessonId,
          });
          return;
        } catch {
          // keep route context below if lookup fails
        }
      }

      if (!cancelled) {
        setResolvedContext(routeContext);
      }
    };

    resolveContext();

    return () => {
      cancelled = true;
    };
  }, [routeContext]);

  const chatStorageKey = useMemo(() => {
    const userId = currentUser?.id ?? 'guest';
    const courseId = Number(resolvedContext.courseId);
    const subjectId = Number(resolvedContext.subjectId);
    const lessonId = Number(resolvedContext.lessonId);

    const keyParts = [
      `u${userId}`,
      Number.isInteger(courseId) && courseId > 0 ? `c${courseId}` : 'c0',
      Number.isInteger(subjectId) && subjectId > 0 ? `s${subjectId}` : 's0',
      Number.isInteger(lessonId) && lessonId > 0 ? `l${lessonId}` : 'l0',
    ];

    return `${CHAT_STORAGE_PREFIX}:${keyParts.join('_')}`;
  }, [resolvedContext, currentUser?.id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(chatStorageKey);
      if (!raw) {
        setMessages([]);
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setMessages([]);
        return;
      }

      const restored = parsed
        .filter((entry) => entry && (entry.role === 'user' || entry.role === 'assistant'))
        .map((entry, index) => ({
          id: String(entry.id || `restored-${index}-${Date.now()}`),
          role: entry.role,
          content: String(entry.content || '').trim(),
          isError: Boolean(entry.isError),
          source: entry.source || null,
        }))
        .filter((entry) => entry.content);

      setMessages(restored);
    } catch {
      setMessages([]);
    }
  }, [chatStorageKey]);

  useEffect(() => {
    try {
      if (!messages.length) {
        localStorage.removeItem(chatStorageKey);
        return;
      }

      const toStore = messages.slice(-MAX_HISTORY_MESSAGES).map((entry) => ({
        id: entry.id,
        role: entry.role,
        content: entry.content,
        isError: Boolean(entry.isError),
        source: entry.source || null,
      }));

      localStorage.setItem(chatStorageKey, JSON.stringify(toStore));
    } catch {
      // Ignore localStorage errors.
    }
  }, [chatStorageKey, messages]);

  const suggestions = isArabic ? suggestedQuestionsByLanguage.ar : suggestedQuestionsByLanguage.en;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isOpen ? '1' : '0');
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, thinking]);

  const submitQuestion = async (content) => {
    const normalized = String(content || '').trim();
    if (!normalized || thinking) return;

    setQuestion('');
    setThinking(true);

    const userMessage = {
      id: `q-${Date.now()}`,
      role: 'user',
      content: normalized,
    };

    setMessages((current) => [...current, userMessage]);

    try {
      if (!Number.isInteger(Number(resolvedContext.courseId)) || Number(resolvedContext.courseId) <= 0) {
        throw new Error(isArabic ? 'لا يمكن تحديد الكورس الحالي لهذا السؤال.' : 'Unable to resolve the current course for this question.');
      }

      const historyForRequest = messages
        .filter((entry) => entry && (entry.role === 'user' || entry.role === 'assistant'))
        .filter((entry) => !entry.isError)
        .slice(-8)
        .map((entry) => ({ role: entry.role, content: entry.content }));

      const response = await askStudentTutor({
        question: normalized,
        courseId: resolvedContext.courseId,
        subjectId: resolvedContext.subjectId,
        lessonId: resolvedContext.lessonId,
        history: historyForRequest,
      });
      const assistantContent = String(response?.answer || response?.message || '').trim();

      if (!assistantContent) {
        throw new Error(isArabic ? 'لم يتم العثور على إجابة من مواد الدرس.' : 'No answer was found in lesson materials.');
      }

      setMessages((current) => {
        const lastAssistant = [...current].reverse().find((entry) => entry.role === 'assistant' && !entry.isError);
        if (lastAssistant?.content === assistantContent) {
          return current;
        }

        return [
          ...current,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: assistantContent,
            source: response?.source || null,
          },
        ];
      });
    } catch (error) {
      setMessages((current) => [
        ...current.filter((m) => m.id !== userMessage.id),
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: error?.response?.data?.message || error?.message || (isArabic ? 'تعذر الوصول إلى المساعد حالياً.' : 'The assistant is unavailable right now.'),
          isError: true,
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    await submitQuestion(question);
  };

  const clearConversation = () => {
    setMessages([]);
    setQuestion('');
    try {
      localStorage.removeItem(chatStorageKey);
    } catch {
      // Ignore localStorage errors.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-5 z-[80] inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 text-white shadow-2xl shadow-indigo-500/35 transition hover:scale-105 hover:shadow-indigo-500/50 lg:bottom-8"
        aria-label={isArabic ? 'فتح المساعد الذكي' : 'Open AI assistant'}
      >
        <Sparkles size={22} />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[85] bg-slate-900/30 backdrop-blur-[1px]"
              aria-label={isArabic ? 'إغلاق المساعد' : 'Close assistant'}
            />

            <motion.aside
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="fixed right-0 top-0 z-[90] h-screen w-full max-w-[360px] shadow-2xl shadow-slate-900/30 backdrop-blur-xl"
              style={{ borderLeft: `1px solid ${A.panelBorder}`, background: A.panel }}
            >
              <div className="flex h-full flex-col">
                <header className="flex items-center justify-between px-4 py-4" style={{ borderBottom: `1px solid ${A.headerBorder}`, background: A.header }}>
                  <h2 className="text-lg font-black" style={{ color: A.titleText }}>{isArabic ? 'المساعد الذكي' : 'AI Assistant'}</h2>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={clearConversation}
                      className="rounded-xl px-3 py-2 text-xs font-semibold transition"
                      style={{ border: `1px solid ${A.btnBorder}`, background: A.btnBg, color: A.btnText }}>
                      {isArabic ? 'محادثة جديدة' : 'New chat'}
                    </button>
                    <button type="button" onClick={() => setIsOpen(false)}
                      className="rounded-xl p-2 transition"
                      style={{ border: `1px solid ${A.btnBorder}`, background: A.btnBg, color: A.btnText }}
                      aria-label={isArabic ? 'إغلاق' : 'Close'}>
                      <X size={18} />
                    </button>
                  </div>
                </header>

                <div ref={listRef} className="flex-1 space-y-3 overflow-auto px-4 py-4" style={{ background: A.body }}>
                  {messages.length === 0 ? (
                    <div className="rounded-2xl border-dashed px-4 py-5 text-sm" style={{ border: `1.5px dashed ${A.emptyBorder}`, background: A.emptyBg, color: A.emptyText }}>
                      {isArabic ? 'اسأل أي سؤال متعلق بالكورس أو الدرس.' : 'Ask anything related to your course or lesson.'}
                    </div>
                  ) : null}

                  {messages.map((message) => {
                    const mine = message.role === 'user';
                    return (
                      <article key={message.id}
                        className="rounded-2xl px-4 py-3 text-sm leading-6"
                        style={mine
                          ? { marginLeft: 32, background: '#4f46e5', color: '#ffffff' }
                          : { marginRight: 32, border: `1px solid ${A.botBubbleBrd}`, background: A.botBubble, color: A.botText }}>
                        <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                          style={{ color: mine ? 'rgba(255,255,255,0.7)' : A.botLabel }}>
                          {mine ? <MessageCircle size={12} /> : <Bot size={12} />}
                          <span>{mine ? (isArabic ? 'أنت' : 'You') : (isArabic ? 'المساعد' : 'Assistant')}</span>
                        </div>
                        {!mine ? <SourceBadge source={message.source} isArabic={isArabic} /> : null}
                        <p>{message.content}</p>
                      </article>
                    );
                  })}

                  {thinking ? (
                    <div className="mr-8 rounded-2xl px-4 py-3 text-sm font-semibold" style={{ border: `1px solid ${A.thinkBorder}`, background: A.thinkBg, color: A.thinkText }}>
                      {isArabic ? 'جاري التفكير...' : 'Thinking...'}
                    </div>
                  ) : null}

                  {messages.length === 0 ? (
                    <div className="space-y-2 pt-1">
                      {suggestions.map((item) => (
                        <button key={item} type="button" onClick={() => submitQuestion(item)}
                          className="w-full rounded-xl px-3 py-2 text-start text-xs font-semibold transition"
                          style={{ border: `1px solid ${A.suggBorder}`, background: A.suggBg, color: A.suggText }}>
                          {item}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <footer className="px-4 py-3" style={{ borderTop: `1px solid ${A.footerBorder}`, background: A.footer }}>
                  <form onSubmit={onSubmit} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder={isArabic ? 'اكتب سؤالك...' : 'Ask a question'}
                      className="h-11 flex-1 rounded-xl px-3 text-sm outline-none transition"
                      style={{ border: `1px solid ${A.inputBorder}`, background: A.inputBg, color: A.inputText }}
                    />
                    <button type="submit" disabled={!question.trim() || thinking}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">
                      <SendHorizontal size={15} />
                    </button>
                  </form>
                </footer>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
