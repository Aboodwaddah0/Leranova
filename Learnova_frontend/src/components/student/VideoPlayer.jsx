export default function VideoPlayer({ src, title, poster, isArabic }) {
  if (!src) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
        <div>
          <p className="text-base font-bold text-slate-900">{title || (isArabic ? "لا يوجد فيديو" : "No video available")}</p>
          <p className="mt-2 max-w-md leading-6">
            {isArabic
              ? "تخطيط المشاهدة جاهز، لكن رابط الفيديو غير متوفر من الـ API الحالي."
              : "The playback layout is ready, but the current API does not expose a lesson video URL."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-black shadow-sm">
      <video className="h-full w-full" controls poster={poster} src={src} />
    </div>
  );
}