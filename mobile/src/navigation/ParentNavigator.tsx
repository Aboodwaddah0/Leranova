import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { LayoutDashboard, CalendarDays, User } from 'lucide-react-native';
import { useTheme } from '../shared/hooks/useTheme';
import type { ParentTabParamList, ParentStackParamList } from '../types/navigation';
import { ParentDashboardScreen }  from '../features/parent/screens/DashboardScreen';
import { ParentCalendarScreen }   from '../features/parent/screens/CalendarScreen';
import { ParentProfileScreen }    from '../features/parent/screens/SettingsScreen';
import { ChildDetailScreen }     from '../features/parent/screens/ChildDetailScreen';

const Tab   = createBottomTabNavigator<ParentTabParamList>();
const Stack = createNativeStackNavigator<ParentStackParamList>();

function ParentTabs() {
  const { T } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: T.tabBar, borderTopColor: T.tabBarBorder }],
        tabBarActiveTintColor:   T.tabActive,
        tabBarInactiveTintColor: T.tabInactive,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="ParentDashboard"
        component={ParentDashboardScreen}
        options={{ tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />, tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="ParentCalendar"
        component={ParentCalendarScreen}
        options={{ tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />, tabBarLabel: 'Calendar' }}
      />
      <Tab.Screen
        name="ParentProfile"
        component={ParentProfileScreen}
        options={{ tabBarIcon: ({ color, size }) => <User color={color} size={size} />, tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export function ParentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ParentTabs"  component={ParentTabs} />
      <Stack.Screen name="ChildDetail" component={ChildDetailScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
