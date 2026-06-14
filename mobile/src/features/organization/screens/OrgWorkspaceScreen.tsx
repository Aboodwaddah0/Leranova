import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Building2, Users, BookOpen, GraduationCap, Users2, BarChart2,
  Trophy, School, DollarSign, CalendarDays, ClipboardList, FileText,
  LogOut, Globe,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { logout } from '../../../store/authSlice';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { OrgOverviewTab }    from '../tabs/OrgOverviewTab';
import { OrgTeachersTab }    from '../tabs/OrgTeachersTab';
import { OrgCoursesTab }     from '../tabs/OrgCoursesTab';
import { OrgStudentsTab }    from '../tabs/OrgStudentsTab';
import { OrgParentsTab }     from '../tabs/OrgParentsTab';
import { OrgMarksTab }       from '../tabs/OrgMarksTab';
import { OrgGradesTab }      from '../tabs/OrgGradesTab';
import { OrgSchoolTab }      from '../tabs/OrgSchoolTab';
import { OrgFinanceTab }     from '../tabs/OrgFinanceTab';
import { OrgCalendarTab }    from '../tabs/OrgCalendarTab';
import { OrgAttendanceTab }  from '../tabs/OrgAttendanceTab';
import { OrgReportsTab }     from '../tabs/OrgReportsTab';
import { fetchAcademicYears, fetchTerms } from '../services/organizationService';
import type { AcademicYear, Term } from '../../../types/organization';

// ── Tab definitions ───────────────────────────────────────────────────────────
const ALL_TABS = [
  { key: 'overview',    label: 'Overview',    icon: Building2,    schoolOnly: false, academyOnly: false },
  { key: 'teachers',    label: 'Teachers',    icon: Users,        schoolOnly: false, academyOnly: false },
  { key: 'courses',     label: 'Courses',     icon: BookOpen,     schoolOnly: false, academyOnly: false },
  { key: 'students',    label: 'Students',    icon: GraduationCap,schoolOnly: false, academyOnly: false },
  { key: 'parents',     label: 'Parents',     icon: Users2,       schoolOnly: true,  academyOnly: false },
  { key: 'marks',       label: 'Marks',       icon: BarChart2,    schoolOnly: true,  academyOnly: false },
  { key: 'grades',      label: 'Grades',      icon: Trophy,       schoolOnly: true,  academyOnly: false },
  { key: 'school',      label: 'Settings',    icon: School,       schoolOnly: true,  academyOnly: false },
  { key: 'finance',     label: 'Finance',     icon: DollarSign,   schoolOnly: false, academyOnly: true  },
  { key: 'calendar',    label: 'Calendar',    icon: CalendarDays, schoolOnly: true,  academyOnly: false },
  { key: 'attendance',  label: 'Attendance',  icon: ClipboardList,schoolOnly: true,  academyOnly: false },
  { key: 'reports',     label: 'Reports',     icon: FileText,     schoolOnly: false, academyOnly: false },
] as const;

type TabKey = typeof ALL_TABS[number]['key'];

export function OrgWorkspaceScreen() {
  const { T, isArabic, toggleLang } = useTheme();
  const insets   = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user     = useAppSelector(s => s.auth.user);

  const orgType: 'SCHOOL' | 'ACADEMY' = useMemo(() => {
    const r = (user?.role ?? user?.Role ?? user?.type ?? '').toUpperCase();
    return r === 'SCHOOL' ? 'SCHOOL' : 'ACADEMY';
  }, [user]);

  const orgName = user?.Name || user?.name || 'Organization';
  const isSchool = orgType === 'SCHOOL';

  const tabs = useMemo(() =>
    ALL_TABS.filter(t => {
      if (t.schoolOnly && !isSchool) return false;
      if (t.academyOnly && isSchool) return false;
      return true;
    }).map(t => t.key === 'courses' ? { ...t, label: isSchool ? 'Classes' : 'Specializations' } : t),
    [isSchool]
  );

  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Shared academic year state — loaded eagerly on workspace mount
  const [academicYears,  setAcademicYears]  = useState<AcademicYear[]>([]);
  const [allTerms,       setAllTerms]       = useState<Term[]>([]);
  const [viewingYearId,  setViewingYearId]  = useState<number | null>(null);

  // Load years eagerly so session selector is available on all tabs
  useEffect(() => {
    fetchAcademicYears()
      .then(async years => {
        setAcademicYears(years);
        const active = years.find(y => y.isActive);
        if (active) setViewingYearId(active.id);
        // Load all terms
        const termArrays = await Promise.all(years.map(y => fetchTerms(y.id).catch(() => [])));
        setAllTerms(termArrays.flat());
      })
      .catch(() => {});
  }, []);

  const handleYearsChange = useCallback((years: AcademicYear[], terms: Term[]) => {
    setAcademicYears(years);
    setAllTerms(terms);
    const active = years.find(y => y.isActive);
    setViewingYearId(prev => prev === null && active ? active.id : prev);
  }, []);

  const tabBarRef = useRef<ScrollView>(null);
  const tabIndex  = tabs.findIndex(t => t.key === activeTab);

  useEffect(() => {
    tabBarRef.current?.scrollTo({ x: Math.max(0, tabIndex * 80 - 80), animated: true });
  }, [tabIndex]);

  const handleLogout = () => {
    dispatch(logout());
  };

  // Year session selector (shown on marks/grades/attendance/calendar tabs)
  const showSessionSelector = isSchool && ['marks', 'grades', 'attendance', 'calendar', 'reports'].includes(activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OrgOverviewTab orgType={orgType} />;
      case 'teachers':
        return <OrgTeachersTab orgType={orgType} />;
      case 'courses':
        return <OrgCoursesTab orgType={orgType} />;
      case 'students':
        return <OrgStudentsTab orgType={orgType} />;
      case 'parents':
        return <OrgParentsTab orgType={orgType} />;
      case 'marks':
        return <OrgMarksTab orgType={orgType} academicYears={academicYears} viewingYearId={viewingYearId} />;
      case 'grades':
        return <OrgGradesTab orgType={orgType} academicYears={academicYears} viewingYearId={viewingYearId} terms={allTerms} />;
      case 'school':
        return <OrgSchoolTab orgType={orgType} onYearsChange={handleYearsChange} />;
      case 'finance':
        return <OrgFinanceTab orgType={orgType} />;
      case 'calendar':
        return <OrgCalendarTab orgType={orgType} viewingYearId={viewingYearId} academicYears={academicYears} />;
      case 'attendance':
        return <OrgAttendanceTab orgType={orgType} academicYears={academicYears} viewingYearId={viewingYearId} />;
      case 'reports':
        return <OrgReportsTab orgType={orgType} academicYears={academicYears} viewingYearId={viewingYearId} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      {/* Header */}
      <LinearGradient
        colors={isSchool ? ['#4f46e5', '#1e1b4b', '#312e81'] : ['#059669', '#064e3b', '#047857']}
        style={[styles.header, { paddingTop: insets.top + spacing[3] }]}
      >
        <View style={styles.headerRow}>
          <View style={[styles.orgIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Building2 size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.orgTypeBadge}>
              {isSchool ? '🏫 SCHOOL' : '🎓 ACADEMY'}
            </Text>
            <Text style={styles.orgName} numberOfLines={1}>{orgName}</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={toggleLang}>
            <Globe size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleLogout}>
            <LogOut size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* Session year selector (context-sensitive) */}
        {showSessionSelector && academicYears.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearBar} contentContainerStyle={styles.yearBarContent}>
            {academicYears.map(y => (
              <TouchableOpacity
                key={y.id}
                style={[
                  styles.yearChip,
                  { backgroundColor: viewingYearId === y.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)' },
                ]}
                onPress={() => setViewingYearId(y.id)}
              >
                <Text style={[styles.yearChipText, { color: viewingYearId === y.id ? '#fff' : 'rgba(255,255,255,0.65)' }]}>
                  {y.name}{y.isActive ? ' ●' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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
            const displayLabel = isSchool && key === 'courses' ? 'Classes' : label;
            return (
              <TouchableOpacity
                key={key}
                style={styles.tabItem}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.7}
              >
                <Icon
                  size={16}
                  color={isActive ? T.primary : T.muted}
                />
                <Text style={[styles.tabLabel, { color: isActive ? T.primary : T.muted }]}>
                  {displayLabel}
                </Text>
                {isActive && (
                  <View style={[styles.tabIndicator, { backgroundColor: T.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1 },
  header:         { paddingHorizontal: spacing[4], paddingBottom: spacing[3] },
  headerRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  orgIcon:        { width: 44, height: 44, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  orgTypeBadge:   { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  orgName:        { color: '#fff', fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  headerBtn:      { padding: spacing[2] },
  yearBar:        { marginTop: spacing[2], maxHeight: 38 },
  yearBarContent: { gap: spacing[2], paddingHorizontal: 2, paddingVertical: 2 },
  yearChip:       { paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: 999 },
  yearChipText:   { fontSize: 11, fontWeight: '700' },
  tabBarWrapper:  { borderBottomWidth: 1 },
  tabBarContent:  { paddingHorizontal: spacing[2] },
  tabItem:        { paddingHorizontal: spacing[3], paddingVertical: spacing[3], alignItems: 'center', gap: 4, position: 'relative', minWidth: 70 },
  tabLabel:       { fontSize: 11, fontWeight: '700' },
  tabIndicator:   { position: 'absolute', bottom: 0, left: spacing[2], right: spacing[2], height: 2.5, borderRadius: 99 },
  content:        { flex: 1 },
});
