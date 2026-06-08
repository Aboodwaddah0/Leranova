import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import {
  CalendarDays, Plus, Lock, Unlock, RefreshCw, CheckCircle,
  Archive, Settings, X, Save, ChevronDown, ChevronRight, Award,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState } from '../../../shared/components';
import {
  fetchAcademicYears, createAcademicYear, activateYear, deleteAcademicYear,
  fetchTerms, createTerm, activateTerm, reopenTerm,
  fetchSchoolSettings, updateSchoolSettings, runAnnualPromotion,
  fetchCertificateStatus, issueCertificates, publishCertificates, unpublishCertificates,
  fetchCourses,
} from '../services/organizationService';
import type { AcademicYear, Term, SchoolSettings, CertificateStatus, OrgCourse } from '../../../types/organization';

const TERM_STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  UPCOMING: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  ACTIVE:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  CLOSED:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  LOCKED:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

interface Props { orgType: 'SCHOOL' | 'ACADEMY'; onYearsChange?: (years: AcademicYear[], terms: Term[]) => void; }

export function OrgSchoolTab({ orgType, onYearsChange }: Props) {
  const { T } = useTheme();
  const isSchool = orgType === 'SCHOOL';

  const [years,      setYears]      = useState<AcademicYear[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded,   setExpanded]   = useState<number | null>(null);
  const [termsByYear, setTermsByYear] = useState<Record<number, Term[]>>({});
  const [allTerms,   setAllTerms]   = useState<Term[]>([]);
  const [settings,   setSettings]   = useState<SchoolSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Year form
  const [yearModal, setYearModal] = useState(false);
  const [yearForm,  setYearForm]  = useState({ name: '', startDate: '', endDate: '', numberOfTerms: '2' });
  const [savingYear, setSavingYear] = useState(false);

  // Term form
  const [termModal, setTermModal] = useState(false);
  const [termYearId, setTermYearId] = useState<number | null>(null);
  const [termForm,  setTermForm]  = useState({ name: '', startDate: '', endDate: '' });
  const [savingTerm, setSavingTerm] = useState(false);

  // Reopen modal
  const [reopenModal, setReopenModal] = useState(false);
  const [reopenTarget, setReopenTarget] = useState<{ yearId: number; term: Term } | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [doingReopen, setDoingReopen] = useState(false);

  // Certificates
  const [certStatus, setCertStatus] = useState<Record<string, CertificateStatus>>({});
  const [certLoading, setCertLoading] = useState<Record<string, boolean>>({});
  const [classCourses, setClassCourses] = useState<OrgCourse[]>([]);

  const loadYears = useCallback(async () => {
    const y = await fetchAcademicYears().catch(() => []);
    setYears(y);
    // Fetch terms for all years
    const termsMap: Record<number, Term[]> = {};
    const flat: Term[] = [];
    await Promise.all(y.map(async yr => {
      const t = await fetchTerms(yr.id).catch(() => []);
      termsMap[yr.id] = t;
      flat.push(...t);
    }));
    setTermsByYear(termsMap);
    setAllTerms(flat);
    onYearsChange?.(y, flat);
  }, [onYearsChange]);

  const load = useCallback(async () => {
    try {
      const [courses] = await Promise.all([
        fetchCourses().catch(() => []),
        loadYears(),
        isSchool ? fetchSchoolSettings().then(s => setSettings(s)).catch(() => {}) : Promise.resolve(),
      ]);
      setClassCourses(courses.filter((c: OrgCourse) => (c.kind || c.Kind || '').toString().toUpperCase() === 'CLASS'));
    } catch {
      Alert.alert('Error', 'Failed to load school settings.');
    } finally {
      setLoading(false);
    }
  }, [loadYears, isSchool]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Expand year → load terms
  const handleExpand = async (yearId: number) => {
    if (expanded === yearId) { setExpanded(null); return; }
    setExpanded(yearId);
    if (!termsByYear[yearId]) {
      const t = await fetchTerms(yearId).catch(() => []);
      setTermsByYear(prev => ({ ...prev, [yearId]: t }));
    }
  };

  const handleCreateYear = async () => {
    if (!yearForm.name.trim() || !yearForm.startDate || !yearForm.endDate) {
      Alert.alert('Validation', 'Name, start date and end date are required.');
      return;
    }
    setSavingYear(true);
    try {
      await createAcademicYear({ name: yearForm.name, startDate: yearForm.startDate, endDate: yearForm.endDate, numberOfTerms: Number(yearForm.numberOfTerms) || 2 });
      setYearModal(false);
      loadYears();
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to create year.');
    } finally {
      setSavingYear(false);
    }
  };

  const handleActivateYear = (yearId: number) => {
    Alert.alert('Activate Year', 'This will deactivate the current active year. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Activate', onPress: async () => {
        try { await activateYear(yearId); loadYears(); Alert.alert('Success', 'Year activated.'); }
        catch (e: unknown) { Alert.alert('Error', (e as Error).message || 'Failed.'); }
      }},
    ]);
  };

  const handleCreateTerm = async () => {
    if (!termYearId || !termForm.name.trim() || !termForm.startDate || !termForm.endDate) {
      Alert.alert('Validation', 'All fields required.');
      return;
    }
    setSavingTerm(true);
    try {
      const t = await createTerm(termYearId, { name: termForm.name, startDate: termForm.startDate, endDate: termForm.endDate });
      setTermsByYear(prev => ({ ...prev, [termYearId]: [...(prev[termYearId] ?? []), t] }));
      setAllTerms(prev => [...prev, t]);
      setTermModal(false);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed.');
    } finally {
      setSavingTerm(false);
    }
  };

  const handleActivateTerm = async (yearId: number, termId: number) => {
    try {
      await activateTerm(yearId, termId);
      const updated = await fetchTerms(yearId);
      setTermsByYear(prev => ({ ...prev, [yearId]: updated }));
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed.');
    }
  };

  const handleReopen = async () => {
    if (!reopenTarget || !reopenReason.trim()) { Alert.alert('Required', 'Please enter a reason.'); return; }
    setDoingReopen(true);
    try {
      await reopenTerm(reopenTarget.yearId, reopenTarget.term.id, reopenReason);
      const updated = await fetchTerms(reopenTarget.yearId);
      setTermsByYear(prev => ({ ...prev, [reopenTarget.yearId]: updated }));
      setReopenModal(false);
      setReopenReason('');
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed.');
    } finally {
      setDoingReopen(false);
    }
  };

  const handlePromotion = () => {
    if (!isSchool) return;
    Alert.alert('Annual Promotion', 'This will promote all passing students to the next grade level. This action cannot be undone easily. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Run Promotion', style: 'destructive', onPress: async () => {
        try { await runAnnualPromotion(); Alert.alert('Success', 'Annual promotion completed.'); }
        catch (e: unknown) { Alert.alert('Error', (e as Error).message || 'Promotion failed.'); }
      }},
    ]);
  };

  const loadCertStatus = async (yearId: number, termId: number) => {
    const key = `${yearId}_${termId}`;
    setCertLoading(prev => ({ ...prev, [key]: true }));
    try {
      const s = await fetchCertificateStatus(yearId, termId);
      setCertStatus(prev => ({ ...prev, [key]: s }));
    } catch {}
    finally { setCertLoading(prev => ({ ...prev, [key]: false })); }
  };

  const handleIssueCerts = async (yearId: number, termId: number) => {
    try {
      await issueCertificates(yearId, termId);
      Alert.alert('Success', 'Certificates issued.');
      loadCertStatus(yearId, termId);
    } catch (e: unknown) { Alert.alert('Error', (e as Error).message || 'Failed.'); }
  };
  const handlePublishCerts = async (yearId: number, termId: number, isPublished: boolean) => {
    try {
      if (isPublished) await unpublishCertificates(yearId, termId);
      else await publishCertificates(yearId, termId);
      Alert.alert('Success', isPublished ? 'Unpublished.' : 'Published to students.');
      loadCertStatus(yearId, termId);
    } catch (e: unknown) { Alert.alert('Error', (e as Error).message || 'Failed.'); }
  };

  if (loading) return <LoadingState message="Loading school settings…" />;

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: T.primary }]} onPress={() => { setYearForm({ name: '', startDate: '', endDate: '', numberOfTerms: '2' }); setYearModal(true); }}>
            <Plus size={16} color="#fff" />
            <Text style={styles.actionBtnText}>New Year</Text>
          </TouchableOpacity>
          {isSchool && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' }]} onPress={handlePromotion}>
              <RefreshCw size={16} color="#f59e0b" />
              <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Annual Promotion</Text>
            </TouchableOpacity>
          )}
          {isSchool && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: T.elevated }]} onPress={() => setShowSettings(p => !p)}>
              <Settings size={16} color={T.muted} />
              <Text style={[styles.actionBtnText, { color: T.muted }]}>Settings</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* School settings form */}
        {isSchool && showSettings && settings && (
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[styles.sectionTitle, { color: T.text }]}>School Settings</Text>
            {[
              { key: 'passThresholdPercentage', label: 'Pass Threshold (%)', type: 'number' },
              { key: 'minSubjectPassPercentage', label: 'Min Subject Pass (%)', type: 'number' },
              { key: 'entryGradeMinAge', label: 'Entry Grade Min Age', type: 'number' },
            ].map(({ key, label }) => (
              <View key={key} style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: T.subtext }]}>{label}</Text>
                <TextInput
                  style={[styles.settingInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
                  value={String((settings as Record<string, unknown>)[key] ?? '')}
                  onChangeText={v => setSettings(prev => prev ? { ...prev, [key]: Number(v) || 0 } : prev)}
                  keyboardType="number-pad"
                />
              </View>
            ))}
            <TouchableOpacity
              style={[styles.saveSettingsBtn, { backgroundColor: T.primary }]}
              onPress={async () => {
                try { await updateSchoolSettings(settings); Alert.alert('Saved', 'Settings updated.'); }
                catch { Alert.alert('Error', 'Failed.'); }
              }}
            >
              <Save size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Academic years list */}
        <Text style={[styles.sectionTitle, { color: T.text }]}>Academic Years</Text>
        {years.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[styles.emptyText, { color: T.muted }]}>No academic years yet. Create one to get started.</Text>
          </View>
        ) : years.map(year => {
          const isOpen = expanded === year.id;
          const terms = termsByYear[year.id] ?? [];
          return (
            <View key={year.id} style={[styles.yearCard, { backgroundColor: T.surface, borderColor: T.border }]}>
              <TouchableOpacity style={styles.yearHeader} onPress={() => handleExpand(year.id)}>
                <View style={[styles.yearDot, { backgroundColor: year.isActive ? '#10b981' : '#94a3b8' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.yearName, { color: T.text }]}>{year.name}</Text>
                  <Text style={[styles.yearDates, { color: T.muted }]}>
                    {String(year.startDate).slice(0,10)} – {String(year.endDate).slice(0,10)}
                  </Text>
                </View>
                {year.isActive && (
                  <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>ACTIVE</Text></View>
                )}
                {!year.isActive && (
                  <TouchableOpacity style={styles.activateBtn} onPress={() => handleActivateYear(year.id)}>
                    <Text style={styles.activateBtnText}>Activate</Text>
                  </TouchableOpacity>
                )}
                {isOpen ? <ChevronDown size={16} color={T.muted} /> : <ChevronRight size={16} color={T.muted} />}
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.termsContainer}>
                  <View style={[styles.termsDivider, { backgroundColor: T.border }]} />
                  <TouchableOpacity
                    style={styles.addTermBtn}
                    onPress={() => { setTermYearId(year.id); setTermForm({ name: '', startDate: '', endDate: '' }); setTermModal(true); }}
                  >
                    <Plus size={14} color={T.primary} />
                    <Text style={[styles.addTermText, { color: T.primary }]}>Add Term</Text>
                  </TouchableOpacity>
                  {terms.map(term => {
                    const sc = TERM_STATUS_COLOR[term.status] ?? TERM_STATUS_COLOR.UPCOMING;
                    const certKey = `${year.id}_${term.id}`;
                    const cs = certStatus[certKey];
                    return (
                      <View key={term.id} style={[styles.termRow, { borderColor: T.border }]}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.termHeaderRow}>
                            <Text style={[styles.termName, { color: T.text }]}>{term.name}</Text>
                            <View style={[styles.termStatus, { backgroundColor: sc.bg }]}>
                              <Text style={[styles.termStatusText, { color: sc.color }]}>{term.status}</Text>
                            </View>
                          </View>
                          <Text style={[styles.termDates, { color: T.muted }]}>
                            {String(term.startDate).slice(0,10)} – {String(term.endDate).slice(0,10)}
                          </Text>
                        </View>
                        <View style={styles.termActions}>
                          {term.status === 'UPCOMING' && (
                            <TouchableOpacity style={styles.termBtn} onPress={() => handleActivateTerm(year.id, term.id)}>
                              <CheckCircle size={14} color="#10b981" />
                            </TouchableOpacity>
                          )}
                          {(term.status === 'CLOSED' || term.status === 'LOCKED') && (
                            <TouchableOpacity style={styles.termBtn} onPress={() => { setReopenTarget({ yearId: year.id, term }); setReopenModal(true); }}>
                              <Unlock size={14} color="#6366f1" />
                            </TouchableOpacity>
                          )}
                          {isSchool && (
                            <TouchableOpacity
                              style={styles.termBtn}
                              onPress={() => { if (!cs) loadCertStatus(year.id, term.id); else handleIssueCerts(year.id, term.id); }}
                            >
                              <Award size={14} color={cs ? '#f59e0b' : T.muted} />
                            </TouchableOpacity>
                          )}
                        </View>
                        {/* Cert status row */}
                        {cs && (
                          <View style={styles.certRow}>
                            <Text style={[styles.certText, { color: T.muted }]}>
                              {cs.issued}/{cs.totalStudents} issued  ·  {cs.published} published
                            </Text>
                            <TouchableOpacity onPress={() => handlePublishCerts(year.id, term.id, cs.published > 0)}>
                              <Text style={{ color: T.primary, fontSize: 11, fontWeight: '700' }}>
                                {cs.published > 0 ? 'Unpublish' : 'Publish'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                  {terms.length === 0 && (
                    <Text style={[styles.noTerms, { color: T.muted }]}>No terms — add one above.</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* New Year Modal */}
      <Modal visible={yearModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>New Academic Year</Text>
            <TouchableOpacity onPress={() => setYearModal(false)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {[
              { key: 'name', label: 'Year Name *', placeholder: 'e.g. 2025-2026' },
              { key: 'startDate', label: 'Start Date * (YYYY-MM-DD)', placeholder: '2025-09-01' },
              { key: 'endDate', label: 'End Date * (YYYY-MM-DD)', placeholder: '2026-06-30' },
              { key: 'numberOfTerms', label: 'Number of Terms', placeholder: '2', keyboardType: 'number-pad' },
            ].map(({ key, label, placeholder, keyboardType }: { key: string; label: string; placeholder: string; keyboardType?: string }) => (
              <View key={key} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>{label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
                  value={(yearForm as Record<string, string>)[key]}
                  onChangeText={v => setYearForm(prev => ({ ...prev, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={T.placeholder}
                  keyboardType={keyboardType as never ?? 'default'}
                />
              </View>
            ))}
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setYearModal(false)}>
              <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.primary }]} onPress={handleCreateYear} disabled={savingYear}>
              {savingYear ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text style={[styles.footerBtnText, { color: '#fff' }]}>Create</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* New Term Modal */}
      <Modal visible={termModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Add Term</Text>
            <TouchableOpacity onPress={() => setTermModal(false)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {[
              { key: 'name', label: 'Term Name *', placeholder: 'e.g. Term 1' },
              { key: 'startDate', label: 'Start Date * (YYYY-MM-DD)', placeholder: '2025-09-01' },
              { key: 'endDate', label: 'End Date * (YYYY-MM-DD)', placeholder: '2026-01-31' },
            ].map(({ key, label, placeholder }: { key: string; label: string; placeholder: string }) => (
              <View key={key} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>{label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
                  value={(termForm as Record<string, string>)[key]}
                  onChangeText={v => setTermForm(prev => ({ ...prev, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={T.placeholder}
                />
              </View>
            ))}
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setTermModal(false)}>
              <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.primary }]} onPress={handleCreateTerm} disabled={savingTerm}>
              {savingTerm ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text style={[styles.footerBtnText, { color: '#fff' }]}>Add</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reopen Term Modal */}
      <Modal visible={reopenModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Reopen Term</Text>
            <TouchableOpacity onPress={() => setReopenModal(false)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: T.subtext }]}>
              Reopening: {reopenTarget?.term.name}
            </Text>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Reason for reopening *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text, height: 80, textAlignVertical: 'top' }]}
                value={reopenReason}
                onChangeText={setReopenReason}
                placeholder="Enter reason…"
                placeholderTextColor={T.placeholder}
                multiline
              />
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setReopenModal(false)}>
              <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#6366f1' }]} onPress={handleReopen} disabled={doingReopen}>
              {doingReopen ? <ActivityIndicator size="small" color="#fff" /> : <><Unlock size={16} color="#fff" /><Text style={[styles.footerBtnText, { color: '#fff' }]}>Reopen</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  body:           { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] },
  actionsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.xl },
  actionBtnText:  { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  sectionTitle:   { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  card:           { borderRadius: radius['2xl'], borderWidth: 1, padding: spacing[4], gap: spacing[3] },
  settingRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLabel:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, flex: 1 },
  settingInput:   { width: 80, textAlign: 'right', borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontSize: fontSize.sm },
  saveSettingsBtn:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.xl },
  emptyBox:       { borderRadius: radius.xl, borderWidth: 1, padding: spacing[6], alignItems: 'center' },
  emptyText:      { fontSize: fontSize.sm, textAlign: 'center' },
  yearCard:       { borderRadius: radius['2xl'], borderWidth: 1, overflow: 'hidden' },
  yearHeader:     { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4] },
  yearDot:        { width: 10, height: 10, borderRadius: 99 },
  yearName:       { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  yearDates:      { fontSize: fontSize.xs, marginTop: 2 },
  activeBadge:    { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(16,185,129,0.12)' },
  activeBadgeText:{ color: '#10b981', fontSize: 10, fontWeight: '800' },
  activateBtn:    { paddingHorizontal: spacing[3], paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(99,102,241,0.12)' },
  activateBtnText:{ color: '#6366f1', fontSize: 10, fontWeight: '700' },
  termsContainer: { paddingHorizontal: spacing[4], paddingBottom: spacing[3] },
  termsDivider:   { height: 1, marginBottom: spacing[3] },
  addTermBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginBottom: spacing[3] },
  addTermText:    { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  termRow:        { borderTopWidth: 1, paddingTop: spacing[3], paddingBottom: spacing[2], flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  termHeaderRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  termName:       { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  termStatus:     { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  termStatusText: { fontSize: 10, fontWeight: '700' },
  termDates:      { fontSize: fontSize.xs, marginTop: 2 },
  termActions:    { flexDirection: 'row', gap: spacing[1] },
  termBtn:        { padding: spacing[2] },
  certRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing[1] },
  certText:       { fontSize: 11 },
  noTerms:        { fontSize: fontSize.xs, textAlign: 'center', paddingVertical: spacing[3] },
  modal:          { flex: 1 },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[5], paddingTop: spacing[6] },
  modalTitle:     { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  modalBody:      { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  field:          { gap: spacing[1] },
  fieldLabel:     { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  input:          { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm },
  modalFooter:    { flexDirection: 'row', gap: spacing[3], padding: spacing[5], borderTopWidth: 1 },
  footerBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg },
  footerBtnText:  { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
