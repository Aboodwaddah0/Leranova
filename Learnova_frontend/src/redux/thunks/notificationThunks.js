import api from "../../utils/api";
import { setNotifications, setUnreadCount, markOneRead, markAllRead, setLoading } from "../slices/notificationSlice";

export const fetchNotificationsThunk = () => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const { data } = await api.get("/notifications");
    dispatch(setNotifications(data.data.notifications));
    dispatch(setUnreadCount(data.data.unreadCount));
  } catch {
    // silent — user may not have NOTIFICATIONS feature
  } finally {
    dispatch(setLoading(false));
  }
};

export const fetchUnreadCountThunk = () => async (dispatch) => {
  try {
    const { data } = await api.get("/notifications/unread-count");
    dispatch(setUnreadCount(data.data.unreadCount));
  } catch {
    // silent
  }
};

export const markAsReadThunk = (id) => async (dispatch) => {
  try {
    await api.post(`/notifications/${id}/mark-as-read`);
    dispatch(markOneRead(id));
  } catch {
    // silent
  }
};

export const markAllReadThunk = () => async (dispatch) => {
  try {
    await api.post("/notifications/mark-all-read");
    dispatch(markAllRead());
  } catch {
    // silent
  }
};
