export default function EducationLoading({
  isArabic = false,
  title,
  subtitle,
  compact = false,
  fullscreen = false,
  className = "",
}) {
  const heading = title || (isArabic ? "جاري تجهيز المحتوى الدراسي" : "Preparing your learning workspace");
  const hint =
    subtitle ||
    (isArabic
      ? "نرتب الدروس والمواد والبيانات التعليمية الآن..."
      : "Arranging lessons, subjects, and academic data...");

  return (
    <section
      className={`edu-loading ${compact ? "edu-loading--compact" : ""} ${fullscreen ? "edu-loading--fullscreen" : ""} ${className}`.trim()}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="edu-loading__icon" aria-hidden="true">
        <div className="edu-loading__book" />
        <div className="edu-loading__cap" />
      </div>

      <div className="edu-loading__text">
        <p className="edu-loading__title">{heading}</p>
        <p className="edu-loading__subtitle">{hint}</p>
      </div>
    </section>
  );
}
