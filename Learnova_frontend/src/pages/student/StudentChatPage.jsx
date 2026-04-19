import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { MessageCircle, SendHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import StudentLayout from '../../components/student/StudentLayout';
import { useLanguage } from '../../utils/i18n';
import {
  fetchStudentChats,
  fetchStudentChatMessages,
  sendStudentChatMessage,
} from '../../services/studentService';
import { API_BASE_URL, STORAGE_KEYS } from '../../utils/constants';

const POLL_INTERVAL_MS = 5000;
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const toSafeArray = (value) => (Array.isArray(value) ? value : []);

const getChatLabel = (chat, isArabic) => {
  if (chat?.title) {
    return chat.title;
  }

  const type = String(chat?.type || '').toUpperCase();

  if (type === 'CLASS') {
    return isArabic ? 'دردشة الصف' : 'Class Chat';
  }

  if (type === 'SUBJECT') {
    return isArabic ? 'دردشة المادة' : 'Material Chat';
  }

  return isArabic ? 'دردشة المادة' : 'Material Chat';
};

const sortChatsByLatestActivity = (list = []) => [...list].sort((a, b) => {
  const aTime = new Date(a?.lastMessageAt || a?.createdAt || 0).getTime();
  const bTime = new Date(b?.lastMessageAt || b?.createdAt || 0).getTime();
  return bTime - aTime;
});

const formatMessageTime = (value) => {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
};

export default function StudentChatPage() {
  const { isArabic } = useLanguage();
  const currentUser = useSelector((state) => state.auth?.user);
  const currentUserId = Number(currentUser?.id || currentUser?.userId);

  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [socketReady, setSocketReady] = useState(false);
  const [socketFailed, setSocketFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState({});

  const messagesBoxRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedChatIdRef = useRef(null);

  const selectedChat = useMemo(
    () => chats.find((chat) => Number(chat.id) === Number(selectedChatId)) || null,
    [chats, selectedChatId],
  );

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  const selectedChatTyping = useMemo(() => {
    const chatTyping = typingUsers[String(selectedChatId)] || {};
    const values = Object.values(chatTyping);
    return values.length ? values[0] : null;
  }, [typingUsers, selectedChatId]);

  const bumpChatPreview = (chatId, message, isOwnMessage) => {
    setChats((current) => {
      const next = current.map((chat) => {
        if (Number(chat.id) !== Number(chatId)) {
          return chat;
        }

        const unreadCount = isOwnMessage || Number(selectedChatId) === Number(chatId)
          ? 0
          : Number(chat.unreadCount || 0) + 1;

        return {
          ...chat,
          lastMessage: {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            createdAt: message.createdAt,
            senderName: message.sender?.name || null,
          },
          lastMessageAt: message.createdAt,
          unreadCount,
        };
      });

      return sortChatsByLatestActivity(next);
    });
  };

  const scrollToBottom = () => {
    const container = messagesBoxRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  };

  const loadMessages = async (chatId) => {
    if (!chatId) return;

    const nextMessages = await fetchStudentChatMessages(chatId);
    setMessages(toSafeArray(nextMessages));
  };

  useEffect(() => {
    let cancelled = false;

    const loadChats = async () => {
      try {
        setLoading(true);
        const list = await fetchStudentChats();

        if (cancelled) return;

        const sorted = sortChatsByLatestActivity(list);
        setChats(sorted);

        if (sorted.length) {
          const firstChatId = Number(sorted[0].id);
          setSelectedChatId(firstChatId);
          await loadMessages(firstChatId);
        } else {
          setSelectedChatId(null);
          setMessages([]);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.response?.data?.message || loadError?.message || (isArabic ? 'فشل تحميل الدردشة.' : 'Failed to load chats.'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadChats();

    return () => {
      cancelled = true;
    };
  }, [isArabic]);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      setSocketFailed(true);
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        token,
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketReady(true);
      setSocketFailed(false);
    });

    socket.on('connect_error', () => {
      setSocketReady(false);
      setSocketFailed(true);
    });

    socket.on('receive_message', ({ chatId, message }) => {
      const isOwn = Number(message?.senderId) === Number(currentUserId);
      const activeChatId = Number(selectedChatIdRef.current);

      bumpChatPreview(chatId, message, isOwn);

      if (Number(chatId) === activeChatId) {
        setMessages((current) => {
          if (current.some((item) => Number(item.id) === Number(message.id))) {
            return current;
          }
          return [...current, message];
        });

        if (!isOwn) {
          socket.emit('message_seen', { chatId });
        }
      }
    });

    socket.on('typing', ({ chatId, userId, userName }) => {
      if (Number(userId) === Number(currentUserId)) {
        return;
      }

      setTypingUsers((current) => ({
        ...current,
        [String(chatId)]: {
          ...(current[String(chatId)] || {}),
          [String(userId)]: userName || 'User',
        },
      }));
    });

    socket.on('stop_typing', ({ chatId, userId }) => {
      setTypingUsers((current) => {
        const chatTyping = { ...(current[String(chatId)] || {}) };
        delete chatTyping[String(userId)];
        return {
          ...current,
          [String(chatId)]: chatTyping,
        };
      });
    });

    socket.on('message_seen', ({ chatId, seenAt, userId }) => {
      const activeChatId = Number(selectedChatIdRef.current);

      if (Number(userId) === Number(currentUserId)) {
        setChats((current) => current.map((chat) => (
          Number(chat.id) === Number(chatId)
            ? { ...chat, unreadCount: 0 }
            : chat
        )));
        return;
      }

      if (Number(chatId) === activeChatId) {
        setMessages((current) => current.map((message) => (
          Number(message.senderId) === Number(currentUserId)
            ? { ...message, isSeen: true, seenAt: seenAt || new Date().toISOString() }
            : message
        )));
      }
    });

    socket.on('disconnect', () => {
      setSocketReady(false);
      setSocketFailed(true);
    });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!selectedChatId || !socketReady) return undefined;

    const socket = socketRef.current;
    if (!socket) return undefined;

    socket.emit('join_chat', { chatId: selectedChatId });
    socket.emit('message_seen', { chatId: selectedChatId });

    return undefined;
  }, [selectedChatId, socketReady]);

  useEffect(() => {
    if (!selectedChatId || !socketFailed) return undefined;

    let mounted = true;

    const refresh = async () => {
      try {
        const [nextChats, nextMessages] = await Promise.all([
          fetchStudentChats(),
          fetchStudentChatMessages(selectedChatId),
        ]);

        if (mounted) {
          setChats(sortChatsByLatestActivity(nextChats));
          setMessages(toSafeArray(nextMessages));
        }
      } catch {
        // Keep current messages to avoid flicker while polling.
      }
    };

    const timer = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [selectedChatId, socketFailed]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChatId]);

  const handleSelectChat = async (chatId) => {
    const nextChatId = Number(chatId);
    setSelectedChatId(nextChatId);
    setError('');

    try {
      await loadMessages(nextChatId);
      setChats((current) => current.map((chat) => (
        Number(chat.id) === Number(nextChatId)
          ? { ...chat, unreadCount: 0 }
          : chat
      )));

      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit('join_chat', { chatId: nextChatId });
        socket.emit('message_seen', { chatId: nextChatId });
      }
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError?.message || (isArabic ? 'تعذر تحميل الرسائل.' : 'Failed to load messages.'));
    }
  };

  const submitMessage = async () => {
    if (!selectedChatId || !draft.trim() || sending) {
      return;
    }

    try {
      setSending(true);
      const content = draft.trim();
      setDraft('');

      const message = await sendStudentChatMessage(selectedChatId, content);
      setMessages((current) => [...current, message]);
      bumpChatPreview(selectedChatId, message, true);

      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit('message_seen', { chatId: selectedChatId });
      }
    } catch (sendError) {
      setError(sendError?.response?.data?.message || sendError?.message || (isArabic ? 'تعذر إرسال الرسالة.' : 'Failed to send message.'));
    } finally {
      setSending(false);
    }
  };

  const onInputKeyDown = async (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await submitMessage();
    }
  };


  const onDraftChange = (event) => {
    const value = event.target.value;
    setDraft(value);

    const socket = socketRef.current;
    if (!socket?.connected || !selectedChatId) {
      return;
    }

    socket.emit('typing', { chatId: selectedChatId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { chatId: selectedChatId });
    }, 1200);
  };

  return (
    <StudentLayout
      title={isArabic ? 'المحادثات' : 'Chat'}
      subtitle={isArabic ? 'تواصل المواد المشتركة' : 'Subscribed materials chat'}
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      <div className="grid h-[calc(100vh-170px)] min-h-0 gap-5 overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 p-4 shadow-xl shadow-indigo-500/5 backdrop-blur-xl md:grid-cols-[340px_1fr]">
        <aside className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="mb-3 flex items-center gap-2 px-2 text-sm font-bold text-slate-700">
            <MessageCircle size={16} className="text-indigo-600" />
            <span>{isArabic ? 'قائمة الدردشات' : 'Chat list'}</span>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
                {isArabic ? 'جاري تحميل الدردشات...' : 'Loading chats...'}
              </div>
            ) : null}

            {!loading && chats.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
                {isArabic ? 'لا توجد دردشات متاحة.' : 'No chats available.'}
              </div>
            ) : chats.map((chat) => {
              const active = Number(chat.id) === Number(selectedChatId);

              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => handleSelectChat(chat.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-start transition ${
                    active
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm ${chat.unreadCount ? 'font-black' : 'font-bold'}`}>{getChatLabel(chat, isArabic)}</p>
                    <span className={`text-[11px] ${active ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {formatMessageTime(chat.lastMessageAt)}
                    </span>
                  </div>
                  <p className={`mt-1 line-clamp-1 text-xs ${active ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {chat.lastMessage?.content || (isArabic ? 'لا توجد رسائل بعد' : 'No messages yet')}
                  </p>
                  <p className={`mt-1 text-[11px] ${active ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {String(chat.type || '').toUpperCase() === 'CLASS'
                      ? (isArabic ? 'دردشة الصف' : 'Class chat')
                      : (isArabic ? 'دردشة المادة' : 'Material chat')}
                  </p>
                  {chat.unreadCount ? (
                    <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                      {chat.unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-black text-slate-900">
              {selectedChat ? getChatLabel(selectedChat, isArabic) : (isArabic ? 'اختر دردشة' : 'Select a chat')}
            </p>
          </div>

          <div ref={messagesBoxRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 px-4 py-4">
            {!selectedChat ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                {isArabic ? 'اختر دردشة لعرض الرسائل.' : 'Choose a chat to view messages.'}
              </div>
            ) : null}

            {selectedChat && messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                {isArabic ? 'لا توجد رسائل بعد.' : 'No messages yet.'}
              </div>
            ) : messages.map((message) => {
              const mine = Number(message.senderId) === Number(currentUserId);

              return (
                <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <motion.article
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      mine
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    {!mine ? (
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-500">
                        {message.sender?.name || (isArabic ? 'عضو' : 'Member')}
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <div className={`mt-2 flex items-center gap-2 text-[11px] ${mine ? 'text-indigo-100' : 'text-slate-500'}`}>
                      <span>{formatMessageTime(message.createdAt)}</span>
                      {mine ? <span>{message.isSeen ? '✔✔' : '✔'}</span> : null}
                    </div>
                  </motion.article>
                </div>
              );
            })}
            {selectedChatTyping ? (
              <div className="text-xs font-semibold text-slate-500">{isArabic ? 'جاري الكتابة...' : 'Typing...'}</div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <textarea
                value={draft}
                onChange={onDraftChange}
                onKeyDown={onInputKeyDown}
                rows={2}
                placeholder={isArabic ? 'اكتب رسالتك...' : 'Write your message...'}
                className="min-h-[54px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
              />
              <button
                type="button"
                onClick={submitMessage}
                disabled={!selectedChatId || !draft.trim() || sending}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SendHorizontal size={16} />
                {isArabic ? 'إرسال' : 'Send'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </StudentLayout>
  );
}
