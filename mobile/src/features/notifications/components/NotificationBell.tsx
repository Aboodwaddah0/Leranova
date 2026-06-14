import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchUnreadCount } from '../services/notificationService';
import { listenForegroundMessages, listenNotificationTaps } from '../../../shared/utils/fcm';
import type { StudentStackParamList } from '../../../types/navigation';

type Nav = NativeStackNavigationProp<StudentStackParamList>;

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell() {
  const nav = useNavigation<Nav>();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(() => {
    fetchUnreadCount().then(setUnreadCount).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);

    // Live update when a push notification arrives in the foreground
    const unsubForeground = listenForegroundMessages(() => refresh());

    // Jump straight to the inbox when the user taps a push notification
    const unsubTap = listenNotificationTaps(() => nav.navigate('Notifications'));

    return () => {
      clearInterval(interval);
      unsubForeground();
      unsubTap();
    };
  }, [refresh, nav]);

  return (
    <TouchableOpacity
      onPress={() => nav.navigate('Notifications')}
      activeOpacity={0.75}
      style={styles.btn}
    >
      <Bell size={20} color="#fff" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  badge: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 17, height: 17, borderRadius: 9,
    paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderWidth: 1.5, borderColor: '#0f0f1a',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
