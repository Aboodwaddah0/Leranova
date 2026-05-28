import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, SendHorizontal, Sparkles, X } from 'lucide-react';
import api from '../../utils/api';

const STORAGE_KEY_OPEN = 'learnova_instructor_ai_open';
const CHAT_KEY         = 'learnova_instructor_ai_chat_v1';
const MAX_MESSAGES     = 24;

const SUGGESTED = {
  school: {
    en: [
      'Which of my students failed the last exam?',
      'List all students who failed in any of my subjects',
      'What is the pass rate for each of my subjects?',
      'Who are my top 5 students by score?',
      'Which of my subjects has the lowest average score?',
      'How many students are inactive in my classes?',
      'What is the completion rate for my lessons?',
    ],
    ar: [
      'أي طلابي رسبوا في آخر اختبار؟',
      'اذكر جميع الطلاب الراسبين في أي من موادي',
      'ما معدل النجاح لكل مادة من موادي؟',
      'من هم أفضل 5 طلاب لديّ من حيث الدرجات؟',
      'أي موادي لديها أدنى متوسط درجات؟',
      'كم عدد الطلاب غير النشطين في صفوفي؟',
      'ما معدل إتمام دروسي؟',
    ],
  },
  academy: {
    en: [
      'Which of my subjects has the most subscribers?',
      'Which of my subjects has the least subscribers?',
      'What is the quiz pass rate for each of my subjects?',
      'Which students have completed all my lessons?',
      'Which of my subjects has the best completion rate?',
      'How many students are enrolled across all my courses?',
      'Which subject do students engage with the most?',
    ],
    ar: [
      'أي موادي لديها أكثر عدد من المشتركين؟',
      'أي موادي لديها أقل عدد من المشتركين؟',
      'ما معدل نجاح الاختبارات لكل مادة من موادي؟',
      'أي الطلاب أكملوا جميع دروسي؟',
      'أي موادي لديها أفضل معدل إتمام للدروس؟',
      'كم إجمالي الطلاب المسجلين في كورساتي؟',
      'أي مادة يتفاعل معها الطلاب أكثر؟',
    ],
  },
};

export default function InstructorAIChat({ isArabic, isSchool }) {
  const lang    = isArabic ? 'ar' : 'en';
  const orgType = isSchool ? 'school' : 'academy';
  const suggestions = SUGGESTED[orgType][lang];

  const [isOpen,   setIsOpen]   = useState(() => localStorage.getItem(STORAGE_KEY_OPEN) === '1');
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const listRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_OPEN, isOpen ? '1' : '0');
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  const save = (msgs) => {
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-MAX_MESSAGES))); }
    catch { /* ignore */ }
  };

  const send = async (text = input) => {
    const question = text.trim();
    if (!question || loading) return;

    const userMsg = { role: 'user', content: question };
    const next    = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    const history = next
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-10);

    try {
      const res    = await api.post('/instructor-ai/ask', { question, history });
      const data   = res.data?.data || res.data;
      const answer = data?.answer || '…';
      const final  = [...next, { role: 'assistant', content: answer }];
      setMessages(final);
      save(final);
    } catch {
      const errMsg = {
        role: 'assistant',
        content: isArabic
          ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
          : 'Sorry, something went wrong. Please try again.',
        isError: true,
      };
      const final = [...next, errMsg];
      setMessages(final);
      save(final);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* ── Trigger ──────────────────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="instr-trigger"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-6 ${isArabic ? 'left-6' : 'right-6'} z-[8500] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl ring-4 ring-indigo-200`}
            aria-label="Open Instructor AI"
          >
            <Bot size={22} />
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 animate-ping opacity-25" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Panel ────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="instr-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0,  y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={`fixed bottom-6 ${isArabic ? 'left-6' : 'right-6'} z-[8500] flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl`}
            style={{ width: 380, height: 520, maxHeight: 'calc(100vh - 80px)' }}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Bot size={18} />
              </div>
              <div className="flex flex-1 flex-col leading-tight">
                <span className="text-sm font-black">
                  {isArabic ? 'مساعدي الذكي' : 'My AI Assistant'}
                </span>
                <span className="text-[10px] text-white/75">
                  {isArabic ? 'بيانات مواد وطلابي' : 'My subjects & students data'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setMessages([]); localStorage.removeItem(CHAT_KEY); }}
                  title={isArabic ? 'مسح المحادثة' : 'Clear chat'}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
                >
                  <Sparkles size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 px-4 py-4">

              {messages.length === 0 && !loading && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                      <Bot size={13} />
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                      {isArabic
                        ? 'مرحباً! اسألني أي شيء عن طلابك ومواد درسك ونتائجهم.'
                        : "Hello! Ask me anything about your students, subjects, and their results."}
                    </div>
                  </div>
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {isArabic ? 'أسئلة مقترحة' : 'Suggested questions'}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {suggestions.map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => send(q)}
                        className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-left text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {!isUser && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                        <Bot size={13} />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                        isUser
                          ? 'rounded-tr-sm bg-gradient-to-br from-indigo-600 to-violet-600 text-white'
                          : `rounded-tl-sm bg-white text-slate-800 ${msg.isError ? 'opacity-70' : ''}`
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                );
              })}

              {loading && (
                <div className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                    <Bot size={13} />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full bg-indigo-400"
                        style={{ animation: `instrAiBounce 1.2s ${i * 0.2}s infinite` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2.5">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={loading}
                placeholder={isArabic ? 'اسأل عن طلابك ومواد درسك…' : 'Ask about your students & subjects…'}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:bg-white disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow transition hover:opacity-90 disabled:opacity-40"
              >
                <SendHorizontal size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes instrAiBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}
