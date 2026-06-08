import { createSlice } from "@reduxjs/toolkit";

const notificationSlice = createSlice({
  name: "notifications",
  initialState: {
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    setNotifications(state, action) {
      state.notifications = action.payload;
    },
    setUnreadCount(state, action) {
      state.unreadCount = action.payload;
    },
    markOneRead(state, action) {
      const notif = state.notifications.find((n) => n.id === action.payload);
      if (notif && !notif.isSeen) {
        notif.isSeen = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllRead(state) {
      state.notifications.forEach((n) => { n.isSeen = true; });
      state.unreadCount = 0;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    addNotification(state, action) {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
    },
  },
});

export const { setNotifications, setUnreadCount, markOneRead, markAllRead, setLoading, addNotification } =
  notificationSlice.actions;
export default notificationSlice.reducer;
