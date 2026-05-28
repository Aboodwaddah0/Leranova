import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../utils/i18n";
import {
  fetchNotificationsThunk,
  fetchUnreadCountThunk,
  markAsReadThunk,
  markAllReadThunk,
} from "../../redux/thunks/notificationThunks";

const formatTime = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

export default function NotificationDropdown({ variant = "auto" }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { isArabic } = useLanguage();
  const { notifications, unreadCount, loading } = useSelector((s) => s.notifications);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // "onDark" forces white/transparent style for headers with dark gradient backgrounds
  const onDark = variant === "onDark";

  useEffect(() => {
    dispatch(fetchUnreadCountThunk());
    const id = setInterval(() => dispatch(fetchUnreadCountThunk()), 60_000);
    return () => clearInterval(id);
  }, [dispatch]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = () => {
    setOpen((prev) => {
      if (!prev) dispatch(fetchNotificationsThunk());
      return !prev;
    });
  };

  const handleClick = (notif) => {
    if (!notif.isSeen) dispatch(markAsReadThunk(notif.id));
    if (notif.url) navigate(notif.url);
    setOpen(false);
  };

  const btnStyle = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 10,
    background: onDark ? "rgba(255,255,255,0.18)" : isDark ? "rgba(124,92,224,0.1)" : "rgba(107,92,231,0.08)",
    border: `1px solid ${onDark ? "rgba(255,255,255,0.3)" : isDark ? "rgba(124,92,224,0.2)" : "rgba(107,92,231,0.15)"}`,
    color: onDark ? "#ffffff" : isDark ? "#c4b5fd" : "#6b5ce7",
    cursor: "pointer",
    flexShrink: 0,
  };

  const panelStyle = {
    position: "absolute",
    top: "calc(100% + 8px)",
    [isArabic ? "left" : "right"]: 0,
    width: 340,
    borderRadius: 16,
    background: isDark ? "#2a2438" : "#fff",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
    boxShadow: isDark
      ? "0 8px 32px rgba(0,0,0,0.4)"
      : "0 8px 32px rgba(15,23,42,0.12)",
    zIndex: 9999,
    overflow: "hidden",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={toggle} style={btnStyle} aria-label={isArabic ? "الإشعارات" : "Notifications"}>
        <Bell size={16} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 16,
            height: 16,
            borderRadius: 999,
            background: "#ef4444",
            color: "#fff",
            fontSize: 9,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 3px",
            border: `2px solid ${isDark ? "#1a1625" : "#fff"}`,
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={panelStyle}
          >
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px 12px",
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9"}`,
            }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: isDark ? "#f5f3f7" : "#1e293b" }}>
                {isArabic ? "الإشعارات" : "Notifications"}
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch(markAllReadThunk())}
                  style={{ fontSize: 12, fontWeight: 700, color: "#7c5ce0", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  {isArabic ? "تحديد الكل كمقروء" : "Mark all read"}
                </button>
              )}
            </div>

            {/* List */}
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {loading && notifications.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8", fontSize: 13 }}>
                  {isArabic ? "جاري التحميل..." : "Loading..."}
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: "36px 16px", textAlign: "center" }}>
                  <Bell size={28} style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1", margin: "0 auto 10px" }} />
                  <p style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8", fontSize: 13 }}>
                    {isArabic ? "لا توجد إشعارات" : "No notifications yet"}
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => handleClick(notif)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: isArabic ? "right" : "left",
                      padding: "12px 16px",
                      background: notif.isSeen
                        ? "transparent"
                        : isDark ? "rgba(124,92,224,0.07)" : "rgba(107,92,231,0.04)",
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"}`,
                      borderLeft: !isArabic && !notif.isSeen ? "3px solid #7c5ce0" : notif.isSeen ? "3px solid transparent" : "3px solid transparent",
                      borderRight: isArabic && !notif.isSeen ? "3px solid #7c5ce0" : notif.isSeen ? "3px solid transparent" : "3px solid transparent",
                      cursor: "pointer",
                      transition: "background .15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = notif.isSeen ? "transparent" : isDark ? "rgba(124,92,224,0.07)" : "rgba(107,92,231,0.04)"; }}
                  >
                    <p style={{
                      fontSize: 13,
                      color: isDark ? "#f5f3f7" : "#1e293b",
                      fontWeight: notif.isSeen ? 400 : 600,
                      lineHeight: 1.45,
                      margin: 0,
                    }}>
                      {notif.content}
                    </p>
                    <p style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.38)" : "#94a3b8", margin: "4px 0 0" }}>
                      {formatTime(notif.createdAt)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
