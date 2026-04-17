import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookText, Users, PlayCircle, BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchAcademyTeachersForCourses, fetchCourseSubjects, fetchStudentCourseCatalog } from '../../services/studentService';

export default function StudentCourseDetailsPage() {
  const { courseId } = useParams();
  const numericCourseId = Number(courseId);
  const [course, setCourse] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [catalog, subjectData] = await Promise.all([
          fetchStudentCourseCatalog(),
          fetchCourseSubjects(numericCourseId),
        ]);

        if (cancelled) return;

        const matchedCourse = (catalog || []).find((item) => Number(item.id) === numericCourseId) || null;
        const normalizedSubjects = subjectData || [];
        setCourse(matchedCourse);
        setSubjects(normalizedSubjects);
        setTeachers(await fetchAcademyTeachersForCourses([numericCourseId]));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'Failed to load course details.');
          setCourse(null);
          setSubjects([]);
          setTeachers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (Number.isFinite(numericCourseId)) {
      load();
    }

    return () => {
      cancelled = true;
    };
  }, [numericCourseId]);

  const subjectCount = subjects.length;

  const teacherCards = useMemo(() => teachers.slice(0, 4), [teachers]);

  if (loading) {
    return (
      <StudentLayout title="Course details" subtitle="Loading course overview">
        <div className="space-y-6">
          <div className="h-16 animate-pulse rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" />
          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="h-[26rem] animate-pulse rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" />
            <div className="h-[26rem] animate-pulse rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" />
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Course details" subtitle={course?.name || 'Course overview'}>
      {error ? <div className="mb-5 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{error}</div> : null}
      <div className="flex items-center justify-between gap-3">
        <Link to="/dashboard/student/courses" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={16} /> Back to courses
        </Link>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 p-6 text-white shadow-xl shadow-indigo-500/15"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">Course journey</p>
            <h1 className="mt-2 text-3xl font-black">{course?.name || 'Course details'}</h1>
            <p className="mt-2 max-w-3xl text-sm text-blue-50/90">{course?.description || 'Subjects, teachers, and learning path.'}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm backdrop-blur">
            <BadgeCheck className="mr-2 inline-block" size={16} /> {subjectCount} subjects
          </div>
        </div>
      </motion.section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl md:p-6">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.25em] text-indigo-600">
            <BookText size={16} /> Subjects
          </div>
          <div className="mt-4 space-y-3">
            {subjects.length ? subjects.map((subject) => (
              <Link
                key={subject.id}
                to={`/student/subjects/${subject.id}`}
                className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-indigo-200 hover:shadow-md"
              >
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-indigo-700">{subject.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{subject.description || 'Explore lessons and materials'}</p>
                </div>
                <PlayCircle className="text-indigo-500" size={18} />
              </Link>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No subjects available yet.</div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.25em] text-indigo-600">
              <Users size={16} /> Academy teachers
            </div>
            <div className="mt-4 space-y-3">
              {teacherCards.map((teacher) => (
                <div key={teacher.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{teacher.name}</p>
                  <p className="text-xs text-indigo-600">{teacher.title}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 text-white shadow-xl shadow-indigo-500/10">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">Study note</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              Completing subjects in order gives the AI tutor better context and keeps your progress visually clean.
            </p>
          </div>
        </aside>
      </div>
    </StudentLayout>
  );
}
