import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, BadgeCheck, BadgeAlert } from 'lucide-react';
import { useLanguage } from '../../utils/i18n';

export default function CourseCard({ course, isPaid, progress = 0, continueHref, subscribeHref }) {
  const { isArabic } = useLanguage();
  const cover = course?.cover || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80';
  const statusLabel = isPaid ? (isArabic ? 'متابعة' : 'Continue') : (isArabic ? 'اشتراك' : 'Subscribe');
  const statusTone = isPaid ? 'from-indigo-600 to-cyan-500' : 'from-slate-800 to-slate-600';

  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-[0_20px_60px_-30px_rgba(51,65,85,0.35)]">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img src={cover} alt={course?.name || (isArabic ? 'غلاف الكورس' : 'Course cover')} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className={`rounded-full bg-gradient-to-r ${statusTone} px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-lg`}>
            {isPaid ? (isArabic ? 'مدفوع' : 'Paid') : (isArabic ? 'قيد الانتظار' : 'Pending')}
          </span>
          <span className="rounded-full bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-700 backdrop-blur">
            {course?.category || (isArabic ? 'أكاديمية' : 'Academy')}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/90 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-600">{isArabic ? 'الكورس' : 'Course'}</p>
              <h3 className="mt-1 text-lg font-black text-slate-900 line-clamp-1">{course?.name || (isArabic ? 'كورس بدون عنوان' : 'Untitled course')}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-lg">
              <BookOpen size={18} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <p className="text-sm leading-6 text-slate-600">{course?.description || (isArabic ? 'كورس أكاديمي منظم مع توجيه حديث وتتبع واضح للتقدم.' : 'A curated academy course with modern guidance and clean progress tracking.')}</p>

        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
            {isPaid ? <BadgeCheck size={13} className="text-emerald-600" /> : <BadgeAlert size={13} className="text-amber-500" />}
            {isPaid ? (isArabic ? 'مفتوح' : 'Unlocked') : (isArabic ? 'بانتظار الدفع' : 'Payment pending')}
          </span>
          <span>{isArabic ? `مكتمل ${Math.round(progress)}%` : `${Math.round(progress)}% complete`}</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-cyan-500 to-emerald-400" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>

        <div className="flex gap-3">
          <Link
            to={continueHref || '#'}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {statusLabel}
            <ArrowRight size={15} />
          </Link>
          {!isPaid ? (
            <Link
              to={subscribeHref || '#'}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {isArabic ? 'اشتراك' : 'Subscribe'}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
