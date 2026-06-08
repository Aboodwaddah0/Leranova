import api from '../utils/api';

export const fetchMyParentProfile = async () => {
  const { data } = await api.get('/parent/me');
  return data?.data || null;
};

export const updateMyParentProfile = async (payload) => {
  const { data } = await api.patch('/parent/me', payload);
  return data?.data || null;
};

export const fetchMyChildren = async () => {
  const { data } = await api.get('/parent/children');
  return data?.data || [];
};

export const fetchMyNotes = async () => {
  const { data } = await api.get('/parent/notes');
  return data?.data || [];
};

export const markNoteRead = async (noteId) => {
  const { data } = await api.patch(`/parent/notes/${noteId}/read`);
  return data?.data || null;
};

export const fetchParentChildrenMarks = async () => {
  const { data } = await api.get('/parent/marks');
  return data?.data || [];
};

export const fetchCalendar = async (params = {}) => {
  const { data } = await api.get('/school-calendar/public', { params });
  return data?.data || [];
};

export const fetchChildrenAttendance = async (params = {}) => {
  const { data } = await api.get('/attendance/children', { params });
  return data?.data || [];
};
