import apiClient, { unwrap, ensureArray } from '../../../shared/services/apiClient';

export interface NotificationItem {
  id: number | string;
  content: string;
  type: string;
  url: string | null;
  isSeen: boolean;
  createdAt: string;
}

export interface NotificationsPage {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  skip: number;
  limit: number;
}

export const fetchNotifications = async (params?: { skip?: number; limit?: number }): Promise<NotificationsPage> => {
  const res  = await apiClient.get('/notifications', { params });
  const data = unwrap<Partial<NotificationsPage>>(res) ?? {};
  return {
    notifications: ensureArray<NotificationItem>(data.notifications),
    total:         data.total ?? 0,
    unreadCount:   data.unreadCount ?? 0,
    skip:          data.skip ?? 0,
    limit:         data.limit ?? 20,
  };
};

export const fetchUnreadCount = async (): Promise<number> => {
  const res = await apiClient.get('/notifications/unread-count');
  return unwrap<{ unreadCount?: number }>(res)?.unreadCount ?? 0;
};

export const markNotificationAsRead = async (id: number | string): Promise<void> => {
  await apiClient.post(`/notifications/${id}/mark-as-read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await apiClient.post('/notifications/mark-all-read');
};
