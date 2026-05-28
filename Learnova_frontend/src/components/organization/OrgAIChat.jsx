import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, SendHorizontal, Sparkles, X } from 'lucide-react';
import api from '../../utils/api';

const STORAGE_KEY_OPEN = 'learnova_org_ai_open';
const CHAT_PREFIX      = 'learnova_org_ai_chat_v1';
const MAX_MESSAGES     = 24;

const SUGGESTED_QUESTIONS = {
  school: {
    en: [
      'Which subject has the highest failure rate?',
      'Which students failed across all subjects?',
      'What is the overall pass rate for each grade level?',
      'Which teacher is responsible for the most students?',
      'How many students are active vs inactive?',
      'What is the average score per subject?',
      'Which grade level has the most students?',
    ],
    ar: [
      'أي مادة لديها أعلى نسبة رسوب؟',
      'أي الطلاب رسبوا في جميع المواد؟',
      'ما معدل النجاح الإجمالي لكل صف دراسي؟',
      'أي مدرس مسؤول عن أكبر عدد من الطلاب؟',
      'كم عدد الطلاب النشطين مقارنة بغير النشطين؟',
      'ما متوسط الدرجات لكل مادة؟',
      'أي صف دراسي لديه أكبر عدد من الطلاب؟',
    ],
  },
  academy: {
    en: [
      'Which course has the most enrolled students?',
      'Which subject has the least subscribers?',
      'What is our total revenue from all courses?',
      'Which course generates the most revenue?',
      'How many students are active on the platform?',
      'Which teacher has the most students across their courses?',
      'Which subjects have zero subscribers?',
    ],
    ar: [
      'أي كورس لديه أكبر عدد من الطلاب المسجلين؟',
      'أي مادة لديها أقل عدد من المشتركين؟',
      'ما إجمالي إيراداتنا من جميع الكورسات؟',
      'أي كورس يولّد أكبر إيراد؟',
      'كم عدد الطلاب النشطين على المنصة؟',
      'أي مدرس لديه أكبر عدد من الطلاب عبر كورساته؟',
      'أي المواد ليس لديها أي مشتركين؟',
    ],
  },
};

export default function OrgAIChat({ isArabic, isSchool }) {
  const lang        = isArabic ? 'ar' : 'en';
  const orgType     = isSchool ? 'school' : 'academy';
  const suggestions = SUGGESTED_QUESTIONS[orgType][lang];

  const storageKey = `${CHAT_PREFIX}_${orgType}`;

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
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  const saveMessages = (msgs) => {
    try { localStorage.setItem(storageKey, JSON.stringify(msgs.slice(-MAX_MESSAGES))); }
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
      const res    = await api.post('/org-ai/ask', { question, history });
      const data   = res.data?.data || res.data;
      const answer = data?.answer || '…';

      const final = [...next, { role: 'assistant', content: answer }];
      setMessages(final);
      saveMessages(final);
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: isArabic
          ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
          : 'Sorry, something went wrong. Please try again.',
        isError: true,
      };
      const final = [...next, errMsg];
      setMessages(final);
      saveMessages(final);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(storageKey);
  };

  return (
    <>
      {/* ── Floating trigger ──────────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="org-ai-trigger"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-6 ${isArabic ? 'left-6' : 'right-6'} z-[8000] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl ring-4 ring-indigo-200`}
            aria-label="Open AI Assistant"
          >
            <Bot size={22} />
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 animate-ping opacity-25" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat panel ───────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="org-ai-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0,  y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={`fixed bottom-6 ${isArabic ? 'left-6' : 'right-6'} z-[8000] flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl`}
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
                  {isArabic ? 'المساعد الذكي' : 'AI Assistant'}
                </span>
                <span className="text-[10px] text-white/75">
                  {isArabic
                    ? (isSchool ? 'مساعد بيانات المدرسة' : 'مساعد بيانات الأكاديمية')
                    : (isSchool ? 'School Data Assistant' : 'Academy Data Assistant')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={clearChat}
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

              {/* Empty state with suggestions */}
              {messages.length === 0 && !loading && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                      <Bot size={13} />
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                      {isArabic
                        ? 'مرحباً! أنا مساعدك الذكي. اسألني أي سؤال عن بيانات منظمتك.'
                        : "Hello! I'm your AI assistant. Ask me anything about your organization's data."}
                    </div>
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
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

              {/* Message bubbles */}
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
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
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

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                    <Bot size={13} />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full bg-indigo-400"
                        style={{ animation: `orgAiBounce 1.2s ${i * 0.2}s infinite` }}
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
                placeholder={isArabic ? 'اسأل عن بيانات منظمتك…' : 'Ask about your organization data…'}
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
        @keyframes orgAiBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}
