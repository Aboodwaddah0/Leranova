import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lock, BookOpen, GraduationCap, CheckCircle2, Award, Star, Flame, Zap,
} from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchAchievements } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';

const ACHIEVEMENT_META = {
  FIRST_LESSON: { icon: BookOpen,      color: '#6366F1', description: { en: 'Complete your first lesson', ar: 'أكمل أول درس لك' } },
  LESSON_10:    { icon: BookOpen,      color: '#8B5CF6', description: { en: 'Complete 10 lessons', ar: 'أكمل 10 دروس' } },
  LESSON_50:    { icon: GraduationCap, color: '#A855F7', description: { en: 'Complete 50 lessons', ar: 'أكمل 50 درسًا' } },
  FIRST_QUIZ:   { icon: CheckCircle2,  color: '#06B6D4', description: { en: 'Pass your first quiz', ar: 'اجتز أول اختبار لك' } },
  QUIZ_5:       { icon: Award,         color: '#0EA5E9', description: { en: 'Pass 5 quizzes', ar: 'اجتز 5 اختبارات' } },
  PERFECT_QUIZ: { icon: Star,          color: '#F59E0B', description: { en: 'Score 100% on a quiz', ar: 'احصل على 100% في اختبار' } },
  STREAK_3:     { icon: Flame,         color: '#F97316', description: { en: 'Reach a 3-day streak', ar: 'حافظ على سلسلة 3 أيام' } },
  STREAK_7:     { icon: Flame,         color: '#EF4444', description: { en: 'Reach a 7-day streak', ar: 'حافظ على سلسلة 7 أيام' } },
  STREAK_30:    { icon: Flame,         color: '#DC2626', description: { en: 'Reach a 30-day streak', ar: 'حافظ على سلسلة 30 يومًا' } },
  XP_100:       { icon: Zap,           color: '#14B8A6', description: { en: 'Earn 100 total XP', ar: 'اكسب 100 نقطة خبرة' } },
  XP_500:       { icon: Zap,           color: '#0D9488', description: { en: 'Earn 500 total XP', ar: 'اكسب 500 نقطة خبرة' } },
};

const ACHIEVEMENT_ORDER = Object.keys(ACHIEVEMENT_META);

function formatDate(iso, isArabic) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(isArabic ? 'ar' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const fadeUp = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } } };
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

export default function StudentAchievementsPage() {
  const { isArabic } = useLanguage();
  const { isDark } = useTheme();
  const [achievements, setAchievements] = useState({ unlocked: [], locked: [], latestUnlocked: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAchievements()
      .then((data) => { if (!cancelled) setAchievements(data || { unlocked: [], locked: [], latestUnlocked: null }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const unlockedMap = new Map((achievements.unlocked || []).map((a) => [a.key, a]));
  const lockedMap = new Map((achievements.locked || []).map((a) => [a.key, a]));
  const total = ACHIEVEMENT_ORDER.length;
  const unlockedCount = achievements.unlocked?.length || 0;
  const pct = Math.round((unlockedCount / total) * 100);
  const totalBonusXp = (achievements.unlocked || []).reduce((sum, a) => sum + (a.xpAwarded || 0), 0);

  return (
    <StudentLayout
      title={isArabic ? 'الإنجازات' : 'Achievements'}
      subtitle={isArabic ? 'شاراتك ومكافآتك' : 'Your badges & rewards'}
    >
      <div className="space-y-6">
        {/* ─── Summary ─── */}
        <section className="rounded-2xl p-7" style={{ background: 'var(--ln-sec-bg)', border: '1px solid var(--ln-sec-border)' }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--ln-sec-subtext)' }}>
                {isArabic ? 'تقدمك' : 'Your progress'}
              </p>
              <h2 className="mt-1 text-2xl font-black" style={{ color: 'var(--ln-sec-text)' }}>
                {unlockedCount}
                <span className="text-base font-semibold" style={{ color: 'var(--ln-sec-subtext)' }}>/{total} {isArabic ? 'مفتوح' : 'unlocked'}</span>
              </h2>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl px-4 py-2 text-center" style={{ background: 'var(--ln-item-bg)', border: '1px solid var(--ln-item-border)' }}>
                <p className="text-lg font-black" style={{ color: 'var(--ln-sec-text)' }}>{pct}%</p>
                <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--ln-sec-subtext)' }}>{isArabic ? 'مكتمل' : 'complete'}</p>
              </div>
              <div className="rounded-xl px-4 py-2 text-center" style={{ background: 'var(--ln-item-bg)', border: '1px solid var(--ln-item-border)' }}>
                <p className="text-lg font-black" style={{ color: 'var(--ln-sec-text)' }}>+{totalBonusXp}</p>
                <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--ln-sec-subtext)' }}>{isArabic ? 'XP إضافية' : 'bonus XP'}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--ln-item-bg)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #8B5CF6, #6366F1)' }} />
          </div>
        </section>

        {/* ─── Grid ─── */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="ln-skeleton h-32 rounded-2xl" />
            ))}
          </div>
        ) : (
          <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" variants={stagger} initial="hidden" animate="visible">
            {ACHIEVEMENT_ORDER.map((key) => {
              const meta = ACHIEVEMENT_META[key];
              const unlocked = unlockedMap.get(key);
              const locked = lockedMap.get(key);
              const isUnlocked = !!unlocked;
              const Icon = meta.icon;
              const label = unlocked?.label || locked?.label || key;
              const xp = unlocked?.xp ?? locked?.xp;

              return (
                <motion.div
                  key={key}
                  variants={fadeUp}
                  className="relative overflow-hidden rounded-2xl p-5"
                  style={{
                    background: isUnlocked ? 'var(--ln-sec-bg)' : (isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc'),
                    border: `1px solid ${isUnlocked ? 'var(--ln-sec-border)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)')}`,
                    opacity: isUnlocked ? 1 : 0.65,
                  }}
                >
                  {isUnlocked && (
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ background: `radial-gradient(circle at top right, ${meta.color}22, transparent 70%)` }}
                    />
                  )}
                  <div className="relative flex items-start gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: isUnlocked ? `${meta.color}22` : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                        border: `1px solid ${isUnlocked ? `${meta.color}44` : 'transparent'}`,
                      }}
                    >
                      {isUnlocked
                        ? <Icon size={22} style={{ color: meta.color }} />
                        : <Lock size={18} style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold" style={{ color: 'var(--ln-sec-text)' }}>{label}</h3>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: isUnlocked ? `${meta.color}22` : 'var(--ln-item-bg)', color: isUnlocked ? meta.color : 'var(--ln-sec-subtext)' }}
                        >
                          +{xp} XP
                        </span>
                      </div>
                      <p className="mt-1 text-xs" style={{ color: 'var(--ln-sec-subtext)' }}>
                        {meta.description[isArabic ? 'ar' : 'en']}
                      </p>
                      {isUnlocked ? (
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#10B981' }}>
                          {isArabic ? 'تم الفتح في ' : 'Unlocked '}{formatDate(unlocked.unlockedAt, isArabic)}
                        </p>
                      ) : (
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ln-sec-subtext)' }}>
                          {isArabic ? 'مغلق' : 'Locked'}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </StudentLayout>
  );
}
