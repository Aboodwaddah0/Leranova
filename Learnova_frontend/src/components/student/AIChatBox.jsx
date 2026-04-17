import { useMemo, useState } from "react";
import { askStudentTutor } from "../../services/studentService";
import { Button } from "../ui/button";

const normalizeReferences = (references = []) =>
  references.map((reference, index) => ({
    id: `${reference.lesson_id || index}-${index}`,
    title: reference.title || reference.source_file || reference.sourceName || reference.type || `Reference ${index + 1}`,
    score: reference.score,
  }));

export default function AIChatBox({ isArabic, courseId, subjectId, lessonId, labels }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const canAsk = Boolean(courseId);

  const heading = useMemo(
    () => labels || {},
    [labels],
  );

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!canAsk || !question.trim()) {
      return;
    }

    const nextQuestion = question.trim();
    setQuestion("");
    setLoading(true);

    try {
      const response = await askStudentTutor({
        question: nextQuestion,
        courseId,
        subjectId,
        lessonId,
      });

      setMessages((current) => [
        ...current,
        {
          role: "user",
          content: nextQuestion,
        },
        {
          role: "assistant",
          content: response?.answer || (isArabic ? "لا توجد إجابة متاحة الآن." : "No answer is available right now."),
          explanation: response?.explanation || "",
          confidence: response?.confidence ?? 0,
          references: normalizeReferences(response?.references || []),
          scope: response?.scope || null,
          fallback: response?.fallback || null,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error?.response?.data?.message || error?.message || (isArabic ? "تعذر الوصول للمساعد." : "The tutor could not be reached."),
          confidence: 0,
          references: [],
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2379c3]">{heading.title || (isArabic ? "المساعد الذكي" : "AI tutor")}</p>
          <h3 className="mt-2 text-xl font-black text-slate-900">{heading.subtitle || (isArabic ? "اسأل Learnova" : "Ask Learnova")}</h3>
        </div>
        <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
          {courseId ? `${isArabic ? "كورس" : "Course"} #${courseId}` : (isArabic ? "بدون كورس" : "No course selected")}
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={heading.placeholder || (isArabic ? "اكتب سؤالك..." : "Type your question...")}
          className="min-h-28 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#2379c3] focus:bg-white"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {courseId
              ? isArabic
                ? "سيتم استخدام الكورس أو المادة المحددة لتوليد الإجابة."
                : "The selected course or subject will be used to generate the answer."
              : heading.notAvailable || (isArabic ? "المساعد غير متاح بدون كورس." : "The tutor is unavailable without a course.")}
          </p>
          <Button type="submit" size="sm" disabled={loading || !canAsk || !question.trim()}>
            {loading ? (heading.sending || (isArabic ? "جاري التفكير..." : "Thinking...")) : (heading.send || (isArabic ? "إرسال" : "Send"))}
          </Button>
        </div>
      </form>

      <div className="mt-5 space-y-4">
        {messages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
            {heading.noAnswer || (isArabic ? "اسأل سؤالًا للحصول على إجابة." : "Ask a question to get a response.")}
          </div>
        ) : (
          messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={`rounded-3xl border px-5 py-4 ${message.role === "assistant" ? "border-[#2379c3]/20 bg-[#eff6fd]" : "border-slate-200 bg-white"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2379c3]">
                  {message.role === "assistant"
                    ? heading.answer || (isArabic ? "الإجابة" : "Answer")
                    : isArabic
                      ? "سؤال الطالب"
                      : "Student question"}
                </p>
                {message.role === "assistant" ? (
                  <span className="text-xs font-semibold text-slate-500">
                    {heading.confidence || (isArabic ? "الثقة" : "Confidence")}: {Math.round((message.confidence || 0) * 100)}%
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-7 text-slate-700">{message.content}</p>

              {message.role === "assistant" && message.explanation ? (
                <p className="mt-3 text-xs leading-6 text-slate-500">{message.explanation}</p>
              ) : null}

              {message.role === "assistant" && message.references?.length ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {message.references.map((reference) => (
                    <span key={reference.id} className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                      {reference.title}
                    </span>
                  ))}
                </div>
              ) : null}

              {message.error ? (
                <p className="mt-2 text-xs font-semibold text-rose-600">{isArabic ? "تعذر إنشاء الإجابة." : "The response could not be generated."}</p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}