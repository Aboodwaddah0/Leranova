import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps }     from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import {
  LayoutDashboard, BookOpen, MessageCircle,
  Trophy, Users, UserCircle,
} from 'lucide-react-native';
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

// ── Tab icon renderer ─────────────────────────────────────────────────────────
function TabIcon({ name, color }: { name: string; color: string }) {
  const p = { size: 21, color, strokeWidth: 1.8 } as const;
  switch (name) {
    case 'Dashboard': return <LayoutDashboard {...p} />;
    case 'Courses':   return <BookOpen        {...p} />;
    case 'Chat':      return <MessageCircle   {...p} />;
    case 'Social':    return <Trophy          {...p} />;
    case 'Teachers':  return <Users           {...p} />;
    case 'Profile':   return <UserCircle      {...p} />;
    default:          return null;
  }
}

const TAB_LABELS: Record<string, string> = {
  Dashboard: 'Home',
  Courses:   'Courses',
  Chat:      'Chat',
  Social:    'Social',
  Teachers:  'Teachers',
  Profile:   'Profile',
};

// ── Animated single tab button ────────────────────────────────────────────────
function TabButton({
  routeName, isFocused, T, onPress,
}: {
  routeName: string;
  isFocused: boolean;
  T: ReturnType<typeof useTheme>['T'];
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFocused) {
      // Pop up + scale spring when tab becomes active
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.18, friction: 4, tension: 180, useNativeDriver: true,
        }),
        Animated.spring(translateAnim, {
          toValue: -3, friction: 4, tension: 180, useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.parallel([
          Animated.spring(scaleAnim,     { toValue: 1,  friction: 5, useNativeDriver: true }),
          Animated.spring(translateAnim, { toValue: 0,  friction: 5, useNativeDriver: true }),
        ]).start();
      });
    }
  }, [isFocused, scaleAnim, translateAnim]);

  const color = isFocused ? T.tabActive : T.tabInactive;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={tabStyles.tab}
      activeOpacity={0.72}
    >
      {/* Pill highlight */}
      <Animated.View
        style={[
          tabStyles.iconPill,
          isFocused && { backgroundColor: T.tabActive + '22' },
          { transform: [{ scale: scaleAnim }, { translateY: translateAnim }] },
        ]}
      >
        <TabIcon name={routeName} color={color} />
      </Animated.View>

      <Text
        style={[
          tabStyles.label,
          { color, fontWeight: isFocused ? '700' : '500' },
        ]}
      >
        {TAB_LABELS[routeName] ?? routeName}
      </Text>
    </TouchableOpacity>
  );
}

// ── Custom tab bar ────────────────────────────────────────────────────────────
function StudentTabBar({ state, navigation }: BottomTabBarProps) {
  const { T }  = useTheme();
  const insets = useSafeAreaInsets();
  const pb = (Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 4)) + 4;

  return (
    <View style={[tabStyles.bar, { backgroundColor: T.tabBar, paddingBottom: pb }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress', target: route.key, canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };
        return (
          <TabButton
            key={route.key}
            routeName={route.name}
            isFocused={isFocused}
            T={T}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

// ── Tab navigator ─────────────────────────────────────────────────────────────
function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <StudentTabBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={StudentDashboardScreen} />
      <Tab.Screen name="Courses"   component={CoursesScreen} />
      <Tab.Screen name="Chat"      component={ChatListScreen} />
      <Tab.Screen name="Social"    component={StudentSocialScreen} />
      <Tab.Screen name="Teachers"  component={TeachersScreen} />
      <Tab.Screen name="Profile"   component={StudentProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Root stack ────────────────────────────────────────────────────────────────
export function StudentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentTabs"    component={StudentTabs} />
      <Stack.Screen name="CourseDetails"  component={CourseDetailsScreen} />
      <Stack.Screen name="SubjectLessons" component={SubjectScreen} />
      <Stack.Screen name="Lesson"         component={LessonScreen} />
      <Stack.Screen name="TeacherProfile" component={TeacherProfileScreen} />
      <Stack.Screen name="ChatRoom"       component={ChatRoomScreen} />
    </Stack.Navigator>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const tabStyles = StyleSheet.create({
  bar: {
    flexDirection:        'row',
    paddingTop:           10,
    paddingHorizontal:    4,
    // Rounded top corners — gives a "floating card" feel
    borderTopLeftRadius:  22,
    borderTopRightRadius: 22,
    // iOS shadow (upward)
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: -3 },
    shadowOpacity: 0.10,
    shadowRadius:  14,
    // Android elevation
    elevation: 20,
  },

  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     2,
    gap:            3,
  },

  // Pill container behind icon
  iconPill: {
    width:          46,
    height:         30,
    borderRadius:   15,
    alignItems:     'center',
    justifyContent: 'center',
  },

  label: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
});
