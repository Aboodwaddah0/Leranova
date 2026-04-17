import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookCheck, Clock3, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchCourseSubjects, fetchSubjectLessons } from '../../services/studentService';

export default function StudentSubjectPage() {
  const { subjectId } = useParams();
  const numericSubjectId = Number(subjectId);
  const [subject, setSubject] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const subjects = await fetchCourseSubjects(101);
        const matchedSubject = (subjects || []).find((item) => Number(item.id) === numericSubjectId) || null;
        const lessonData = await fetchSubjectLessons(numericSubjectId);

        if (cancelled) return;
        setSubject(matchedSubject);
        setLessons(lessonData || []);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'Failed to load subject lessons.');
          setSubject(null);
          setLessons([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (Number.isFinite(numericSubjectId)) {
      load();
    }

    return () => {
      cancelled = true;
    };
  }, [numericSubjectId]);

  return (
    <StudentLayout title="Subject" subtitle={subject?.name || 'Subject lessons'}>
      {loading ? <div className="h-64 animate-pulse rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" /> : null}
      {error ? <div className="mb-5 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{error}</div> : null}
      <div className="flex items-center justify-between gap-3">
        <Link to="/dashboard/student/courses" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={16} /> Back to courses
        </Link>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 rounded-[2rem] border border-white/70 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 p-6 text-white shadow-xl shadow-indigo-500/15"
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">Subject focus</p>
        <h1 className="mt-2 text-3xl font-black">{subject?.name || 'Subject lessons'}</h1>
        <p className="mt-2 max-w-3xl text-sm text-blue-50/90">{subject?.description || 'Pick a lesson to open the full study view.'}</p>
      </motion.section>

      <div className="mt-6 rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.25em] text-indigo-600">
          <BookCheck size={16} /> Lessons
        </div>
        <div className="mt-4 space-y-3">
          {lessons.length ? lessons.map((lesson) => (
            <Link
              key={lesson.id}
              to={`/student/lessons/${lesson.id}`}
              className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-indigo-200 hover:shadow-md"
            >
              <div>
                <p className="font-bold text-slate-900 group-hover:text-indigo-700">{lesson.title || lesson.name}</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><Clock3 size={14} /> {lesson.duration || '15 min'}</p>
              </div>
              <PlayCircle className="text-indigo-500" size={18} />
            </Link>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No lessons are available yet.</div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
