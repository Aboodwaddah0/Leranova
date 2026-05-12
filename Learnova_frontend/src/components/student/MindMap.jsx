import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

/* ─── Canvas constants ───────────────────────────────────────────────────────
   All node centres are computed inside a fixed CW×CH rectangle.
   Verified for up to 8 branches with spread ±0.4 rad:
     topmost child y  ≈ CY - BRANCH_R - CHILD_R·cos(0.4) ≈ 480-220-111 = 149 ✓
     bottommost child ≈ 480+220+111 = 811 < 960                                ✓
     rightmost child  ≈ 560+220+111 = 891 < 1120                               ✓
     leftmost child   ≈ 560-220-111 = 229 > 0                                  ✓
*/
const CW = 1120;
const CH = 960;
const CX = 560;
const CY = 480;
const BRANCH_R = 220;
const CHILD_R  = 130;
const SPREAD   = 0.4;   // radians, fan between sibling children

const COLORS = [
  { bg:'#6366f1', shadow:'rgba(99,102,241,.4)',  childBg:'#e0e7ff', childFg:'#3730a3', line:'#818cf8', childLine:'#a5b4fc' },
  { bg:'#8b5cf6', shadow:'rgba(139,92,246,.4)',  childBg:'#ede9fe', childFg:'#5b21b6', line:'#a78bfa', childLine:'#c4b5fd' },
  { bg:'#ec4899', shadow:'rgba(236,72,153,.4)',  childBg:'#fce7f3', childFg:'#9d174d', line:'#f472b6', childLine:'#fbcfe8' },
  { bg:'#f59e0b', shadow:'rgba(245,158,11,.4)',  childBg:'#fef3c7', childFg:'#92400e', line:'#fbbf24', childLine:'#fde68a' },
  { bg:'#10b981', shadow:'rgba(16,185,129,.4)',  childBg:'#d1fae5', childFg:'#065f46', line:'#34d399', childLine:'#6ee7b7' },
  { bg:'#ef4444', shadow:'rgba(239,68,68,.4)',   childBg:'#fee2e2', childFg:'#7f1d1d', line:'#f87171', childLine:'#fca5a5' },
];

function buildLayout(mindmap) {
  const positions = { center: { x: CX, y: CY } };
  const branches = mindmap?.branches ?? [];
  const n = branches.length || 1;

  branches.forEach((branch, bi) => {
    const angle = (bi / n) * 2 * Math.PI - Math.PI / 2;
    const bx = CX + Math.cos(angle) * BRANCH_R;
    const by = CY + Math.sin(angle) * BRANCH_R;
    positions[`b${bi}`] = { x: bx, y: by };

    const kids = branch.children ?? [];
    kids.forEach((_, ci) => {
      const fan = kids.length > 1 ? (ci - (kids.length - 1) / 2) * SPREAD : 0;
      const a   = angle + fan;
      positions[`c${bi}_${ci}`] = {
        x: bx + Math.cos(a) * CHILD_R,
        y: by + Math.sin(a) * CHILD_R,
      };
    });
  });

  return positions;
}

export default function MindMap({ mindmap, lessonTitle, isArabic, loading, error, published }) {
  const [pos, setPos] = useState(() => (mindmap ? buildLayout(mindmap) : {}));
  const dragRef  = useRef(null);
  const canvasEl = useRef(null);

  useEffect(() => { if (mindmap) setPos(buildLayout(mindmap)); }, [mindmap]);

  const resetLayout = useCallback(() => {
    if (mindmap) setPos(buildLayout(mindmap));
  }, [mindmap]);

  /* ─── drag handlers ──────────────────────────────────────────────────── */
  const onStart = useCallback((e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = canvasEl.current.getBoundingClientRect();
    const cx   = e.touches ? e.touches[0].clientX : e.clientX;
    const cy   = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { id, ox: cx - rect.left - (pos[id]?.x ?? 0), oy: cy - rect.top - (pos[id]?.y ?? 0) };
  }, [pos]);

  const onMove = useCallback((e) => {
    if (!dragRef.current) return;
    const rect = canvasEl.current.getBoundingClientRect();
    const cx   = e.touches ? e.touches[0].clientX : e.clientX;
    const cy   = e.touches ? e.touches[0].clientY : e.clientY;
    const { id, ox, oy } = dragRef.current;
    setPos(p => ({
      ...p,
      [id]: {
        x: Math.max(0, Math.min(CW, cx - rect.left - ox)),
        y: Math.max(0, Math.min(CH, cy - rect.top  - oy)),
      },
    }));
  }, []);

  const onEnd = useCallback(() => { dragRef.current = null; }, []);

  /* ─── states ─────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center gap-3 py-12">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
      <p className="text-sm text-slate-500">{isArabic ? 'جارٍ توليد الخريطة...' : 'Generating mind map…'}</p>
    </div>
  );

  if (error) return (
    <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</p>
  );

  if (!published || !mindmap) return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <span className="text-4xl">🗺️</span>
      <p className="text-sm text-slate-500">
        {isArabic ? 'لم ينشر المدرس الخريطة الذهنية بعد.' : "Your instructor hasn't published the mind map yet."}
      </p>
    </div>
  );

  const branches    = mindmap.branches ?? [];
  const centerLabel = mindmap.title || lessonTitle || '';

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {isArabic ? 'اسحب أي عقدة لتحريكها' : 'Drag any node to move it'}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={resetLayout}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50">
            {isArabic ? 'إعادة الترتيب' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Scrollable shell — lets the canvas overflow on very small screens */}
      <div className="overflow-auto rounded-2xl border border-slate-200">
        {/* Fixed-size canvas — positions are absolute inside here */}
        <div
          ref={canvasEl}
          onMouseMove={onMove}  onMouseUp={onEnd}  onMouseLeave={onEnd}
          onTouchMove={onMove}  onTouchEnd={onEnd}
          style={{
            position: 'relative',
            width:  CW,
            height: CH,
            background: 'radial-gradient(ellipse at 50% 30%, #eef2ff 0%, #f8fafc 55%, #f0fdf4 100%)',
            userSelect:  'none',
            touchAction: 'none',
            flexShrink: 0,
          }}
        >
          {/* ── SVG lines ── */}
          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
            {branches.map((branch, bi) => {
              const c   = pos.center;
              const b   = pos[`b${bi}`];
              if (!c || !b) return null;
              const col = COLORS[bi % COLORS.length];
              return (
                <Fragment key={bi}>
                  {/* centre → branch */}
                  <line x1={c.x} y1={c.y} x2={b.x} y2={b.y}
                    stroke={col.line} strokeWidth="2.5"
                    strokeDasharray="7 4" strokeLinecap="round" />
                  {/* branch → children */}
                  {(branch.children ?? []).map((_, ci) => {
                    const ch = pos[`c${bi}_${ci}`];
                    if (!ch) return null;
                    return (
                      <line key={ci} x1={b.x} y1={b.y} x2={ch.x} y2={ch.y}
                        stroke={col.childLine} strokeWidth="1.8" strokeLinecap="round" />
                    );
                  })}
                </Fragment>
              );
            })}
          </svg>

          {/* ── Centre node ── */}
          {pos.center && (
            <Node x={pos.center.x} y={pos.center.y} onStart={e => onStart(e, 'center')}
              style={{
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff', borderRadius: 14, padding: '10px 18px',
                fontWeight: 700, fontSize: 13,
                boxShadow: '0 6px 24px rgba(99,102,241,.45)',
                maxWidth: 170, textAlign: 'center',
              }}>
              <span dir="rtl">{centerLabel}</span>
            </Node>
          )}

          {/* ── Branch + child nodes ── */}
          {branches.map((branch, bi) => {
            const bPos = pos[`b${bi}`];
            const col  = COLORS[bi % COLORS.length];
            return (
              <Fragment key={bi}>
                {bPos && (
                  <Node x={bPos.x} y={bPos.y} onStart={e => onStart(e, `b${bi}`)}
                    style={{
                      background: col.bg, color: '#fff',
                      borderRadius: 11, padding: '8px 14px',
                      fontWeight: 700, fontSize: 12,
                      boxShadow: `0 4px 16px ${col.shadow}`,
                      maxWidth: 145, textAlign: 'center',
                    }}>
                    <span dir="rtl">{branch.label}</span>
                  </Node>
                )}

                {(branch.children ?? []).map((child, ci) => {
                  const cPos = pos[`c${bi}_${ci}`];
                  if (!cPos) return null;
                  return (
                    <Node key={ci} x={cPos.x} y={cPos.y} onStart={e => onStart(e, `c${bi}_${ci}`)}
                      style={{
                        background: col.childBg, color: col.childFg,
                        border: `1.5px solid ${col.childLine}`,
                        borderRadius: 9, padding: '6px 11px',
                        fontWeight: 600, fontSize: 11,
                        boxShadow: '0 2px 8px rgba(0,0,0,.07)',
                        maxWidth: 135, textAlign: 'center',
                      }}>
                      <span dir="rtl">{child}</span>
                    </Node>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Node({ x, y, onStart, style, children }) {
  return (
    <div
      onMouseDown={onStart}
      onTouchStart={onStart}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%,-50%)',
        cursor: 'grab',
        zIndex: 10,
        lineHeight: 1.4,
        wordBreak: 'break-word',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
