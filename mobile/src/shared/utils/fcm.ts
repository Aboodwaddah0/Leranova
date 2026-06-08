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
