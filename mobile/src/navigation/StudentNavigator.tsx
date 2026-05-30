import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Platform } from 'react-native';
import { LayoutDashboard, BookOpen, MessageCircle, Trophy, UserCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../shared/hooks/useTheme';
import type { StudentStackParamList, StudentTabParamList } from '../types/navigation';

// ── Screens ───────────────────────────────────────────────────────────────────
import { StudentDashboardScreen } from '../features/student/screens/DashboardScreen';
import { StudentProfileScreen }   from '../features/student/screens/ProfileScreen';
import { StudentSocialScreen }    from '../features/student/screens/SocialScreen';
import { CoursesScreen }          from '../features/courses/screens/CoursesScreen';
import { CourseDetailsScreen }    from '../features/courses/screens/CourseDetailsScreen';
import { SubjectScreen }          from '../features/subjects/screens/SubjectScreen';
import { LessonScreen }           from '../features/lessons/screens/LessonScreen';
import { ChatListScreen }         from '../features/chat/screens/ChatListScreen';
import { ChatRoomScreen }         from '../features/chat/screens/ChatRoomScreen';
import { TeachersScreen }         from '../features/student/screens/TeachersScreen';
import { TeacherProfileScreen }   from '../features/student/screens/TeacherProfileScreen';

const Tab   = createBottomTabNavigator<StudentTabParamList>();
const Stack = createNativeStackNavigator<StudentStackParamList>();

function StudentTabs() {
  const { T }  = useTheme();
  const insets = useSafeAreaInsets();
  // On Android the bottom inset covers the gesture/button nav bar.
  // Add it to the tab bar so icons don't hide behind it.
  const tabBarHeight = 56 + (Platform.OS === 'android' ? insets.bottom : 0);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: T.tabBar,
            borderTopColor:  T.tabBarBorder,
            height:          tabBarHeight,
            paddingBottom:   Platform.OS === 'android' ? insets.bottom + 4 : 8,
          },
        ],
        tabBarActiveTintColor:   T.tabActive,
        tabBarInactiveTintColor: T.tabInactive,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={StudentDashboardScreen}
        options={{ tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />, tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Courses"
        component={CoursesScreen}
        options={{ tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />, tabBarLabel: 'Courses' }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatListScreen}
        options={{ tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />, tabBarLabel: 'Chat' }}
      />
      <Tab.Screen
        name="Social"
        component={StudentSocialScreen}
        options={{ tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />, tabBarLabel: 'Social' }}
      />
      <Tab.Screen
        name="Profile"
        component={StudentProfileScreen}
        options={{ tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} />, tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export function StudentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentTabs"     component={StudentTabs} />
      <Stack.Screen name="CourseDetails"   component={CourseDetailsScreen} />
      <Stack.Screen name="SubjectLessons"  component={SubjectScreen} />
      <Stack.Screen name="Lesson"          component={LessonScreen} />
      <Stack.Screen name="Teachers"        component={TeachersScreen} />
      <Stack.Screen name="TeacherProfile"  component={TeacherProfileScreen} />
      <Stack.Screen name="ChatRoom"        component={ChatRoomScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: 6,
    borderTopWidth: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
