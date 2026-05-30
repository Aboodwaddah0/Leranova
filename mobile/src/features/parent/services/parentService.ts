import apiClient, { unwrap, ensureArray } from '../../../shared/services/apiClient';
import type { ParentProfile, Child, TeacherNote, ChildMark } from '../../../types/parent';

export async function fetchMyParentProfile(): Promise<ParentProfile | null> {
  try {
    const res = await apiClient.get('/parent/me');
    return unwrap<ParentProfile>(res);
  } catch {
    return null;
  }
}

export async function updateMyParentProfile(payload: Partial<ParentProfile>): Promise<ParentProfile | null> {
  try {
    const res = await apiClient.patch('/parent/me', payload);
    return unwrap<ParentProfile>(res);
  } catch {
    return null;
  }
}

export async function fetchMyChildren(): Promise<Child[]> {
  try {
    const res = await apiClient.get('/parent/children');
    return ensureArray<Child>(unwrap(res));
  } catch {
    return [];
  }
}

export async function fetchMyNotes(): Promise<TeacherNote[]> {
  try {
    const res = await apiClient.get('/parent/notes');
    return ensureArray<TeacherNote>(unwrap(res));
  } catch {
    return [];
  }
}

export async function markNoteRead(noteId: number): Promise<void> {
  await apiClient.patch(`/parent/notes/${noteId}/read`);
}

export async function fetchParentChildrenMarks(): Promise<ChildMark[]> {
  try {
    const res = await apiClient.get('/parent/marks');
    return ensureArray<ChildMark>(unwrap(res));
  } catch {
    return [];
  }
}
