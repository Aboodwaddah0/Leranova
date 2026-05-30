import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { LayoutDashboard, BarChart2, Settings } from 'lucide-react-native';
import { useTheme } from '../shared/hooks/useTheme';
import type { ParentTabParamList } from '../types/navigation';
import { ParentDashboardScreen } from '../features/parent/screens/DashboardScreen';
import { ParentMarksScreen }     from '../features/parent/screens/MarksScreen';
import { ParentSettingsScreen }  from '../features/parent/screens/SettingsScreen';

const Tab = createBottomTabNavigator<ParentTabParamList>();

export function ParentNavigator() {
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
        name="ParentMarks"
        component={ParentMarksScreen}
        options={{ tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />, tabBarLabel: 'Marks' }}
      />
      <Tab.Screen
        name="ParentSettings"
        component={ParentSettingsScreen}
        options={{ tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />, tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
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
