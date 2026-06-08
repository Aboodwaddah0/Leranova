import * as Notifications from 'expo-notifications';
import apiClient from './apiClient';

// ── Local notification helper ─────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function fireLocalNotification(opts: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
}): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title:  opts.title,
      body:   opts.body,
      data:   opts.data ?? {},
      sound:  true,
      badge:  opts.badge,
    },
    trigger: null, // fire immediately
  });
}

// ── Server test notification ──────────────────────────────────────────────────

export async function sendServerTestNotification(scenario: string): Promise<{
  scenario: string;
  pushSent: boolean;
  dbStored: boolean;
  role: string;
}> {
  const { data } = await apiClient.post('/notifications/test', { scenario });
  return data?.data ?? data;
}

export async function sendAllServerTestNotifications(): Promise<{
  sent: number;
  total: number;
  results: Array<{ scenario: string; success: boolean }>;
}> {
  const { data } = await apiClient.post('/notifications/test-all');
  return data?.data ?? data;
}
