import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  BookOpen, Layers, FileText, Plus, Trash2, ChevronRight,
  ChevronLeft, Search, Edit2, Upload, X, Save,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import {
  fetchMyCourses, fetchMySubjects, fetchMyLessons,
  createLesson, updateLessonMeta, deleteLesson,
} from '../services/instructorService';
import type { InstructorCourse, InstructorSubject, InstructorLesson } from '../../../types/instructor';
import type { InstructorStackParamList } from '../../../types/navigation';

type Nav = NativeStackNavigationProp<InstructorStackParamList>;

const formatGradeName = (l: number | null | undefined) => l !== null && l !== undefined ? `Grade ${l}` : '';

type DrillLevel = 'courses' | 'subjects' | 'lessons';

interface Props { isSchool: boolean; }

export function InstructorCoursesTab({ isSchool }: Props) {
  const { T } = useTheme();
  const nav = useNavigation<Nav>();

  const [courses,    setCourses]    = useState<InstructorCourse[]>([]);
  const [subjects,   setSubjects]   = useState<InstructorSubject[]>([]);
  const [lessons,    setLessons]    = useState<InstructorLesson[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');

  // Drill state
  const [level,          setLevel]          = useState<DrillLevel>('courses');
  const [selectedCourse, setSelectedCourse] = useState<InstructorCourse | null>(null);
  const [selectedSubject,setSelectedSubject]= useState<InstructorSubject | null>(null);
  const [subLoading,     setSubLoading]     = useState(false);
  const [lessonLoading,  setLessonLoading]  = useState(false);

  // Lesson create modal
  const [lessonModal, setLessonModal] = useState(false);
  const [lessonForm,  setLessonForm]  = useState({ title: '', description: '' });
  const [videoAsset,  setVideoAsset]  = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);
  const [uploadPct,    setUploadPct]   = useState(0);

  // Lesson edit modal
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<InstructorLesson | null>(null);
  const [editForm,  setEditForm]  = useState({ title: '', description: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadCourses = useCallback(async () => {
    try {
      const c = await fetchMyCourses();
      setCourses(c);
    } catch {
      Alert.alert('Error', 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (level === 'courses') await loadCourses();
    else if (level === 'subjects' && selectedCourse) {
      const s = await fetchMySubjects().catch(() => []);
      setSubjects(s.filter(x => x.courseId === selectedCourse.id));
    } else if (level === 'lessons' && selectedSubject) {
      const l = await fetchMyLessons({ Subject_id: selectedSubject.id }).catch(() => []);
      setLessons(l);
    }
    setRefreshing(false);
  }, [level, selectedCourse, selectedSubject, loadCourses]);

  const openCourse = useCallback(async (course: InstructorCourse) => {
    setSelectedCourse(course);
    setLevel('subjects');
    setSearch('');
    setSubLoading(true);
    try {
      const all = await fetchMySubjects();
      setSubjects(all.filter(s => s.courseId === course.id));
    } catch {
      Alert.alert('Error', 'Failed to load subjects.');
    } finally {
      setSubLoading(false);
    }
  }, []);

  const openSubject = useCallback(async (subject: InstructorSubject) => {
    setSelectedSubject(subject);
    setLevel('lessons');
    setSearch('');
    setLessonLoading(true);
    try {
      const l = await fetchMyLessons({ Subject_id: subject.id });
      setLessons(l);
    } catch {
      Alert.alert('Error', 'Failed to load lessons.');
    } finally {
      setLessonLoading(false);
    }
  }, []);

  const goBack = () => {
    setSearch('');
    if (level === 'lessons') { setLevel('subjects'); setSelectedSubject(null); }
    else if (level === 'subjects') { setLevel('courses'); setSelectedCourse(null); }
  };

  // ── Lesson create ──────────────────────────────────────────────────────────
  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setVideoAsset(result.assets[0]);
    }
  };

  const handleCreateLesson = async () => {
    if (!selectedSubject) return;
    if (!lessonForm.title.trim()) { Alert.alert('Required', 'Lesson title is required.'); return; }
    setSavingLesson(true);
    setUploadPct(0);
    try {
      const fd = new FormData();
      fd.append('title', lessonForm.title.trim());
      if (lessonForm.description.trim()) fd.append('description', lessonForm.description.trim());
      if (videoAsset) {
        fd.append('video', {
          uri: videoAsset.uri,
          name: videoAsset.fileName ?? 'video.mp4',
          type: 'video/mp4',
        } as unknown as Blob);
      }
      const lesson = await createLesson(selectedSubject.id, fd, setUploadPct);
      setLessons(prev => [lesson, ...prev]);
      setLessonModal(false);
      setLessonForm({ title: '', description: '' });
      setVideoAsset(null);
      Alert.alert('Success', `Lesson "${lesson.title}" created.${videoAsset ? ' AI processing will start shortly.' : ''}`);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to create lesson.');
    } finally {
      setSavingLesson(false);
    }
  };

  const openEdit = (lesson: InstructorLesson) => {
    setEditTarget(lesson);
    setEditForm({ title: lesson.title, description: lesson.description ?? '' });
    setEditModal(true);
  };

  const handleEditLesson = async () => {
    if (!editTarget || !selectedSubject) return;
    if (!editForm.title.trim()) { Alert.alert('Required', 'Title is required.'); return; }
    setSavingEdit(true);
    try {
      const updated = await updateLessonMeta(selectedSubject.id, editTarget.id, { title: editForm.title, description: editForm.description });
      setLessons(prev => prev.map(l => l.id === editTarget.id ? { ...l, ...updated } : l));
      setEditModal(false);
      Alert.alert('Success', 'Lesson updated.');
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to update.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteLesson = (lesson: InstructorLesson) => {
    if (!selectedSubject) return;
    Alert.alert('Delete', `Delete lesson "${lesson.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteLesson(selectedSubject.id, lesson.id);
          setLessons(prev => prev.filter(l => l.id !== lesson.id));
        } catch { Alert.alert('Error', 'Failed to delete.'); }
      }},
    ]);
  };

  const openLessonDetail = (lesson: InstructorLesson) => {
    nav.navigate('InstructorLessonDetail', {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      subjectId: lesson.subjectId ?? selectedSubject?.id ?? 0,
    });
  };

  // ── Filtered data ──────────────────────────────────────────────────────────
  const visibleCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(c => (c.Name ?? '').toLowerCase().includes(q));
  }, [courses, search]);

  const visibleSubjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(s => s.name.toLowerCase().includes(q));
  }, [subjects, search]);

  const visibleLessons = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lessons;
    return lessons.filter(l => l.title.toLowerCase().includes(q));
  }, [lessons, search]);

  if (loading) return <LoadingState message="Loading courses…" />;

  // ── Back bar (for drill-down levels) ───────────────────────────────────────
  const BackBar = () => (
    <View style={[styles.backBar, { borderBottomColor: T.border }]}>
      <TouchableOpacity style={styles.backBtn} onPress={goBack}>
        <ChevronLeft size={20} color={T.primary} />
        <Text style={[styles.backText, { color: T.primary }]}>
          {level === 'subjects' ? (isSchool ? 'Classes' : 'Courses') : 'Subjects'}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.drillTitle, { color: T.text }]} numberOfLines={1}>
        {level === 'subjects' ? selectedCourse?.Name : selectedSubject?.name}
      </Text>
    </View>
  );

  // ── Toolbar (search + add button) ─────────────────────────────────────────
  const Toolbar = ({ onAdd }: { onAdd?: () => void }) => (
    <View style={styles.toolbar}>
      <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
        <Search size={16} color={T.muted} />
        <TextInput
          style={[styles.searchInput, { color: T.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search…"
          placeholderTextColor={T.placeholder}
        />
      </View>
      {onAdd && (
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: T.primary }]} onPress={onAdd}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );

  // ── COURSES level ──────────────────────────────────────────────────────────
  if (level === 'courses') {
    return (
      <View style={[styles.root, { backgroundColor: T.background }]}>
        <Toolbar />
        <FlatList
          data={visibleCourses}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
          ListEmptyComponent={<EmptyState emoji="📂" title="No courses" subtitle="Courses assigned to you will appear here." />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: c }) => (
            <TouchableOpacity
              style={[styles.row, { backgroundColor: T.surface, borderColor: T.border }]}
              onPress={() => openCourse(c)}
              activeOpacity={0.8}
            >
              <View style={[styles.rowIcon, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
                <BookOpen size={20} color="#6366f1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: T.text }]}>{c.Name}</Text>
                {isSchool && c.GradeLevel !== null && c.GradeLevel !== undefined && (
                  <Text style={[styles.badge, { color: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)' }]}>
                    {formatGradeName(c.GradeLevel)}
                  </Text>
                )}
                {!isSchool && !!c.level && (
                  <Text style={[styles.sub, { color: T.muted }]}>{c.level}</Text>
                )}
              </View>
              <ChevronRight size={16} color={T.muted} />
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  // ── SUBJECTS level ─────────────────────────────────────────────────────────
  if (level === 'subjects') {
    return (
      <View style={[styles.root, { backgroundColor: T.background }]}>
        <BackBar />
        <Toolbar />
        {subLoading ? <LoadingState message="Loading subjects…" /> : (
          <FlatList
            data={visibleSubjects}
            keyExtractor={s => String(s.id)}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
            ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
            ListEmptyComponent={<EmptyState emoji="📚" title="No subjects" subtitle="No subjects found in this course." />}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: s }) => (
              <TouchableOpacity
                style={[styles.row, { backgroundColor: T.surface, borderColor: T.border }]}
                onPress={() => openSubject(s)}
                activeOpacity={0.8}
              >
                <View style={[styles.rowIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                  <Layers size={20} color="#10b981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: T.text }]}>{s.name}</Text>
                  {!!s.Description && (
                    <Text style={[styles.sub, { color: T.muted }]} numberOfLines={1}>{s.Description}</Text>
                  )}
                  {s.lessonsCount !== undefined && (
                    <Text style={[styles.sub, { color: T.muted }]}>{s.lessonsCount} lessons</Text>
                  )}
                </View>
                <ChevronRight size={16} color={T.muted} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  // ── LESSONS level ──────────────────────────────────────────────────────────
  return (
    <>
      <View style={[styles.root, { backgroundColor: T.background }]}>
        <BackBar />
        <Toolbar onAdd={() => { setLessonForm({ title: '', description: '' }); setVideoAsset(null); setLessonModal(true); }} />
        {lessonLoading ? <LoadingState message="Loading lessons…" /> : (
          <FlatList
            data={visibleLessons}
            keyExtractor={l => String(l.id)}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
            ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
            ListEmptyComponent={<EmptyState emoji="🎬" title="No lessons" subtitle="Tap + to create your first lesson." />}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: l }) => (
              <TouchableOpacity
                style={[styles.row, { backgroundColor: T.surface, borderColor: T.border }]}
                onPress={() => openLessonDetail(l)}
                activeOpacity={0.8}
              >
                <View style={[styles.rowIcon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                  <FileText size={20} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: T.text }]}>{l.title}</Text>
                  {!!l.description && (
                    <Text style={[styles.sub, { color: T.muted }]} numberOfLines={1}>{l.description}</Text>
                  )}
                  {!!l.videoUrl && (
                    <View style={[styles.videoBadge, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                      <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '700' }}>▶ VIDEO</Text>
                    </View>
                  )}
                  {l.aiContentPublished && (
                    <View style={[styles.videoBadge, { backgroundColor: 'rgba(99,102,241,0.1)' }]}>
                      <Text style={{ color: '#6366f1', fontSize: 10, fontWeight: '700' }}>🤖 AI Published</Text>
                    </View>
                  )}
                </View>
                <View style={styles.lessonActions}>
                  <TouchableOpacity onPress={() => openEdit(l)} style={styles.actionBtn}>
                    <Edit2 size={15} color={T.muted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteLesson(l)} style={styles.actionBtn}>
                    <Trash2 size={15} color="#ef4444" />
                  </TouchableOpacity>
                  <ChevronRight size={16} color={T.muted} />
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Create Lesson Modal */}
      <Modal visible={lessonModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Create Lesson</Text>
            <TouchableOpacity onPress={() => setLessonModal(false)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
                value={lessonForm.title}
                onChangeText={v => setLessonForm(prev => ({ ...prev, title: v }))}
                placeholder="Lesson title"
                placeholderTextColor={T.placeholder}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text, height: 80, textAlignVertical: 'top' }]}
                value={lessonForm.description}
                onChangeText={v => setLessonForm(prev => ({ ...prev, description: v }))}
                placeholder="Optional description"
                placeholderTextColor={T.placeholder}
                multiline
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Video (optional)</Text>
              <TouchableOpacity
                style={[styles.uploadBtn, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}
                onPress={pickVideo}
              >
                <Upload size={18} color={T.muted} />
                <Text style={[styles.uploadText, { color: videoAsset ? T.primary : T.muted }]}>
                  {videoAsset ? videoAsset.fileName ?? 'Video selected' : 'Pick a video from gallery'}
                </Text>
              </TouchableOpacity>
              {savingLesson && uploadPct > 0 && uploadPct < 100 && (
                <View style={styles.progressRow}>
                  <View style={[styles.progressBg, { backgroundColor: T.elevated }]}>
                    <View style={[styles.progressFill, { width: `${uploadPct}%` as `${number}%`, backgroundColor: T.primary }]} />
                  </View>
                  <Text style={[styles.progressText, { color: T.muted }]}>{uploadPct}%</Text>
                </View>
              )}
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setLessonModal(false)}>
              <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.primary }]} onPress={handleCreateLesson} disabled={savingLesson}>
              {savingLesson ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text style={[styles.footerBtnText, { color: '#fff' }]}>Create</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Lesson Modal */}
      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Edit Lesson</Text>
            <TouchableOpacity onPress={() => setEditModal(false)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Title *</Text>
              <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={editForm.title} onChangeText={v => setEditForm(prev => ({ ...prev, title: v }))} placeholder="Lesson title" placeholderTextColor={T.placeholder} />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Description</Text>
              <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text, height: 80, textAlignVertical: 'top' }]} value={editForm.description} onChangeText={v => setEditForm(prev => ({ ...prev, description: v }))} placeholder="Optional description" placeholderTextColor={T.placeholder} multiline />
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setEditModal(false)}>
              <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.primary }]} onPress={handleEditLesson} disabled={savingEdit}>
              {savingEdit ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text style={[styles.footerBtnText, { color: '#fff' }]}>Save</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  toolbar:      { flexDirection: 'row', gap: spacing[3], padding: spacing[4], paddingBottom: spacing[2] },
  searchBox:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing[3], height: 44 },
  searchInput:  { flex: 1, fontSize: fontSize.sm },
  addBtn:       { width: 44, height: 44, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  backBar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, gap: spacing[2] },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText:     { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  drillTitle:   { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  list:         { padding: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[10] },
  row:          { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  rowIcon:      { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  name:         { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  sub:          { fontSize: fontSize.xs, marginTop: 2 },
  badge:        { alignSelf: 'flex-start', fontSize: 10, fontWeight: '700', paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999, marginTop: 4 },
  videoBadge:   { alignSelf: 'flex-start', paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999, marginTop: 4 },
  lessonActions:{ flexDirection: 'row', gap: spacing[1], alignItems: 'center' },
  actionBtn:    { padding: spacing[1] },
  modal:        { flex: 1 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[5], paddingTop: spacing[6] },
  modalTitle:   { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  modalBody:    { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  field:        { gap: spacing[1] },
  fieldLabel:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  input:        { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm },
  uploadBtn:    { flexDirection: 'row', alignItems: 'center', gap: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', padding: spacing[4] },
  uploadText:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2] },
  progressBg:   { flex: 1, height: 6, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  progressText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, width: 36 },
  modalFooter:  { flexDirection: 'row', gap: spacing[3], padding: spacing[5], borderTopWidth: 1 },
  footerBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg },
  footerBtnText:{ fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
