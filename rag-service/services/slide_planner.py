import json
import requests
from qdrant_client import models as qmodels

from config import settings
from services.vector_store import _get_client
from utils.logger import get_logger

logger = get_logger("slide-planner")


def _fetch_lesson_chunks(lesson_id: str, limit: int = 20) -> list[str]:
    """Fetch text chunks for a lesson from Qdrant without requiring an embedding query."""
    client = _get_client()
    results, _ = client.scroll(
        collection_name=settings.qdrant_collection,
        scroll_filter=qmodels.Filter(
            must=[
                qmodels.FieldCondition(
                    key='lessonId',
                    match=qmodels.MatchValue(value=lesson_id),
                )
            ]
        ),
        limit=limit,
        with_payload=True,
        with_vectors=False,
    )
    chunks = []
    for point in results:
        payload = point.payload or {}
        text = (
            payload.get('chunkText')
            or payload.get('chunk_text')
            or payload.get('text')
            or ''
        )
        if text.strip():
            chunks.append(text.strip())
    return chunks


_SYSTEM_AR = (
    'أنت مساعد تعليمي. مهمتك تحويل محتوى الدرس إلى خطة مشاهد فيديو تعليمي متحرك. '
    'أعد JSON صالح فقط بدون أي نص إضافي أو markdown.'
)
_SYSTEM_EN = (
    'You are an educational assistant. Convert lesson content into an animated educational video scene plan. '
    'Return valid JSON only — no extra text, no markdown fences.'
)

_SCHEMA_HINT = '''
Scene types and camera movements:

Scene types:
- TitleScene: {"title": "...", "subtitle": "..."}
- BulletScene: {"heading": "...", "bullets": ["...", "..."], "slideIndex": N, "totalSlides": N}
- ComparisonScene: {"heading": "...", "left": {"label": "A", "points": ["..."]}, "right": {"label": "B", "points": ["..."]}}
- TimelineScene: {"heading": "...", "steps": [{"year": "...", "label": "...", "description": "..."}]}
- CodeExplainScene: {"heading": "...", "language": "python", "code": "...", "highlights": [{"lines": [1,2], "label": "..."}]}
- FlowchartScene: {"heading": "...", "nodes": [{"id": "1", "label": "..."}], "edges": [{"from": "1", "to": "2"}]}
- SummaryScene: {"heading": "ملخص", "summary": "...", "keyPoints": ["...", "..."]}

Camera field (add to each scene — AI Camera System):
- "ken-burns"  : slow zoom-in + diagonal drift (cinematic, best for title/summary)
- "pull-back"  : starts close, reveals content by pulling out (best for bullet lists)
- "push-in"    : slowly moves closer, builds intensity (best for comparisons, code)
- "drift"      : gentle lateral float, ambient life (best for timelines, flowcharts)
- "shake"      : brief handheld shake at start, then stable (best for dramatic moments)
- "tilt-up"    : starts below, tilts up with spring (best for summary/conclusion)
- "orbit"      : subtle slow rotation drift (best for complex diagrams)

Choose camera based on content emotion and pacing. Example scene with camera:
{"type": "TitleScene", "durationSeconds": 4, "camera": "ken-burns", "data": {"title": "...", "subtitle": "..."}}
'''

_SCHEMA_HINT_INTERACTIVE = '''
Scene types available (interactive mode — add QuizScene after complex concepts, add camera field to each scene):
- TitleScene: {"title": "...", "subtitle": "..."}
- BulletScene: {"heading": "...", "bullets": ["...", "..."], "slideIndex": N, "totalSlides": N}
- ComparisonScene: {"heading": "...", "left": {"label": "A", "points": ["..."]}, "right": {"label": "B", "points": ["..."]}}
- TimelineScene: {"heading": "...", "steps": [{"year": "...", "label": "...", "description": "..."}]}
- CodeExplainScene: {"heading": "...", "language": "python", "code": "...", "highlights": [{"lines": [1,2], "label": "..."}]}
- FlowchartScene: {"heading": "...", "nodes": [{"id": "1", "label": "..."}], "edges": [{"from": "1", "to": "2"}]}
- QuizScene: {"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}
- SummaryScene: {"heading": "ملخص", "summary": "...", "keyPoints": ["...", "..."]}

QuizScene rules:
- Insert after every 2-3 concept slides to check understanding
- Question must be directly answerable from the preceding slide content
- Always provide 4 options, only 1 correct (correctIndex is 0-based)
- explanation: brief explanation shown after the student answers
'''

_PROMPT_AR = """حوّل هذا المحتوى التعليمي إلى خطة مشاهد فيديو تعليمي متحرك.

أعد JSON بهذا الشكل بالضبط:
{{
  "title": "عنوان الدرس",
  "lang": "ar",
  "visualStyle": "{visual_style}",
  "scenes": [
    {{ "type": "TitleScene", "durationSeconds": 4, "data": {{ "title": "...", "subtitle": "نظرة عامة تعليمية" }} }},
    {{ "type": "BulletScene", "durationSeconds": 10, "data": {{ "heading": "...", "bullets": ["...", "..."], "slideIndex": 1, "totalSlides": N }} }},
    ...
    {{ "type": "SummaryScene", "durationSeconds": 8, "data": {{ "heading": "ملخص", "summary": "...", "keyPoints": ["...", "..."] }} }}
  ]
}}

قواعد اختيار نوع المشهد:
- TitleScene: دائماً أول مشهد
- SummaryScene: دائماً آخر مشهد
- BulletScene: للشرح العام والمفاهيم (الأكثر استخداماً)
- ComparisonScene: عند مقارنة مفهومين متعاكسين
- TimelineScene: للتسلسل التاريخي أو المراحل المرتبة
- CodeExplainScene: فقط إذا احتوى المحتوى على كود فعلي
- FlowchartScene: للعمليات أو مخططات التدفق

عدد المشاهد: {scene_count}
مدة كل مشهد: 6-14 ثانية (حدد حسب كمية المحتوى)
{focus_block}
{schema_hint}
المحتوى:
{content}"""

_PROMPT_EN = """Convert this educational content into an animated video scene plan.

Return JSON in exactly this format:
{{
  "title": "Lesson Title",
  "lang": "en",
  "visualStyle": "{visual_style}",
  "scenes": [
    {{ "type": "TitleScene", "durationSeconds": 4, "data": {{ "title": "...", "subtitle": "Educational Overview" }} }},
    {{ "type": "BulletScene", "durationSeconds": 10, "data": {{ "heading": "...", "bullets": ["...", "..."], "slideIndex": 1, "totalSlides": N }} }},
    ...
    {{ "type": "SummaryScene", "durationSeconds": 8, "data": {{ "heading": "Summary", "summary": "...", "keyPoints": ["...", "..."] }} }}
  ]
}}

Scene type selection rules:
- TitleScene: always first
- SummaryScene: always last
- BulletScene: general explanations and concepts (most common)
- ComparisonScene: when two contrasting ideas are explained
- TimelineScene: for historical sequences or ordered stages
- CodeExplainScene: only if lesson content contains actual code
- FlowchartScene: for processes, lifecycles, or flow diagrams

Total scenes: {scene_count}
Duration per scene: 6-14 seconds based on content volume
{focus_block}
{schema_hint}
Content:
{content}"""

_FORMAT_SCENE_COUNTS = {
    'explainer': {'ar': '6 إلى 8', 'en': '6 to 8'},
    'brief':     {'ar': '4 إلى 5', 'en': '4 to 5'},
}


def plan_scenes(
    lesson_id: str,
    lang: str = 'ar',
    fmt: str = 'explainer',
    focus: str = '',
    visual_style: str = 'dark',
    interactive: bool = False,
) -> dict:
    """Fetch lesson chunks from Qdrant and call Groq to produce a typed scene plan."""
    if not settings.groq_api_key:
        raise ValueError('GROQ_API_KEY is not configured in the RAG service')

    chunks = _fetch_lesson_chunks(lesson_id)
    if not chunks:
        raise ValueError(
            f'No indexed chunks found for lesson_id={lesson_id}. Ingest lesson content first.'
        )

    content = '\n\n'.join(chunks[:15])[:5000]
    scene_count = _FORMAT_SCENE_COUNTS.get(fmt, _FORMAT_SCENE_COUNTS['explainer'])[lang if lang in ('ar', 'en') else 'en']
    schema = _SCHEMA_HINT_INTERACTIVE if interactive else _SCHEMA_HINT

    if lang == 'ar':
        focus_block = f'- توجيه إضافي: {focus.strip()}' if focus.strip() else ''
        user_prompt = _PROMPT_AR.format(
            visual_style=visual_style,
            scene_count=scene_count,
            focus_block=focus_block,
            schema_hint=schema,
            content=content,
        )
    else:
        focus_block = f'- Additional focus: {focus.strip()}' if focus.strip() else ''
        user_prompt = _PROMPT_EN.format(
            visual_style=visual_style,
            scene_count=scene_count,
            focus_block=focus_block,
            schema_hint=schema,
            content=content,
        )

    system_prompt = _SYSTEM_AR if lang == 'ar' else _SYSTEM_EN
    payload = {
        'model': settings.groq_model,
        'temperature': 0.3,
        'max_tokens': 3000,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user',   'content': user_prompt},
        ],
    }

    resp = requests.post(
        settings.groq_api_url,
        json=payload,
        headers={
            'Authorization': f'Bearer {settings.groq_api_key}',
            'Content-Type': 'application/json',
        },
        timeout=40,
    )
    resp.raise_for_status()

    raw = resp.json()['choices'][0]['message']['content'].strip()
    # Strip markdown fences if present
    if raw.startswith('```'):
        lines = raw.split('\n')
        raw = '\n'.join(lines[1:])
        if '```' in raw:
            raw = raw[:raw.rfind('```')].strip()

    parsed = json.loads(raw)
    scenes = parsed.get('scenes', [])
    if not scenes:
        raise ValueError('Groq returned no scenes in the plan')

    # Inject visual style and lang into top-level plan
    parsed['visualStyle'] = visual_style
    parsed['lang'] = lang

    logger.info('[SlidePlanner] format=%s lang=%s scenes=%d lesson_id=%s', fmt, lang, len(scenes), lesson_id)
    return parsed


# Keep plan_slides as an alias so old callers don't break during transition
def plan_slides(lesson_id: str, lang: str = 'ar', fmt: str = 'explainer', focus: str = '') -> dict:
    return plan_scenes(lesson_id, lang=lang, fmt=fmt, focus=focus)


def build_narration(scene_plan: dict, lang: str) -> str:
    """Build a narration script from the scene plan."""
    title = scene_plan.get('title', '')
    scenes = scene_plan.get('scenes', [])
    parts = []

    if lang == 'ar':
        parts.append(f'هذا الفيديو يقدم نظرة عامة على: {title}.')
    else:
        parts.append(f'This video covers: {title}.')

    for scene in scenes:
        stype = scene.get('type', '')
        data = scene.get('data', {})
        if stype == 'TitleScene':
            continue
        if stype == 'SummaryScene':
            summary = data.get('summary', '')
            if summary:
                parts.append((f'ملخصاً: {summary}.' if lang == 'ar' else f'In summary: {summary}.'))
            continue
        heading = data.get('heading', '')
        if heading:
            parts.append(f'{heading}.')
        # BulletScene
        for b in data.get('bullets', []):
            parts.append(f'{b}.')
        # ComparisonScene
        left = data.get('left', {})
        right = data.get('right', {})
        for pt in left.get('points', []):
            parts.append(f'{pt}.')
        for pt in right.get('points', []):
            parts.append(f'{pt}.')
        # TimelineScene
        for step in data.get('steps', []):
            label = step.get('label', '')
            desc = step.get('description', '')
            if label:
                parts.append(f'{label}.' + (f' {desc}.' if desc else ''))
        # CodeExplainScene
        for hl in data.get('highlights', []):
            lbl = hl.get('label', '')
            if lbl:
                parts.append(f'{lbl}.')

    return ' '.join(parts)
