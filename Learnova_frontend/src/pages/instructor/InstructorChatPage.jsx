import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, ArrowLeft } from 'lucide-react';
import InstructorLayout from '../../components/instructor/InstructorLayout';
import { useLanguage } from '../../utils/i18n';
import {
  fetchTeacherChats,
  fetchTeacherChatMessages,
  sendTeacherChatMessage,
} from '../../services/instructorService';

const fmt = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export default function InstructorChatPage() {
  const { isArabic } = useLanguage();

  const [chats, setChats]           = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMsgs, setLoadingMsgs]   = useState(false);
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState('');
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  // Load chat list
  useEffect(() => {
    fetchTeacherChats()
      .then(data => setChats(Array.isArray(data) ? data : []))
      .catch(() => setError(isArabic ? 'تعذّر تحميل المحادثات' : 'Failed to load chats'))
      .finally(() => setLoadingChats(false));
  }, [isArabic]);

  // Load messages when chat selected + poll every 5s
  useEffect(() => {
    if (!selectedChat) { setMessages([]); return; }
    const load = async () => {
      setLoadingMsgs(true);
      try {
        const data = await fetchTeacherChatMessages(selectedChat.id);
        setMessages(Array.isArray(data) ? data : []);
      } catch { /* silent */ }
      finally { setLoadingMsgs(false); }
    };
    load();
    clearInterval(pollRef.current);
    pollRef.current = setInterval(load, 5000);
    return () => clearInterval(pollRef.current);
  }, [selectedChat]);

  // Scroll to bottom on new messages
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedChat || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await sendTeacherChatMessage(selectedChat.id, text);
      const data = await fetchTeacherChatMessages(selectedChat.id);
      setMessages(Array.isArray(data) ? data : []);
      // Update last message preview in chat list
      setChats(prev => prev.map(c => c.id === selectedChat.id
        ? { ...c, lastMessage: { content: text }, lastMessageAt: new Date() }
        : c
      ));
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  const t = (ar, en) => isArabic ? ar : en;

  return (
    <InstructorLayout
      title={t('المحادثات', 'Chats')}
      subtitle={t('تواصل مع طلابك في كل مادة', 'Communicate with your students per subject')}
    >
      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 280px)', minHeight: 400 }}>

        {/* ── Chat list ─────────────────────────────────────────────────── */}
        <div style={{ width: 280, flexShrink: 0, borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6366f1' }}>
              {t('المواد', 'Subjects')}
            </p>
            <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, color: '#1e293b' }}>
              {t('المحادثات', 'Chats')}
            </h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingChats ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', width: 24, height: 24, borderRadius: '50%', border: '2px solid #6366f1', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
              </div>
            ) : chats.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                {t('لا توجد محادثات', 'No chats available')}
              </div>
            ) : (
              chats.map(chat => {
                const active = selectedChat?.id === chat.id;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => setSelectedChat(chat)}
                    style={{
                      width: '100%', padding: '12px 16px', textAlign: 'start', border: 'none',
                      borderBottom: '1px solid #f8fafc',
                      background: active ? '#eef2ff' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: active ? '#6366f1' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MessageCircle size={16} color={active ? '#fff' : '#94a3b8'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: active ? '#4338ca' : '#1e293b', truncate: true, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {chat.title || t('مادة', 'Subject')}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {chat.lastMessage?.content || (isArabic ? 'لا توجد رسائل بعد' : 'No messages yet')}
                      </p>
                    </div>
                    {chat.unreadCount > 0 && (
                      <span style={{ background: '#6366f1', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 800, padding: '2px 6px', flexShrink: 0 }}>
                        {chat.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Messages pane ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedChat ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#94a3b8' }}>
              <MessageCircle size={48} strokeWidth={1} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                {t('اختر محادثة للبدء', 'Select a chat to start')}
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={16} color="#6366f1" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{selectedChat.title}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{t('محادثة المادة', 'Subject chat')}</p>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loadingMsgs && messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ display: 'inline-block', width: 24, height: 24, borderRadius: '50%', border: '2px solid #6366f1', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 40 }}>
                    {t('لا توجد رسائل بعد — كن أول من يكتب!', 'No messages yet — be the first to write!')}
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.senderId === msg.sender_user_id; // simplified — sender check
                    const prevMsg = i > 0 ? messages[i - 1] : null;
                    const showDate = !prevMsg || fmtDate(msg.createdAt) !== fmtDate(prevMsg.createdAt);
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div style={{ textAlign: 'center', margin: '8px 0' }}>
                            <span style={{ fontSize: 11, color: '#94a3b8', background: '#f8fafc', padding: '2px 10px', borderRadius: 999 }}>{fmtDate(msg.createdAt)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.isOwn ? 'flex-end' : 'flex-start' }}>
                          {!msg.isOwn && (
                            <p style={{ margin: '0 0 2px 8px', fontSize: 11, fontWeight: 700, color: '#6366f1' }}>{msg.senderName}</p>
                          )}
                          <div style={{
                            maxWidth: '72%', padding: '8px 12px', borderRadius: msg.isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: msg.isOwn ? '#6366f1' : '#f1f5f9',
                            color: msg.isOwn ? '#fff' : '#1e293b',
                            fontSize: 14,
                          }}>
                            {msg.content}
                          </div>
                          <p style={{ margin: '2px 8px 0', fontSize: 10, color: '#94a3b8' }}>{fmt(msg.createdAt || msg.sentAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={t('اكتب رسالة...', 'Type a message...')}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  style={{
                    width: 40, height: 40, borderRadius: 12, background: input.trim() ? '#6366f1' : '#e2e8f0',
                    border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Send size={16} color={input.trim() ? '#fff' : '#94a3b8'} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </InstructorLayout>
  );
}
