import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import apiClient from '../services/apiClient';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerFcmToken = async (): Promise<void> => {
  try {
    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name:       'Learnova Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366f1',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    // Get the native FCM device token (not Expo push token)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const fcmToken  = tokenData.data as string;

    if (fcmToken) {
      await apiClient.patch('/me/fcm-token', { fcmToken });
    }
  } catch (err: any) {
    // Non-fatal — push notifications are optional
    console.warn('[FCM Mobile] Token registration failed:', err?.message);
  }
};

export const clearFcmToken = async (): Promise<void> => {
  try {
    await apiClient.delete('/me/fcm-token');
  } catch {
    // ignore
  }
};

export interface PushPayload {
  title: string;
  body: string;
  type: string | null;
  url: string | null;
}

const toPushPayload = (content: Notifications.NotificationContent): PushPayload => ({
  title: content.title ?? '',
  body:  content.body ?? '',
  type:  (content.data?.type as string) ?? null,
  url:   (content.data?.url as string) ?? null,
});

/** Listen for pushes that arrive while the app is in the foreground. Returns an unsubscribe fn. */
export const listenForegroundMessages = (onNotification: (payload: PushPayload) => void): (() => void) => {
  const sub = Notifications.addNotificationReceivedListener((event) => {
    onNotification(toPushPayload(event.request.content));
  });
  return () => sub.remove();
};

/** Listen for the user tapping a push notification (foreground, background, or cold start). Returns an unsubscribe fn. */
export const listenNotificationTaps = (onTap: (payload: PushPayload) => void): (() => void) => {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    onTap(toPushPayload(response.notification.request.content));
  });
  return () => sub.remove();
};
