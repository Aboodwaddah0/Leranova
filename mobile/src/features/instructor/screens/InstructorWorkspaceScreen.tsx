import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard, BookOpen, Users, BarChart2, FileText,
  ClipboardList, MessageSquare, Calendar, CalendarDays, Settings2,
  LogOut, Globe,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { logout } from '../../../store/authSlice';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState } from '../../../shared/components';
import { fetchInstructorProfile } from '../services/instructorService';
import { InstructorOverviewTab }    from '../tabs/InstructorOverviewTab';
import { InstructorCoursesTab }     from '../tabs/InstructorCoursesTab';
import { InstructorStudentsTab }    from '../tabs/InstructorStudentsTab';
import { InstructorAnalyticsTab }   from '../tabs/InstructorAnalyticsTab';
import { InstructorMarksTab }       from '../tabs/InstructorMarksTab';
import { InstructorAttendanceTab }  from '../tabs/InstructorAttendanceTab';
import { InstructorChatTab }        from '../tabs/InstructorChatTab';
import { InstructorTimetableTab }   from '../tabs/InstructorTimetableTab';
import { InstructorCalendarTab }    from '../tabs/InstructorCalendarTab';
import { InstructorSettingsTab }    from '../tabs/InstructorSettingsTab';
import type { InstructorProfile } from '../../../types/instructor';

const ALL_TABS = [
  { key: 'overview',    label: 'Overview',    icon: LayoutDashboard, schoolOnly: false },
  { key: 'courses',     label: 'Courses',     icon: BookOpen,        schoolOnly: false },
  { key: 'students',    label: 'Students',    icon: Users,           schoolOnly: false },
  { key: 'analytics',  label: 'Analytics',   icon: BarChart2,       schoolOnly: false },
  { key: 'marks',       label: 'Marks',       icon: FileText,        schoolOnly: true  },
  { key: 'attendance',  label: 'Attendance',  icon: ClipboardList,   schoolOnly: false },
  { key: 'chat',        label: 'Chat',        icon: MessageSquare,   schoolOnly: true  },
  { key: 'timetable',   label: 'Timetable',   icon: Calendar,        schoolOnly: true  },
  { key: 'calendar',    label: 'Calendar',    icon: CalendarDays,    schoolOnly: true  },
  { key: 'settings',    label: 'Settings',    icon: Settings2,       schoolOnly: false },
] as const;

type TabKey = typeof ALL_TABS[number]['key'];

export function InstructorWorkspaceScreen() {
  const { T, toggleLang } = useTheme();
  const insets   = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user     = useAppSelector(s => s.auth.user);

  const [profile,    setProfile]    = useState<InstructorProfile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<TabKey>('overview');

  // Determine if school instructor
  const isSchool = (
    (profile?.organization?.type ?? profile?.studentMode ?? '').toUpperCase() === 'SCHOOL' ||
    (user as { studentMode?: string })?.studentMode?.toUpperCase() === 'SCHOOL'
  );

  const tabs = ALL_TABS.filter(t => !t.schoolOnly || isSchool);

  useEffect(() => {
    fetchInstructorProfile()
      .then(p => setProfile(p))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tabBarRef = useRef<ScrollView>(null);
  const tabIndex  = tabs.findIndex(t => t.key === activeTab);
  useEffect(() => {
    tabBarRef.current?.scrollTo({ x: Math.max(0, tabIndex * 80 - 80), animated: true });
  }, [tabIndex]);

  const handleLogout = () => dispatch(logout());

  const renderContent = () => {
    if (loading) return <LoadingState message="Loading workspace…" />;
    switch (activeTab) {
      case 'overview':   return <InstructorOverviewTab   isSchool={isSchool} />;
      case 'courses':    return <InstructorCoursesTab    isSchool={isSchool} />;
      case 'students':   return <InstructorStudentsTab   isSchool={isSchool} />;
      case 'analytics':  return <InstructorAnalyticsTab  isSchool={isSchool} />;
      case 'marks':      return <InstructorMarksTab      isSchool={isSchool} />;
      case 'attendance': return <InstructorAttendanceTab isSchool={isSchool} />;
      case 'chat':       return <InstructorChatTab       isSchool={isSchool} />;
      case 'timetable':  return <InstructorTimetableTab  isSchool={isSchool} />;
      case 'calendar':   return <InstructorCalendarTab   isSchool={isSchool} />;
      case 'settings':   return <InstructorSettingsTab   isSchool={isSchool} />;
      default: return null;
    }
  };

  const instructorName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : (user?.name ?? user?.Name ?? 'Instructor');
  const orgName = profile?.organization?.Name ?? '';

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#065f46', '#0f172a', '#064e3b']}
        style={[styles.header, { paddingTop: insets.top + spacing[3] }]}
      >
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={styles.avatarText}>{instructorName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>
              👨‍🏫 {isSchool ? 'SCHOOL TEACHER' : 'INSTRUCTOR'}
            </Text>
            <Text style={styles.name} numberOfLines={1}>{instructorName}</Text>
            {!!orgName && <Text style={styles.org} numberOfLines={1}>{orgName}</Text>}
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={toggleLang}>
            <Globe size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleLogout}>
            <LogOut size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <View style={[styles.tabBarWrapper, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        <ScrollView
          ref={tabBarRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {tabs.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={styles.tabItem}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.7}
              >
                <Icon size={15} color={isActive ? T.primary : T.muted} />
                <Text style={[styles.tabLabel, { color: isActive ? T.primary : T.muted }]}>{label}</Text>
                {isActive && <View style={[styles.tabIndicator, { backgroundColor: T.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  header:        { paddingHorizontal: spacing[4], paddingBottom: spacing[3] },
  headerRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  avatar:        { width: 44, height: 44, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { color: '#fff', fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  eyebrow:       { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  name:          { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  org:           { color: 'rgba(255,255,255,0.55)', fontSize: fontSize.xs },
  headerBtn:     { padding: spacing[2] },
  tabBarWrapper: { borderBottomWidth: 1 },
  tabBarContent: { paddingHorizontal: spacing[2] },
  tabItem:       { paddingHorizontal: spacing[3], paddingVertical: spacing[3], alignItems: 'center', gap: 4, minWidth: 72, position: 'relative' },
  tabLabel:      { fontSize: 10, fontWeight: '700' },
  tabIndicator:  { position: 'absolute', bottom: 0, left: spacing[2], right: spacing[2], height: 2.5, borderRadius: 99 },
  content:       { flex: 1 },
});
