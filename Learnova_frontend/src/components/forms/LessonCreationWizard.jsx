import { useRef, useState } from 'react';
import { Upload, Sparkles, CheckCircle2, ChevronRight, ChevronLeft, Video } from 'lucide-react';
import { useLanguage } from '../../utils/i18n';

const STEPS = ['upload', 'details'];

export default function LessonCreationWizard({
  subjects = [],
  onUpload,        // async (subjectId, videoFile, onProgress) => lesson
  onSave,          // async (subjectId, lessonId, { title, description }) => void
  onSuggest,       // async (subjectId, filename, lang) => { title, description }
}) {
  const { isArabic } = useLanguage();
  const lang = isArabic ? 'ar' : 'en';
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const [step, setStep] = useState(0);               // 0 = upload, 1 = details
  const [subjectId, setSubjectId] = useState(String(subjects[0]?.id || ''));
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [createdLesson, setCreatedLesson] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const pickFile = (file) => {
    if (!file || !file.type.startsWith('video/')) return;
    setVideoFile(file);
    setError('');
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!subjectId) { setError(isArabic ? 'اختر المادة أولاً.' : 'Please select a subject first.'); return; }
    if (!videoFile) { setError(isArabic ? 'اختر ملف فيديو.' : 'Please select a video file.'); return; }
    setUploading(true);
    setUploadProgress(0);
    setError('');
    try {
      const lesson = await onUpload(subjectId, videoFile, (p) => setUploadProgress(p));
      setCreatedLesson(lesson);
      // Pre-fill title from filename
      const cleanName = videoFile.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName);
      setStep(1);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || (isArabic ? 'فشل الرفع.' : 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  const handleSuggest = async () => {
    if (!subjectId || !videoFile) return;
    setSuggesting(true);
    try {
      const suggestion = await onSuggest(subjectId, videoFile.name, lang);
      if (suggestion?.title) setTitle(suggestion.title);
      if (suggestion?.description) setDescription(suggestion.description);
    } catch { /* silent */ } finally { setSuggesting(false); }
  };

  const handleSave = async () => {
    if (!title.trim()) { setError(isArabic ? 'العنوان مطلوب.' : 'Title is required.'); return; }
    if (!createdLesson?.id) return;
    setSaving(true);
    setError('');
    try {
      await onSave(subjectId, createdLesson.id, { title: title.trim(), description: description.trim() });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || (isArabic ? 'فشل الحفظ.' : 'Save failed.'));
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 p-1">

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition-all ${
              i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              {i < step ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={`text-xs font-bold ${i === step ? 'text-slate-900' : 'text-slate-400'}`}>
              {i === 0 ? (isArabic ? 'رفع الفيديو' : 'Upload Video') : (isArabic ? 'تفاصيل الدرس' : 'Lesson Details')}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-8 bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload Video ── */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Subject picker */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">{isArabic ? 'المادة' : 'Subject'}</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400"
              required
            >
              <option value="">{isArabic ? '— اختر المادة —' : '— Select subject —'}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name || s.Name}</option>
              ))}
            </select>
          </div>

          {/* Drag-and-drop zone */}
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !videoFile && fileInputRef.current?.click()}
            className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed transition-all ${
              dragOver
                ? 'border-indigo-400 bg-indigo-50'
                : videoFile
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-slate-100'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {videoFile ? (
              <>
                <Video size={36} className="text-emerald-500" />
                <p className="text-sm font-bold text-emerald-700">{videoFile.name}</p>
                <p className="text-xs text-emerald-600">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setVideoFile(null); }}
                  className="rounded-xl border border-rose-200 px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  {isArabic ? 'تغيير' : 'Change'}
                </button>
              </>
            ) : (
              <>
                <Upload size={36} className="text-slate-400" />
                <p className="text-sm font-bold text-slate-700">{isArabic ? 'اسحب الفيديو هنا' : 'Drag video here'}</p>
                <p className="text-xs text-slate-400">{isArabic ? 'أو اضغط للاختيار' : 'or click to browse'}</p>
              </>
            )}
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>{isArabic ? 'جاري الرفع...' : 'Uploading...'}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {error && <p className="rounded-2xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">{error}</p>}

          <button
            type="button"
            onClick={handleUpload}
            disabled={!videoFile || !subjectId || uploading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {uploading ? (isArabic ? 'جاري الرفع...' : 'Uploading...') : (isArabic ? 'رفع الفيديو' : 'Upload Video')}
            {!uploading && <ChevronRight size={16} />}
          </button>
        </div>
      )}

      {/* ── Step 2: Lesson Details ── */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Video confirmation badge */}
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
            <p className="text-xs font-semibold text-emerald-700">{videoFile?.name}</p>
          </div>

          {/* AI suggest button */}
          <button
            type="button"
            onClick={handleSuggest}
            disabled={suggesting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
          >
            <Sparkles size={15} className={suggesting ? 'animate-pulse' : ''} />
            {suggesting
              ? (isArabic ? 'جاري التوليد...' : 'Generating...')
              : (isArabic ? '✨ اقتراح عنوان ووصف بالذكاء الاصطناعي' : '✨ AI Suggest Title & Description')}
          </button>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">{isArabic ? 'عنوان الدرس' : 'Lesson Title'} <span className="text-red-500">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isArabic ? 'أدخل عنوان الدرس' : 'Enter lesson title'}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
              dir={isArabic ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">{isArabic ? 'الوصف' : 'Description'}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isArabic ? 'وصف مختصر للدرس...' : 'Brief lesson description...'}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 resize-none"
              dir={isArabic ? 'rtl' : 'ltr'}
            />
          </div>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft size={16} />
              {isArabic ? 'رجوع' : 'Back'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-40"
            >
              {saving ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'إنشاء الدرس ✓' : 'Create Lesson ✓')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
