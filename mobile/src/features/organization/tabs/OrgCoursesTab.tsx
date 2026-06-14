import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
  ScrollView, Image, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import {
  BookOpen, Plus, Edit2, Trash2, X, Save, ChevronRight, ChevronDown,
  ChevronLeft, Layers, Search, ImagePlus, FileText, Download, PlayCircle,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import {
  fetchCourses, createCourse, updateCourse, deleteCourse,
  fetchSubjects, createSubject, updateSubject, deleteSubject,
  fetchTeachers, uploadSubjectImage, fetchSubjectLessons,
} from '../services/organizationService';
import type { OrgCourse, OrgSubject, OrgTeacher, OrgLesson } from '../../../types/organization';

const formatClassName = (course: OrgCourse, isSchool: boolean): string => {
  if (!isSchool) return course.Name ?? '';
  if (course.GradeLevel !== null && course.GradeLevel !== undefined) return `Class ${course.GradeLevel}`;
  return course.Name ?? '';
};

const LEVEL_OPTIONS = [
  { value: 'BEGINNER',     label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED',     label: 'Advanced' },
  { value: 'EXPERT',       label: 'Expert' },
];

const COURSE_FORM_INIT = { Name: '', Description: '', GradeLevel: '' };
const SUBJECT_FORM_INIT = { name: '', Description: '', Teacher_id: '', level: '', isPaid: false, price: '' };

interface Props { orgType: 'SCHOOL' | 'ACADEMY'; }

export function OrgCoursesTab({ orgType }: Props) {
  const { T } = useTheme();
  const isSchool = orgType === 'SCHOOL';

  const [courses,    setCourses]    = useState<OrgCourse[]>([]);
  const [teachers,   setTeachers]   = useState<OrgTeacher[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');

  // Drill-down: selected course → subjects
  const [drillCourse,  setDrillCourse]  = useState<OrgCourse | null>(null);
  const [subjects,     setSubjects]     = useState<OrgSubject[]>([]);
  const [subLoading,   setSubLoading]   = useState(false);

  // Drill-down: selected subject → lessons (view-only)
  const [drillSubject,   setDrillSubject]   = useState<OrgSubject | null>(null);
  const [lessons,        setLessons]        = useState<OrgLesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [playingLesson,  setPlayingLesson]  = useState<number | null>(null);
  const [videoLoading,   setVideoLoading]   = useState(false);

  // Modals
  const [courseModal, setCourseModal] = useState<'add' | 'edit' | null>(null);
  const [subjectModal, setSubjectModal] = useState<'add' | 'edit' | null>(null);
  const [selCourse,   setSelCourse]   = useState<OrgCourse | null>(null);
  const [selSubject,  setSelSubject]  = useState<OrgSubject | null>(null);
  const [courseForm,  setCourseForm]  = useState({ ...COURSE_FORM_INIT });
  const [subjectForm, setSubjectForm] = useState({ ...SUBJECT_FORM_INIT });
  const [saving,      setSaving]      = useState(false);
  const [courseImageAsset,   setCourseImageAsset]   = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [courseImagePreview, setCourseImagePreview] = useState('');
  const [subjectImageAsset,   setSubjectImageAsset]   = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [subjectImagePreview, setSubjectImagePreview] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([fetchCourses(), fetchTeachers().catch(() => [])]);
      setCourses(c);
      setTeachers(t);
    } catch {
      Alert.alert('Error', 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (drillSubject) {
      const data = await fetchSubjectLessons(drillSubject.id).catch(() => []);
      setLessons(data);
    } else if (drillCourse) {
      const data = await fetchSubjects(drillCourse.id).catch(() => []);
      setSubjects(data);
    } else {
      await load();
    }
    setRefreshing(false);
  }, [load, drillCourse, drillSubject]);

  const openCourse = useCallback(async (c: OrgCourse) => {
    setDrillCourse(c);
    setSubLoading(true);
    const data = await fetchSubjects(c.id).catch(() => []);
    setSubjects(data);
    setSubLoading(false);
  }, []);

  const enterSubject = useCallback(async (s: OrgSubject) => {
    setDrillSubject(s);
    setExpandedLesson(null);
    setLessonsLoading(true);
    const data = await fetchSubjectLessons(s.id).catch(() => []);
    setLessons(data);
    setLessonsLoading(false);
  }, []);

  const visibleCourses = useMemo(() => {
    const sorted = isSchool
      ? [...courses].sort((a, b) => {
          const aL = a.GradeLevel ?? 9999;
          const bL = b.GradeLevel ?? 9999;
          return Number(aL) - Number(bL);
        })
      : courses;
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(c => formatClassName(c, isSchool).toLowerCase().includes(q));
  }, [courses, search, isSchool]);

  // ── Course CRUD ─────────────────────────────────────────────────────────────
  const openAddCourse = () => {
    setCourseForm({ ...COURSE_FORM_INIT });
    setSelCourse(null);
    setCourseImageAsset(null);
    setCourseImagePreview('');
    setCourseModal('add');
  };
  const openEditCourse = (c: OrgCourse) => {
    setSelCourse(c);
    setCourseForm({ Name: c.Name || '', Description: c.Description || '', GradeLevel: String(c.GradeLevel ?? '') });
    setCourseImageAsset(null);
    setCourseImagePreview(c.Thumbnail || '');
    setCourseModal('edit');
  };
  const pickCourseImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    setCourseImageAsset(result.assets[0]);
    setCourseImagePreview(result.assets[0].uri);
  };
  const handleSaveCourse = async () => {
    if (!courseForm.Name.trim()) { Alert.alert('Validation', `${isSchool ? 'Class' : 'Specialization'} name is required.`); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('Name', courseForm.Name);
      if (courseForm.Description) fd.append('Description', courseForm.Description);
      if (isSchool && courseForm.GradeLevel) fd.append('GradeLevel', courseForm.GradeLevel);
      if (courseImageAsset) {
        fd.append('thumbnail', {
          uri: courseImageAsset.uri,
          name: courseImageAsset.fileName ?? 'thumbnail.jpg',
          type: courseImageAsset.mimeType ?? 'image/jpeg',
        } as unknown as Blob);
      }
      if (courseModal === 'add') {
        const c = await createCourse(fd);
        setCourses(prev => [...prev, c]);
      } else if (selCourse) {
        const c = await updateCourse(selCourse.id, fd);
        setCourses(prev => prev.map(x => x.id === selCourse.id ? { ...x, ...c } : x));
        if (drillCourse?.id === selCourse.id) setDrillCourse({ ...drillCourse, ...c });
      }
      setCourseModal(null);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteCourse = (c: OrgCourse) => {
    Alert.alert('Delete', `Delete "${formatClassName(c, isSchool)}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteCourse(c.id); setCourses(prev => prev.filter(x => x.id !== c.id)); }
        catch { Alert.alert('Error', 'Failed to delete.'); }
      }},
    ]);
  };

  // ── Subject CRUD ─────────────────────────────────────────────────────────────
  const openAddSubject = () => {
    setSubjectForm({ ...SUBJECT_FORM_INIT });
    setSelSubject(null);
    setSubjectImageAsset(null);
    setSubjectImagePreview('');
    setSubjectModal('add');
  };
  const openEditSubject = (s: OrgSubject) => {
    setSelSubject(s);
    setSubjectForm({ name: s.name || '', Description: s.Description || '', Teacher_id: String(s.Teacher_id ?? ''), level: s.level || '', isPaid: s.isPaid ?? false, price: String(s.price ?? '') });
    setSubjectImageAsset(null);
    setSubjectImagePreview(s.imageUrl || '');
    setSubjectModal('edit');
  };
  const pickSubjectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    setSubjectImageAsset(result.assets[0]);
    setSubjectImagePreview(result.assets[0].uri);
  };
  const handleSaveSubject = async () => {
    if (!drillCourse) return;
    if (!subjectForm.name.trim()) { Alert.alert('Validation', `${isSchool ? 'Subject' : 'Course'} name is required.`); return; }
    if (!isSchool && subjectForm.isPaid && (!subjectForm.price || Number(subjectForm.price) <= 0)) {
      Alert.alert('Validation', 'Price must be greater than 0 for a paid course.');
      return;
    }
    setSaving(true);
    try {
      let imageUrl = subjectImagePreview && !subjectImageAsset ? subjectImagePreview : '';
      if (subjectImageAsset) {
        const fd = new FormData();
        fd.append('image', {
          uri: subjectImageAsset.uri,
          name: subjectImageAsset.fileName ?? 'image.jpg',
          type: subjectImageAsset.mimeType ?? 'image/jpeg',
        } as unknown as Blob);
        const uploaded = await uploadSubjectImage(drillCourse.id, fd);
        imageUrl = uploaded.imageUrl || imageUrl;
      }
      const payload = {
        name: subjectForm.name,
        Description: subjectForm.Description || undefined,
        ...(subjectForm.Teacher_id ? { Teacher_id: Number(subjectForm.Teacher_id) } : {}),
        ...(!isSchool ? { isPaid: Boolean(subjectForm.isPaid), price: subjectForm.isPaid ? Number(subjectForm.price) || 0 : 0, level: subjectForm.level || null } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      };
      if (subjectModal === 'add') {
        const s = await createSubject(drillCourse.id, payload);
        setSubjects(prev => [...prev, s]);
      } else if (selSubject) {
        const s = await updateSubject(drillCourse.id, selSubject.id, payload);
        setSubjects(prev => prev.map(x => x.id === selSubject.id ? { ...x, ...s } : x));
      }
      setSubjectModal(null);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteSubject = (s: OrgSubject) => {
    if (!drillCourse) return;
    Alert.alert('Delete', `Delete ${isSchool ? 'subject' : 'course'} "${s.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteSubject(drillCourse.id, s.id); setSubjects(prev => prev.filter(x => x.id !== s.id)); }
        catch { Alert.alert('Error', 'Failed to delete.'); }
      }},
    ]);
  };

  if (loading) return <LoadingState message={`Loading ${isSchool ? 'classes' : 'specializations'}…`} />;

  // ── Lesson list view (drill-down, view-only) ────────────────────────────────
  if (drillCourse && drillSubject) {
    return (
      <View style={[styles.root, { backgroundColor: T.background }]}>
        {/* Back bar */}
        <View style={[styles.backBar, { borderBottomColor: T.border }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setDrillSubject(null)}>
            <ChevronLeft size={20} color={T.primary} />
            <Text style={[styles.backText, { color: T.primary }]}>{isSchool ? 'Subjects' : 'Courses'}</Text>
          </TouchableOpacity>
          <Text style={[styles.drillTitle, { color: T.text }]} numberOfLines={1}>{drillSubject.name}</Text>
        </View>

        {lessonsLoading ? <LoadingState message="Loading lessons…" /> : (
          <FlatList
            data={lessons}
            keyExtractor={l => String(l.id)}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
            ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
            ListEmptyComponent={<EmptyState emoji="🎬" title="No lessons yet" subtitle="The teacher hasn't added any lessons here yet." />}
            renderItem={({ item: l, index }) => {
              const isOpen = expandedLesson === l.id;
              const files = (l.attachments || []).filter(a => String(a.fileType || a.type || '').toUpperCase() !== 'VIDEO');
              const isPlaying = playingLesson === l.id;
              return (
                <View style={[styles.lessonCard, { backgroundColor: T.surface, borderColor: T.border }]}>
                  <TouchableOpacity
                    style={styles.lessonHeader}
                    onPress={() => {
                      const next = isOpen ? null : l.id;
                      setExpandedLesson(next);
                      setPlayingLesson(null);
                      setVideoLoading(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.lessonIndex, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
                      <Text style={{ color: '#6366f1', fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: T.text }]} numberOfLines={1}>{l.title || l.name || '-'}</Text>
                      {!!l.description && <Text style={[styles.sub, { color: T.muted }]} numberOfLines={1}>{l.description}</Text>}
                    </View>
                    {isOpen ? <ChevronDown size={18} color={T.muted} /> : <ChevronRight size={18} color={T.muted} />}
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={[styles.lessonBody, { borderTopColor: T.border }]}>
                      {l.videoUrl ? (
                        isPlaying ? (
                          <View style={styles.video}>
                            <Video
                              source={{ uri: l.videoUrl }}
                              style={styles.video}
                              useNativeControls
                              shouldPlay
                              resizeMode={ResizeMode.CONTAIN}
                              onLoadStart={() => setVideoLoading(true)}
                              onReadyForDisplay={() => setVideoLoading(false)}
                              onError={() => {
                                setVideoLoading(false);
                                Alert.alert('Error', 'Failed to load this video.');
                                setPlayingLesson(null);
                              }}
                            />
                            {videoLoading && (
                              <View style={styles.videoOverlay}>
                                <ActivityIndicator size="large" color="#fff" />
                              </View>
                            )}
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.video, styles.videoPlaceholder]}
                            onPress={() => { setPlayingLesson(l.id); setVideoLoading(true); }}
                            activeOpacity={0.85}
                          >
                            <PlayCircle size={48} color="#fff" />
                            <Text style={styles.videoPlaceholderText}>Tap to play video</Text>
                          </TouchableOpacity>
                        )
                      ) : (
                        <Text style={[styles.hint, { color: T.muted }]}>No video for this lesson.</Text>
                      )}
                      {files.length > 0 && (
                        <View style={styles.attachmentList}>
                          {files.map(att => (
                            <TouchableOpacity
                              key={att.id}
                              style={[styles.attachmentRow, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}
                              onPress={() => { const url = att.fileUrl || att.url; if (url) Linking.openURL(url); }}
                            >
                              <FileText size={16} color="#6366f1" />
                              <Text style={[styles.attachmentName, { color: T.text }]} numberOfLines={1}>{att.originalName || att.name || 'File'}</Text>
                              <Download size={14} color={T.muted} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  // ── Subject list view (drill-down) ──────────────────────────────────────────
  if (drillCourse) {
    return (
      <>
        <View style={[styles.root, { backgroundColor: T.background }]}>
          {/* Back bar */}
          <View style={[styles.backBar, { borderBottomColor: T.border }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setDrillCourse(null)}>
              <ChevronLeft size={20} color={T.primary} />
              <Text style={[styles.backText, { color: T.primary }]}>{isSchool ? 'Classes' : 'Specializations'}</Text>
            </TouchableOpacity>
            <Text style={[styles.drillTitle, { color: T.text }]} numberOfLines={1}>{formatClassName(drillCourse, isSchool)}</Text>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: T.primary }]} onPress={openAddSubject}>
              <Plus size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {subLoading ? <LoadingState message="Loading subjects…" /> : (
            <FlatList
              data={subjects}
              keyExtractor={s => String(s.id)}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
              ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
              ListEmptyComponent={<EmptyState emoji="📚" title={`No ${isSchool ? 'subjects' : 'courses'} yet`} subtitle={`Add ${isSchool ? 'subjects' : 'courses'} to this ${isSchool ? 'class' : 'specialization'}.`} />}
              renderItem={({ item: s }) => (
                <TouchableOpacity style={[styles.row, { backgroundColor: T.surface, borderColor: T.border }]} onPress={() => enterSubject(s)} activeOpacity={0.8}>
                  <View style={[styles.subIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                    <Layers size={18} color="#10b981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: T.text }]}>{s.name}</Text>
                    {s.teacher && (
                      <Text style={[styles.sub, { color: T.muted }]}>
                        {s.teacher.firstName} {s.teacher.lastName}
                      </Text>
                    )}
                    {s.lessonsCount !== undefined && (
                      <Text style={[styles.sub, { color: T.muted }]}>{s.lessonsCount} lesson(s)</Text>
                    )}
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => openEditSubject(s)} style={styles.actionBtn}>
                      <Edit2 size={16} color={T.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteSubject(s)} style={styles.actionBtn}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                    <ChevronRight size={16} color={T.muted} />
                  </View>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Subject Modal */}
        <Modal visible={!!subjectModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modal, { backgroundColor: T.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: T.text }]}>
                {subjectModal === 'add' ? `Add ${isSchool ? 'Subject' : 'Course'}` : `Edit ${isSchool ? 'Subject' : 'Course'}`}
              </Text>
              <TouchableOpacity onPress={() => setSubjectModal(null)}>
                <X size={22} color={T.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {([
                { key: 'name', label: `${isSchool ? 'Subject' : 'Course'} Name *`, placeholder: 'e.g. Mathematics' },
                { key: 'Description', label: 'Description', placeholder: 'Short description', multiline: true },
              ] as const).map(({ key, label, placeholder, multiline }: { key: string; label: string; placeholder: string; multiline?: boolean }) => (
                <View key={key} style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: T.subtext }]}>{label}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }, multiline && { height: 70, textAlignVertical: 'top' }]}
                    value={String((subjectForm as unknown as Record<string, unknown>)[key] ?? '')}
                    onChangeText={v => setSubjectForm(prev => ({ ...prev, [key]: v }))}
                    placeholder={placeholder}
                    placeholderTextColor={T.placeholder}
                    multiline={multiline}
                  />
                </View>
              ))}

              {/* Image */}
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>Image</Text>
                {subjectImagePreview ? (
                  <Image source={{ uri: subjectImagePreview }} style={styles.imagePreview} />
                ) : null}
                <TouchableOpacity style={[styles.imagePickBtn, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]} onPress={pickSubjectImage}>
                  <ImagePlus size={16} color={T.muted} />
                  <Text style={{ color: T.muted, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>{subjectImagePreview ? 'Change image' : 'Choose image'}</Text>
                </TouchableOpacity>
              </View>

              {/* Teacher selector */}
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>Assign Teacher</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing[1] }}>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.chip, { borderColor: !subjectForm.Teacher_id ? T.primary : T.inputBorder, backgroundColor: !subjectForm.Teacher_id ? T.primary : T.inputBg }]}
                      onPress={() => setSubjectForm(prev => ({ ...prev, Teacher_id: '' }))}
                    >
                      <Text style={{ color: !subjectForm.Teacher_id ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>None</Text>
                    </TouchableOpacity>
                    {teachers.map(t => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.chip, { borderColor: subjectForm.Teacher_id === String(t.id) ? T.primary : T.inputBorder, backgroundColor: subjectForm.Teacher_id === String(t.id) ? T.primary : T.inputBg }]}
                        onPress={() => setSubjectForm(prev => ({ ...prev, Teacher_id: String(t.id) }))}
                      >
                        <Text style={{ color: subjectForm.Teacher_id === String(t.id) ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{t.firstName} {t.lastName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Level + Paid (academy only) */}
              {!isSchool && (
                <>
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: T.subtext }]}>Level</Text>
                    <View style={styles.levelRow}>
                      {LEVEL_OPTIONS.map(({ value, label }) => (
                        <TouchableOpacity
                          key={value}
                          style={[styles.chip, { borderColor: subjectForm.level === value ? T.primary : T.inputBorder, backgroundColor: subjectForm.level === value ? T.primary : T.inputBg }]}
                          onPress={() => setSubjectForm(prev => ({ ...prev, level: prev.level === value ? '' : value }))}
                        >
                          <Text style={{ color: subjectForm.level === value ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.toggleRow, { borderColor: T.inputBorder, backgroundColor: T.inputBg }]}
                    onPress={() => setSubjectForm(prev => ({ ...prev, isPaid: !prev.isPaid, price: !prev.isPaid ? prev.price : '' }))}
                  >
                    <View style={[styles.checkbox, { borderColor: T.inputBorder }, subjectForm.isPaid && { backgroundColor: T.primary, borderColor: T.primary }]} />
                    <Text style={{ color: T.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>Paid course</Text>
                  </TouchableOpacity>

                  {subjectForm.isPaid && (
                    <View style={styles.field}>
                      <Text style={[styles.fieldLabel, { color: T.subtext }]}>Price (USD) *</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
                        value={subjectForm.price}
                        onChangeText={v => setSubjectForm(prev => ({ ...prev, price: v }))}
                        placeholder="e.g. 19.99"
                        placeholderTextColor={T.placeholder}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  )}
                </>
              )}
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
              <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setSubjectModal(null)}>
                <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.primary }]} onPress={handleSaveSubject} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text style={[styles.footerBtnText, { color: '#fff' }]}>Save</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // ── Course list view ─────────────────────────────────────────────────────────
  return (
    <>
      <View style={[styles.root, { backgroundColor: T.background }]}>
        <View style={styles.toolbar}>
          <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
            <Search size={16} color={T.muted} />
            <TextInput style={[styles.searchInput, { color: T.text }]} value={search} onChangeText={setSearch} placeholder={`Search ${isSchool ? 'classes' : 'specializations'}…`} placeholderTextColor={T.placeholder} />
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: T.primary }]} onPress={openAddCourse}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={visibleCourses}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
          ListEmptyComponent={<EmptyState emoji="📂" title={`No ${isSchool ? 'classes' : 'specializations'} yet`} subtitle={`Create your first ${isSchool ? 'class' : 'specialization'}.`} />}
          renderItem={({ item: c }) => {
            const displayName = formatClassName(c, isSchool);
            const showRawName = isSchool && c.GradeLevel !== null && c.GradeLevel !== undefined && c.Name !== displayName;
            return (
            <TouchableOpacity style={[styles.row, { backgroundColor: T.surface, borderColor: T.border }]} onPress={() => openCourse(c)} activeOpacity={0.8}>
              <View style={[styles.subIcon, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
                <BookOpen size={20} color="#6366f1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: T.text }]}>{displayName}</Text>
                {showRawName && (
                  <Text style={[styles.sub, { color: T.muted }]}>{c.Name}</Text>
                )}
                {c.teacher && <Text style={[styles.sub, { color: T.muted }]}>{c.teacher.firstName} {c.teacher.lastName}</Text>}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEditCourse(c)} style={styles.actionBtn}>
                  <Edit2 size={16} color={T.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteCourse(c)} style={styles.actionBtn}>
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
                <ChevronRight size={16} color={T.muted} />
              </View>
            </TouchableOpacity>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Course Modal */}
      <Modal visible={!!courseModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>{courseModal === 'add' ? `Add ${isSchool ? 'Class' : 'Specialization'}` : `Edit ${isSchool ? 'Class' : 'Specialization'}`}</Text>
            <TouchableOpacity onPress={() => setCourseModal(null)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {isSchool ? (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>Grade Level *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
                  value={courseForm.GradeLevel}
                  onChangeText={v => setCourseForm(prev => ({ ...prev, GradeLevel: v, Name: v ? `Class ${v}` : '' }))}
                  placeholder="e.g. 1"
                  placeholderTextColor={T.placeholder}
                  keyboardType="number-pad"
                />
                <Text style={[styles.hint, { color: T.muted }]}>Classes are displayed as: Class 1, Class 2…</Text>
              </View>
            ) : (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>Specialization Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
                  value={courseForm.Name}
                  onChangeText={v => setCourseForm(prev => ({ ...prev, Name: v }))}
                  placeholder="Enter name"
                  placeholderTextColor={T.placeholder}
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text, height: 70, textAlignVertical: 'top' }]}
                value={courseForm.Description}
                onChangeText={v => setCourseForm(prev => ({ ...prev, Description: v }))}
                placeholder="Short description"
                placeholderTextColor={T.placeholder}
                multiline
              />
            </View>

            {/* Image */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Image</Text>
              {courseImagePreview ? (
                <Image source={{ uri: courseImagePreview }} style={styles.imagePreview} />
              ) : null}
              <TouchableOpacity style={[styles.imagePickBtn, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]} onPress={pickCourseImage}>
                <ImagePlus size={16} color={T.muted} />
                <Text style={{ color: T.muted, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>{courseImagePreview ? 'Change image' : 'Choose image'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setCourseModal(null)}>
              <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.primary }]} onPress={handleSaveCourse} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text style={[styles.footerBtnText, { color: '#fff' }]}>Save</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  toolbar:     { flexDirection: 'row', gap: spacing[3], padding: spacing[4], paddingBottom: spacing[2] },
  searchBox:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing[3], height: 44 },
  searchInput: { flex: 1, fontSize: fontSize.sm },
  addBtn:      { width: 44, height: 44, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  backBar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, gap: spacing[2] },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText:    { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  drillTitle:  { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  list:        { padding: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[10] },
  row:         { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  subIcon:     { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  name:        { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  sub:         { fontSize: fontSize.xs, marginTop: 2 },
  badge:       { alignSelf: 'flex-start', fontSize: 10, fontWeight: '700', paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999, marginTop: 4 },
  actions:     { flexDirection: 'row', gap: spacing[1], alignItems: 'center' },
  actionBtn:   { padding: spacing[2] },
  chipRow:     { flexDirection: 'row', gap: spacing[2], paddingBottom: spacing[1] },
  levelRow:    { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
  chip:        { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999, borderWidth: 1 },
  hint:        { fontSize: fontSize.xs, marginTop: 2 },
  imagePreview:{ width: '100%', height: 120, borderRadius: radius.lg, marginBottom: spacing[2] },
  imagePickBtn:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed' },
  toggleRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderRadius: radius.lg, borderWidth: 1 },
  checkbox:    { width: 18, height: 18, borderRadius: radius.sm, borderWidth: 2 },
  lessonCard:    { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  lessonHeader:  { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4] },
  lessonIndex:   { width: 28, height: 28, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  lessonBody:    { padding: spacing[4], borderTopWidth: 1, gap: spacing[2] },
  video:         { width: '100%', height: 200, borderRadius: radius.lg, backgroundColor: '#000', overflow: 'hidden' },
  videoOverlay:  { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  videoPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
  videoPlaceholderText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  attachmentList:{ gap: spacing[2], marginTop: spacing[2] },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderRadius: radius.lg, borderWidth: 1 },
  attachmentName:{ flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  modal:       { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[5], paddingTop: spacing[6] },
  modalTitle:  { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  modalBody:   { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  field:       { gap: spacing[1] },
  fieldLabel:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  input:       { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm },
  modalFooter: { flexDirection: 'row', gap: spacing[3], padding: spacing[5], borderTopWidth: 1 },
  footerBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg },
  footerBtnText:{ fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
