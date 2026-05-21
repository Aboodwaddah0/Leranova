import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchStudentSocial } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString();
const ordinal = (n) => { if (!n) return '—'; const s = ['th','st','nd','rd'], v = n%100; return n+(s[(v-20)%10]||s[v]||s[0]); };
function timeAgo(iso) {
  if (!iso) return '—';
  const m = Math.floor((Date.now()-new Date(iso).getTime())/60000);
  if (isNaN(m)) return '—';
  if (m<1) return 'just now'; if (m<60) return `${m}m ago`;
  const h=Math.floor(m/60); if (h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}
const isLive = (iso) => iso && Date.now()-new Date(iso).getTime()<300_000;
const EVENT_ICONS = { LESSON_COMPLETE:'📖', QUIZ_PASS:'✅', QUIZ_PERFECT:'🏆', DAILY_LOGIN:'🌅', FLASHCARD_SESSION:'🃏', MINDMAP_SESSION:'🗺️', CHATBOT_SESSION:'🤖' };
const MEDALS = ['🥇','🥈','🥉'];

// ── theme colors ──────────────────────────────────────────────────────────────
function useC() {
  const { isDark } = useTheme();
  return isDark ? {
    card:'#111029', border:'rgba(255,255,255,0.07)', text:'#f5f3f7',
    sub:'rgba(255,255,255,0.5)', muted:'rgba(255,255,255,0.25)',
    divider:'rgba(255,255,255,0.06)', row:'rgba(255,255,255,0.04)',
    you:'rgba(255,255,255,0.1)', youBorder:'rgba(255,255,255,0.3)',
    accent:'#8b5cf6', isDark,
  } : {
    card:'#ffffff', border:'rgba(0,0,0,0.08)', text:'#0f172a',
    sub:'#475569', muted:'#94a3b8',
    divider:'rgba(0,0,0,0.06)', row:'#f8fafc',
    you:'rgba(99,102,241,0.07)', youBorder:'rgba(99,102,241,0.4)',
    accent:'#6366f1', isDark,
  };
}

// ── animations ────────────────────────────────────────────────────────────────
const fadeUp = { hidden:{opacity:0,y:16}, visible:{opacity:1,y:0,transition:{duration:.38,ease:[.25,.46,.45,.94]}} };
const stagger = { visible:{transition:{staggerChildren:.08}} };

// ── keyframes ─────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes lnRotate    { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes lnGrad      { 0%,100%{opacity:.32} 50%{opacity:.52} }
  @keyframes lnShimmer   { 0%{transform:translateX(-100%) skewX(-12deg)} 100%{transform:translateX(260%) skewX(-12deg)} }
  @keyframes lnPulse     { 0%,100%{opacity:1} 50%{opacity:.25} }
  @keyframes lnBtnGlow   { 0%,100%{box-shadow:0 0 7px rgba(251,191,36,.3),0 0 0 1px rgba(251,191,36,.28)} 50%{box-shadow:0 0 20px rgba(251,191,36,.6),0 0 0 1px rgba(251,191,36,.55),0 0 36px rgba(251,191,36,.18)} }
  @keyframes lnRopeSwing { 0%{transform:rotate(-11deg)} 50%{transform:rotate(11deg)} 100%{transform:rotate(-11deg)} }
  @keyframes lnBurst { 0%{opacity:1;transform:translate(-50%,-50%) scale(1.3)} 100%{opacity:0;transform:translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) scale(.15)} }
  .ln-row { transition:background .15s,transform .18s; cursor:default; }
  .ln-row:hover { transform:translateX(3px); }
  .ln-burst { position:absolute;left:50%;top:50%;font-size:13px;opacity:0;pointer-events:none;user-select:none;z-index:25; }
  .ln-hero-icon { position:relative; }
  .ln-hero-icon:hover .ln-burst { animation:lnBurst .6s ease-out var(--bd,0s) forwards; }
  .ln-hero-icon:hover { cursor:default; }
  .ln-champ-wrap { position:relative; display:inline-block; }
  .ln-rope { position:absolute;left:50%;top:calc(100% + 1px);transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;opacity:0;pointer-events:none;transition:opacity .18s;z-index:30; }
  .ln-champ-wrap:hover .ln-rope { opacity:1; }
  .ln-rope-inner { display:flex;flex-direction:column;align-items:center;transform-origin:top center; }
  .ln-champ-wrap:hover .ln-rope-inner { animation:lnRopeSwing 1.3s ease-in-out infinite; }
  .ln-rope-line { width:2px;height:0;background:linear-gradient(180deg,rgba(251,191,36,.95),rgba(251,191,36,.25));border-radius:1px;transition:height .22s ease; }
  .ln-champ-wrap:hover .ln-rope-line { height:22px; }
  .ln-rope-dot { width:6px;height:6px;border-radius:50%;background:rgba(251,191,36,.75);box-shadow:0 0 6px rgba(251,191,36,.6);transform:scale(0);transition:transform .18s .14s; }
  .ln-champ-wrap:hover .ln-rope-dot { transform:scale(1); }
`;

// ── countdown ─────────────────────────────────────────────────────────────────
function useCountdown(iso) {
  const [rem,setRem] = useState(0);
  useEffect(() => {
    if (!iso) return;
    const tick = () => setRem(Math.max(0,new Date(iso).getTime()-Date.now()));
    tick(); const id=setInterval(tick,1000); return ()=>clearInterval(id);
  },[iso]);
  const s=Math.floor(rem/1000);
  return { days:Math.floor(s/86400), hours:Math.floor((s%86400)/3600), minutes:Math.floor((s%3600)/60), seconds:s%60, done:rem===0 };
}

// ── base card ─────────────────────────────────────────────────────────────────
function Card({ C, children, className='', style={} }) {
  return (
    <div className={`overflow-hidden rounded-2xl ${className}`}
      style={{ background:C.card, border:`1px solid ${C.border}`, boxShadow: C.isDark?'none':'0 1px 8px rgba(0,0,0,0.05)', ...style }}>
      {children}
    </div>
  );
}
function CardHead({ C, icon, title, badge }) {
  return (
    <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom:`1px solid ${C.divider}` }}>
      <span className="text-base">{icon}</span>
      <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color:C.muted }}>{title}</h3>
      {badge!=null && <span className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background:C.row, color:C.muted }}>{badge}</span>}
    </div>
  );
}

// ── skeleton ──────────────────────────────────────────────────────────────────
function Skel({ h='48', round='xl' }) {
  return <div className={`animate-pulse rounded-${round}`} style={{ height:h, background:'rgba(128,128,128,0.09)' }} />;
}
function PageSkeleton() {
  return (
    <div className="space-y-5">
      <Skel h="180" round="3xl" /><Skel h="280" /><Skel h="260" /><Skel h="220" /><Skel h="200" />
    </div>
  );
}

// ── ① Hero ────────────────────────────────────────────────────────────────────
function Hero({ myRank, xpRace, isArabic, achieveCount }) {
  const C         = useC();
  const D         = C.isDark;
  const rank      = myRank?.rank ?? xpRace?.me?.rank;
  const totalXp   = myRank?.totalXp ?? xpRace?.me?.totalXp ?? 0;
  const level     = xpRace?.me?.level ?? '—';
  const weeklyXp  = myRank?.weeklyXp ?? 0;
  const streak    = xpRace?.me?.currentStreak ?? 0;
  const weeklyRank= myRank?.weeklyRank;
  const above     = xpRace?.above;
  const xpGap     = xpRace?.xpToOvertake;

  // theme-aware tokens
  const H = D ? {
    bg:        'linear-gradient(135deg,#0c0b23 0%,#12102e 100%)',
    border:    '1px solid rgba(255,255,255,0.07)',
    shadow:    '0 24px 64px rgba(0,0,0,0.5)',
    glow:      'radial-gradient(ellipse 60% 70% at 8% 50%,rgba(255,255,255,0.06),transparent)',
    gridClr:   'rgba(255,255,255,0.18)',
    ring:      'conic-gradient(from 0deg,rgba(255,255,255,0.6),rgba(255,255,255,0.08),rgba(255,255,255,0.6))',
    iconBg:    'rgba(255,255,255,0.07)',
    iconBdr:   '2px solid rgba(255,255,255,0.16)',
    iconShd:   '0 8px 24px rgba(0,0,0,0.4)',
    label:     'rgba(255,255,255,0.3)',
    title:     '#ffffff',
    sub:       'rgba(255,255,255,0.38)',
    chipBg:    'rgba(255,255,255,0.08)',
    chipBdr:   'rgba(255,255,255,0.12)',
    chipVal:   '#ffffff',
    chipLbl:   'rgba(255,255,255,0.35)',
    chipGoldBg:'rgba(255,215,0,0.1)',
    chipGoldBdr:'rgba(255,215,0,0.3)',
    stripDiv:  'rgba(255,255,255,0.06)',
    indBg:     'rgba(255,255,255,0.06)',
    indBdr:    'rgba(255,255,255,0.09)',
    indTxt:    'rgba(255,255,255,0.7)',
    indVal:    '#ffffff',
    goldBg:    'rgba(255,215,0,0.08)',
    goldBdr:   'rgba(255,215,0,0.2)',
    goldTxt:   '#fbbf24',
    refTxt:    'rgba(255,255,255,0.22)',
  } : {
    bg:        'linear-gradient(135deg,#ffffff 0%,#f0f4ff 100%)',
    border:    '1px solid rgba(99,102,241,0.14)',
    shadow:    '0 4px 32px rgba(99,102,241,0.1)',
    glow:      'radial-gradient(ellipse 55% 70% at 8% 50%,rgba(99,102,241,0.08),transparent)',
    gridClr:   'rgba(99,102,241,0.08)',
    ring:      'conic-gradient(from 0deg,rgba(99,102,241,0.7),rgba(99,102,241,0.12),rgba(99,102,241,0.7))',
    iconBg:    'rgba(99,102,241,0.1)',
    iconBdr:   '2px solid rgba(99,102,241,0.25)',
    iconShd:   '0 8px 24px rgba(99,102,241,0.12)',
    label:     '#6366f1',
    title:     '#1e1b4b',
    sub:       '#4f46e5',
    chipBg:    'rgba(99,102,241,0.07)',
    chipBdr:   'rgba(99,102,241,0.2)',
    chipVal:   '#1e1b4b',
    chipLbl:   '#6366f1',
    chipGoldBg:'rgba(217,119,6,0.08)',
    chipGoldBdr:'rgba(217,119,6,0.25)',
    chipVal_gold:'#b45309',
    chipLbl_gold:'#d97706',
    stripDiv:  'rgba(99,102,241,0.1)',
    indBg:     'rgba(99,102,241,0.06)',
    indBdr:    'rgba(99,102,241,0.15)',
    indTxt:    '#4338ca',
    indVal:    '#1e1b4b',
    goldBg:    'rgba(217,119,6,0.07)',
    goldBdr:   'rgba(217,119,6,0.2)',
    goldTxt:   '#b45309',
    refTxt:    '#94a3b8',
  };

  const chipVar = { hidden:{opacity:0,y:10,scale:.9}, visible:{opacity:1,y:0,scale:1,transition:{duration:.3}} };
  const chips = [
    rank       && { v:`#${rank}`,       l:isArabic?'ترتيبك':'Rank',   gold:rank<=3 },
    weeklyRank && { v:`#${weeklyRank}`, l:isArabic?'أسبوعي':'Weekly', gold:false },
    {             v:fmt(totalXp),       l:'Total XP',                  gold:false },
    {             v:`Lv.${level}`,      l:isArabic?'المستوى':'Level',  gold:false },
    streak>0   && { v:`🔥${streak}d`,   l:isArabic?'السلسلة':'Streak', gold:false },
  ].filter(Boolean);

  return (
    <motion.section variants={fadeUp} className="relative overflow-hidden rounded-3xl"
      style={{ padding:'28px 32px 24px', background:H.bg, border:H.border, boxShadow:H.shadow }}>
      <div className="pointer-events-none absolute inset-0" style={{ background:H.glow, animation:'lnGrad 9s ease infinite' }} />
      <div className="pointer-events-none absolute inset-0" style={{ opacity:.018, backgroundImage:`linear-gradient(${H.gridClr} 1px,transparent 1px),linear-gradient(90deg,${H.gridClr} 1px,transparent 1px)`, backgroundSize:'22px 22px' }} />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0 ln-hero-icon">
              {[[0,-42,'0s'],[30,-30,'.04s'],[42,0,'.02s'],[30,30,'.06s'],[0,42,'.04s'],[-30,30,'.08s'],[-42,0,'.03s'],[-30,-30,'.05s']].map(([tx,ty,bd],i)=>(
                <span key={i} className="ln-burst" style={{ '--tx':`${tx}px`,'--ty':`${ty}px`,'--bd':bd }}>🏆</span>
              ))}
              <div className="absolute rounded-full pointer-events-none" style={{ inset:'-4px', background:H.ring, animation:'lnRotate 5s linear infinite', opacity:.45 }} />
              <div className="relative flex h-[60px] w-[60px] items-center justify-center rounded-full text-3xl"
                style={{ background:H.iconBg, border:H.iconBdr, boxShadow:H.iconShd }}>🏆</div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[9px] font-bold uppercase tracking-[.22em]" style={{ color:H.label }}>
                  {isArabic?'منصة المنافسة':'Competition Arena'}
                </p>
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ background:'rgba(74,222,128,0.12)', border:'1px solid rgba(74,222,128,0.28)', color:'#16a34a' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" style={{ animation:'lnPulse 1.4s ease infinite' }} />
                  {isArabic?'مباشر':'Live'}
                </span>
              </div>
              <h1 className="text-[24px] font-black tracking-tight" style={{ color:H.title }}>{isArabic?'المنافسة والتحديات':'Competition & Challenges'}</h1>
              <p className="mt-0.5 text-[12px]" style={{ color:H.sub }}>
                {isArabic?'تحدَّ زملاءك واكسب المزيد من XP':'Compete with classmates and earn more XP'}
              </p>
            </div>
          </div>

          <motion.div className="flex flex-wrap gap-2" variants={{ visible:{transition:{staggerChildren:.08,delayChildren:.15}} }}>
            {chips.map((c,i) => (
              <motion.div key={i} variants={chipVar} className="flex flex-col items-center rounded-2xl px-5 py-2.5"
                style={{ background:c.gold?H.chipGoldBg:H.chipBg, border:`1px solid ${c.gold?H.chipGoldBdr:H.chipBdr}`, minWidth:68 }}>
                <span className="text-[20px] font-black leading-tight"
                  style={{ color: c.gold ? (H.chipVal_gold||'#fbbf24') : H.chipVal }}>{c.v}</span>
                <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: c.gold ? (H.chipLbl_gold||H.chipLbl) : H.chipLbl }}>{c.l}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5" style={{ borderTop:`1px solid ${H.stripDiv}`, paddingTop:14 }}>
          {weeklyXp>0 && (
            <span className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold"
              style={{ background:H.indBg, border:`1px solid ${H.indBdr}`, color:H.indTxt }}>
              📈 <span className="font-black" style={{ color:H.indVal }}>+{fmt(weeklyXp)}</span> XP {isArabic?'هذا الأسبوع':'this week'}
            </span>
          )}
          {xpGap!=null && above ? (
            <span className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold"
              style={{ background:H.indBg, border:`1px solid ${H.indBdr}`, color:H.indTxt }}>
              ⚔️ <span className="font-black" style={{ color:H.indVal }}>+{fmt(xpGap)}</span> XP {isArabic?`للتغلب على ${above.name}`:`to overtake ${above.name}`}
            </span>
          ) : !above && (
            <span className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold"
              style={{ background:H.goldBg, border:`1px solid ${H.goldBdr}`, color:H.goldTxt }}>
              👑 {isArabic?'أنت في الصدارة!':'You\'re leading!'}
            </span>
          )}
          {achieveCount>0 && (
            <span className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold"
              style={{ background:H.goldBg, border:`1px solid ${H.goldBdr}`, color:H.goldTxt }}>
              🏅 <span className="font-black" style={{ color:H.indVal }}>{achieveCount}</span> {isArabic?'إنجاز مكتسب':'badges earned'}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1.5 text-[10px]" style={{ color:H.refTxt }}>
            <span className="h-1 w-1 rounded-full bg-emerald-500" style={{ animation:'lnPulse 2s ease infinite' }} />
            {isArabic?'يتحدث كل 30 ث':'Refreshes every 30s'}
          </span>
        </div>
      </div>
    </motion.section>
  );
}

// ── ② Top Champions Podium ────────────────────────────────────────────────────
const PODIUM_META = {
  1:{ grad:'linear-gradient(135deg,#f59e0b,#fbbf24)', glow:'rgba(251,191,36,0.45)', border:'rgba(251,191,36,0.5)',  rankClr:'#f59e0b', medal:'🥇', blockH:72, avSize:64, avFont:20 },
  2:{ grad:'linear-gradient(135deg,#64748b,#94a3b8)', glow:'rgba(148,163,184,0.25)',border:'rgba(148,163,184,0.45)',rankClr:'#94a3b8', medal:'🥈', blockH:52, avSize:52, avFont:16 },
  3:{ grad:'linear-gradient(135deg,#c2410c,#fb923c)', glow:'rgba(251,146,60,0.3)', border:'rgba(251,146,60,0.4)',  rankClr:'#fb923c', medal:'🥉', blockH:40, avSize:44, avFont:14 },
};

function TopChampions({ top3, isArabic }) {
  const C = useC();
  if (!top3?.length) return null;
  // display order: silver (left), gold (center), bronze (right)
  const display = [{ s:top3[1],pos:2 },{ s:top3[0],pos:1 },{ s:top3[2],pos:3 }].filter(d=>d.s);

  return (
    <motion.div
      initial={{ opacity:0, scale:.93, y:-10 }}
      animate={{ opacity:1, scale:1, y:0 }}
      exit={{ opacity:0, scale:.93, y:-8 }}
      transition={{ duration:.38, ease:[.22,1,.36,1] }}
    >
      <Card C={C} className="relative overflow-hidden">
        {/* subtle gold glow at top */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{ background:'radial-gradient(ellipse 70% 100% at 50% 0%,rgba(251,191,36,0.07),transparent)' }} />
        <div className="relative px-6 pt-5 pb-0">
          <p className="text-center text-[10px] font-bold uppercase tracking-[.2em] mb-5" style={{ color:C.muted }}>
            {isArabic?'أبطال المتصدرين':'Top Champions'}
          </p>
          <div className="flex items-end justify-center gap-3">
            {display.map(({ s, pos }, idx) => {
              const P    = PODIUM_META[pos];
              const init = (s?.name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
              const xp   = s?._xp ?? s?.totalXp ?? 0;
              const blkBg= C.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
              return (
                <motion.div key={pos} className="flex flex-col items-center"
                  initial={{ opacity:0, y:24 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ duration:.42, delay:idx*.08+.1, ease:[.22,1,.36,1] }}>
                  {/* crown space — #1 only */}
                  <div className="flex h-7 items-end justify-center mb-1">
                    {pos===1 && <span style={{ fontSize:22, lineHeight:1 }}>👑</span>}
                  </div>
                  {/* avatar ring + initials */}
                  <div className="relative mb-2">
                    <div className="flex items-center justify-center rounded-full font-black text-white"
                      style={{ width:P.avSize, height:P.avSize, background:P.grad, fontSize:P.avFont,
                        boxShadow:`0 0 0 3px ${C.card},0 0 0 5px ${P.border},0 6px 20px ${P.glow}` }}>
                      {init}
                    </div>
                    <span className="absolute -bottom-1.5 -right-1.5 leading-none"
                      style={{ fontSize:pos===1?16:14, filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}>
                      {P.medal}
                    </span>
                  </div>
                  {/* name */}
                  <p className="text-center font-semibold truncate"
                    style={{ fontSize:pos===1?12:11, maxWidth:P.avSize+16, color:C.text }}>
                    {s?.name?.split(' ')[0]||'—'}
                  </p>
                  {/* xp — teal */}
                  <p className="font-black tabular-nums mt-0.5" style={{ fontSize:pos===1?11:10, color:'#0d9488' }}>
                    {fmt(xp)} XP
                  </p>
                  {/* podium block */}
                  <div className="mt-2 rounded-t-lg flex items-center justify-center"
                    style={{ width:P.avSize+16, height:P.blockH, background:blkBg, border:`1.5px solid ${P.border}`, borderBottom:'none' }}>
                    <span className="font-black" style={{ fontSize:pos===1?28:22, color:P.rankClr }}>{pos}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ── ③ Leaderboard (bar chart + rows) ─────────────────────────────────────────
const RANK_COLORS = {
  1: { bar:'linear-gradient(90deg,#f59e0b,#fbbf24)', glow:'rgba(251,191,36,0.35)', label:'#fbbf24', medal:'👑' },
  2: { bar:'linear-gradient(90deg,#64748b,#94a3b8)', glow:'rgba(148,163,184,0.2)',  label:'#94a3b8', medal:'🥈' },
  3: { bar:'linear-gradient(90deg,#d97706,#fb923c)', glow:'rgba(251,146,60,0.3)',   label:'#fb923c', medal:'🥉' },
};

function Leaderboard({ board, achieveShowcase, myStudentId, xpRace, weeklyChallenge, isArabic }) {
  const C = useC();
  const achieveMap = new Map((achieveShowcase?.topAchievers||[]).map(a=>[a.studentId,a.count]));
  const meXp   = xpRace?.me?.totalXp ?? null;
  const meLevel= xpRace?.me?.level ?? null;
  const [showPodium, setShowPodium] = useState(false);
  if (!board?.length) return null;

  const wlMap  = new Map((weeklyChallenge?.leaderboard||[]).map(e=>[e.studentId,e.weeklyXp]));
  const enrich = s => ({ ...s, _xp: wlMap.get(s.studentId) ?? s.weeklyXp ?? (s.studentId===myStudentId&&meXp!=null?meXp:0) });
  const all    = board.map(enrich);
  const maxXp  = Math.ceil(Math.max(...all.slice(0,5).map(s=>s._xp), 1) * 1.22); // pad 22% so leader bar ≠ 100%
  const top3   = all.slice(0,3);

  return (
    <motion.div variants={fadeUp} className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[.18em]" style={{ color:C.muted }}>
          {isArabic?'لوحة المتصدرين':'Leaderboard'}
        </p>
        {top3.length >= 2 && (
          <div className="ln-champ-wrap">
            {/* rope — pendulum on hover */}
            <div className="ln-rope">
              <div className="ln-rope-inner">
                <div className="ln-rope-line" />
                <div className="ln-rope-dot" />
              </div>
            </div>
            <button type="button" onClick={() => setShowPodium(p=>!p)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold"
              style={{
                background: showPodium
                  ? (C.isDark?'rgba(251,191,36,0.18)':'rgba(251,191,36,0.13)')
                  : (C.isDark?'rgba(251,191,36,0.07)':'rgba(251,191,36,0.06)'),
                border:`1px solid ${showPodium?'rgba(251,191,36,0.6)':'rgba(251,191,36,0.3)'}`,
                color:'#f59e0b',
                animation:'lnBtnGlow 2.6s ease infinite',
                transition:'background .2s,border-color .2s',
              }}>
              🏆 {isArabic?'الأبطال':'Champions'}
              <span style={{ display:'inline-block', transform:showPodium?'rotate(180deg)':'none', transition:'transform .2s' }}>▾</span>
            </button>
          </div>
        )}
      </div>
      <AnimatePresence>
        {showPodium && <TopChampions key="podium" top3={top3} isArabic={isArabic} />}
      </AnimatePresence>
      <Card C={C}>
        {/* ── Bar chart: top 5 ── */}
        <div className="px-5 pt-4 pb-3" style={{ borderBottom:`1px solid ${C.divider}` }}>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider" style={{ color:C.muted }}>
            {isArabic?'الترتيب حسب النقاط':'Rankings by XP'}
          </p>
          <div className="space-y-1">
            {all.slice(0,5).map((s,i) => {
              const isMe   = s.studentId===myStudentId;
              const meta   = RANK_COLORS[s.rank];
              const xpVal  = isMe&&meXp!=null ? meXp : s._xp;
              const pct    = Math.max(2, (xpVal / maxXp) * 100);
              const init   = (s.name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
              const barClr = isMe ? `linear-gradient(90deg,${C.accent}bb,${C.accent})` : (meta?.bar||`linear-gradient(90deg,${C.border},${C.sub}aa)`);
              const barShd = isMe ? `0 2px 10px ${C.accent}44` : (meta?`0 2px 8px ${meta.glow}`:'none');

              return (
                <motion.div key={s.studentId}
                  whileHover={{ backgroundColor:C.isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)', x:1 }}
                  transition={{ duration:.13 }}
                  style={{ borderRadius:10, padding:'9px 8px', margin:'0 -8px', cursor:'default' }}>
                  {/* name row */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-5 shrink-0 text-center">
                      {meta ? <span className="text-[14px]">{meta.medal}</span>
                        : <span className="text-[10px] font-bold" style={{ color:C.muted }}>#{s.rank}</span>}
                    </div>
                    <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ background:isMe?C.you:(meta?'transparent':C.row), border:`1.5px solid ${isMe?C.youBorder:(meta?.label||C.border)}`, color:isMe?C.accent:(meta?.label||C.sub) }}>
                      {init}
                    </div>
                    <span className="flex-1 truncate text-[12px] font-semibold" style={{ color:isMe?C.text:C.sub }}>
                      {isMe?(isArabic?'⭐ أنت':'⭐ You'):s.name?.split(' ')[0]}
                    </span>
                    <span className="shrink-0 text-[12px] font-black tabular-nums" style={{ color:meta?.label||(isMe?C.accent:C.text) }}>
                      {fmt(xpVal)}<span className="text-[9px] font-medium ml-0.5" style={{ color:C.muted }}>XP</span>
                    </span>
                    {s.currentStreak>0 && <span className="shrink-0 text-[10px] font-bold text-amber-500 tabular-nums">🔥{s.currentStreak}</span>}
                  </div>
                  {/* slim bar — no track label, no numbers */}
                  <div className="ml-[46px] rounded-full overflow-hidden"
                    style={{ height:5, background:C.isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)' }}>
                    <motion.div className="h-full rounded-full relative overflow-hidden"
                      initial={{ width:0 }}
                      animate={{ width:`${pct}%` }}
                      transition={{ type:'spring', stiffness:52, damping:13, delay:i*.1 }}
                      style={{ background:barClr, boxShadow:barShd }}>
                      <div className="absolute inset-0" style={{ background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)', animation:'lnShimmer 3.5s ease infinite' }} />
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Rows: rest ── */}
        {all.slice(5).map((s,i) => {
          const isMe    = s.studentId===myStudentId;
          const init    = (s.name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
          const fillPct = Math.min(100,(s.currentStreak/30)*100);
          const achCount= achieveMap.get(s.studentId)??0;

          return (
            <div key={s.studentId} className="ln-row flex items-center gap-3"
              style={{
                padding:'10px 20px',
                borderBottom: i<all.slice(5).length-1 ? `1px solid ${C.divider}` : 'none',
                background: isMe ? C.you : 'transparent',
                ...(isMe ? { borderLeft:`3px solid ${C.youBorder}` } : {}),
              }}>
              <span className="w-8 shrink-0 text-center text-[12px] font-bold" style={{ color:isMe?C.accent:C.muted }}>#{s.rank}</span>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background:C.row, border:`1px solid ${isMe?C.youBorder:C.border}`, color:C.sub }}>
                {init}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[12px] font-semibold" style={{ color:isMe?C.text:C.sub }}>
                  {isMe?(isArabic?'⭐ أنت':'⭐ You'):s.name}
                </p>
                {s.longestStreak>0 && <p className="text-[10px]" style={{ color:C.muted }}>Best: {s.longestStreak}d</p>}
              </div>
              {isMe&&meLevel && (
                <span className="hidden sm:block shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background:C.row, color:C.muted }}>Lv.{meLevel}</span>
              )}
              <div className="hidden md:block w-[80px]">
                <div className="h-1.5 overflow-hidden rounded-full" style={{ background:C.divider }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width:`${fillPct}%`, background:isMe?C.accent:'rgba(251,191,36,0.6)' }} />
                </div>
              </div>
              <span className="hidden lg:block shrink-0 min-w-[58px] text-right text-[11px]" style={{ color:C.muted }}>
                {isMe&&meXp!=null?`${fmt(meXp)} XP`:achCount>0?`${achCount} 🏅`:'—'}
              </span>
              {s.currentStreak>0 && <span className="shrink-0 text-[11px] font-bold text-amber-500">🔥{s.currentStreak}</span>}
            </div>
          );
        })}
      </Card>
    </motion.div>
  );
}

// ── ③ Weekly Challenge ────────────────────────────────────────────────────────
function WeeklyChallenge({ challenge, isArabic }) {
  const C = useC();
  const { days,hours,minutes,seconds,done } = useCountdown(challenge?.endsAt);
  if (!challenge) return null;
  const { title, description, myRank, myWeeklyXp, leader, leaderboard } = challenge;
  const progress = leader?.weeklyXp>0 ? Math.min((myWeeklyXp/leader.weeklyXp)*100,100) : 0;
  const pad = n => String(n).padStart(2,'0');

  return (
    <motion.div variants={fadeUp}>
      <Card C={C} className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-y-0 w-[50%]" style={{ background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.02),transparent)', animation:'lnShimmer 6s ease infinite' }} />
        </div>
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest"
                  style={{ background:C.row, border:`1px solid ${C.border}`, color:C.muted }}>
                  ⚡ {isArabic?'تحدي الأسبوع':'Weekly Challenge'}
                </span>
                {!done && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color:'#4ade80' }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ animation:'lnPulse 1.4s ease infinite' }} />
                    {isArabic?'نشط':'Active'}
                  </span>
                )}
              </div>
              <h2 className="text-[20px] font-black" style={{ color:C.text }}>{title}</h2>
              <p className="mt-1 text-[12px]" style={{ color:C.sub }}>{description}</p>
            </div>
            {myRank && (
              <div className="shrink-0 rounded-2xl px-5 py-3 text-center"
                style={{ background:C.row, border:`1px solid ${C.border}` }}>
                <p className="text-[22px] font-black" style={{ color:C.text }}>{ordinal(myRank)}</p>
                <p className="text-[9px] font-semibold mt-0.5" style={{ color:C.muted }}>{isArabic?'ترتيبك':'my rank'}</p>
              </div>
            )}
          </div>

          {/* Countdown */}
          {!done && (
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="text-[9px] font-bold uppercase tracking-wider mr-1" style={{ color:C.muted }}>
                {isArabic?'ينتهي':'Ends in'}
              </span>
              {[days>0&&[days,'d'],[hours,'h'],[minutes,'m'],[seconds,'s']].filter(Boolean).map(([v,l],i,arr)=>(
                <span key={i} className="flex items-baseline gap-0.5">
                  <span className="text-[22px] font-black tabular-nums" style={{ color:C.text }}>{pad(v)}</span>
                  <span className="text-[10px] font-bold" style={{ color:C.muted }}>{l}</span>
                  {i<arr.length-1 && <span className="mx-1 text-[18px]" style={{ color:C.divider }}>:</span>}
                </span>
              ))}
            </div>
          )}

          {/* Progress vs leader */}
          {leader?.weeklyXp>0 && (
            <div className="rounded-xl p-4 mb-4" style={{ background:C.row, border:`1px solid ${C.border}` }}>
              <div className="flex justify-between text-[10px] mb-2" style={{ color:C.sub }}>
                <span>{isArabic?'أنا':'Me'}: <span className="font-black" style={{ color:C.text }}>{fmt(myWeeklyXp)} XP</span></span>
                <span>{isArabic?'المتصدر':'Leader'}: <span className="font-black text-amber-500">{fmt(leader.weeklyXp)} XP ({leader.name})</span></span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full" style={{ background:C.divider }}>
                <motion.div className="h-full rounded-full relative overflow-hidden"
                  style={{ background:`linear-gradient(90deg,${C.accent}cc,${C.accent})` }}
                  initial={{ width:0 }} animate={{ width:`${progress}%` }} transition={{ duration:.9, ease:'easeOut' }}>
                  <div className="absolute inset-0" style={{ background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)', animation:'lnShimmer 2.5s ease infinite' }} />
                </motion.div>
              </div>
            </div>
          )}

          {/* Mini leaderboard */}
          {leaderboard?.length>0 && (
            <div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-wider" style={{ color:C.muted }}>
                {isArabic?'الأوائل هذا الأسبوع':'Top this week'}
              </p>
              <div className="space-y-1.5">
                {leaderboard.slice(0,4).map(s=>(
                  <div key={s.studentId} className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                    style={{ background:C.row, border:`1px solid ${C.border}` }}>
                    <span className="w-5 text-center shrink-0 text-[13px]">{s.rank<=3?MEDALS[s.rank-1]:`#${s.rank}`}</span>
                    <span className="flex-1 truncate text-[12px] font-medium" style={{ color:C.text }}>{s.name}</span>
                    <span className="shrink-0 text-[11px] font-black text-amber-500">+{fmt(s.weeklyXp)} XP</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ── ④ Class Feed ──────────────────────────────────────────────────────────────
function ClassFeed({ feed, isArabic }) {
  const C = useC();
  const items = (feed||[]).slice(0,8);
  return (
    <motion.div variants={fadeUp}>
      <Card C={C}>
        <CardHead C={C} icon="📡" title={isArabic?'نشاط الصف':'Class Feed'} badge={items.length||null} />
        <div className="p-4">
          {!items.length ? (
            <p className="py-6 text-center text-[12px]" style={{ color:C.muted }}>{isArabic?'لا يوجد نشاط':'No class activity'}</p>
          ) : (
            <div className="space-y-1.5">
              {items.map((item,i)=>(
                <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background:C.row }}>
                  <span className="relative shrink-0 text-base">
                    {EVENT_ICONS[item.eventType]??'⚡'}
                    {isLive(item.occurredAt) && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ animation:'lnPulse 1.5s ease infinite' }} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px]" style={{ color:C.sub }}>
                      <span className="font-semibold" style={{ color:C.text }}>{item.studentName}</span> — {item.label}
                    </p>
                    <p className="text-[10px]" style={{ color:C.muted }}>{timeAgo(item.occurredAt)}</p>
                  </div>
                  {item.xpAwarded>0 && (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold"
                      style={{ background:C.row, border:`1px solid ${C.border}`, color:C.sub }}>
                      +{item.xpAwarded} XP
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ── ⑤ Achievements ────────────────────────────────────────────────────────────
function Achievements({ showcase, isArabic }) {
  const C = useC();
  if (!showcase?.topAchievers?.length) return null;
  const { myCount, topAchievers } = showcase;
  return (
    <motion.div variants={fadeUp}>
      <Card C={C}>
        <CardHead C={C} icon="🏅" title={isArabic?'قادة الإنجازات':'Achievement Leaders'} badge={myCount>0?`${isArabic?'لديك':'You'}: ${myCount}`:null} />
        <div className="p-4 space-y-1.5">
          {topAchievers.slice(0,5).map(a=>(
            <div key={a.studentId} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ background:a.isMe?C.you:C.row, border:`1px solid ${a.isMe?C.youBorder:C.border}` }}>
              <span className="w-6 text-center shrink-0">{a.rank<=3?MEDALS[a.rank-1]:`#${a.rank}`}</span>
              <p className="flex-1 truncate text-[12px] font-semibold" style={{ color:C.text }}>
                {a.name}{a.isMe?` (${isArabic?'أنت':'You'})`:''}
              </p>
              <span className="shrink-0 text-[11px] font-bold" style={{ color:C.muted }}>{a.count} 🏅</span>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function StudentSocialPage() {
  const { isArabic } = useLanguage();
  const [social, setSocial]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const pollRef               = useRef(null);
  const myStudentId           = social?.xpRace?.me?.studentId ?? null;
  const C = useC();

  const load = useCallback(async (silent=false) => {
    if (!silent) setError(null);
    try { const d=await fetchStudentSocial(); if(d) setSocial(d); }
    catch { if(!silent) setError('Failed to load competition data.'); }
    finally { if(!silent) setLoading(false); }
  },[]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(()=>load(true), 30_000);
    return ()=>clearInterval(pollRef.current);
  },[load]);

  return (
    <StudentLayout fullWidth>
      <style>{CSS}</style>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="sk" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><PageSkeleton /></motion.div>
        ) : error ? (
          <motion.div key="err" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
            className="flex h-52 flex-col items-center justify-center gap-3 rounded-2xl"
            style={{ border:`1px solid rgba(239,68,68,0.2)`, background:'rgba(239,68,68,0.04)' }}>
            <span className="text-3xl">⚠️</span>
            <p className="text-sm font-medium text-red-500">{error}</p>
            <button type="button" onClick={()=>{setLoading(true);load();}}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background:C.accent }}>Retry</button>
          </motion.div>
        ) : !social ? (
          <motion.p key="empty" initial={{opacity:0}} animate={{opacity:1}}
            className="py-16 text-center text-sm" style={{ color:C.muted }}>
            {isArabic?'لا توجد بيانات بعد — ابدأ باكتساب XP!':'No competition data yet — start earning XP!'}
          </motion.p>
        ) : (
          <motion.div key="content" variants={stagger} initial="hidden" animate="visible" className="space-y-6">
            <Hero          myRank={social.myRank} xpRace={social.xpRace} isArabic={isArabic}
                           achieveCount={social.achievementShowcase?.myCount ?? 0} />
            <Leaderboard   board={social.streakCompetition} achieveShowcase={social.achievementShowcase}
                           myStudentId={myStudentId} xpRace={social.xpRace} weeklyChallenge={social.weeklyChallenge} isArabic={isArabic} />
            {social.weeklyChallenge && <WeeklyChallenge challenge={social.weeklyChallenge} isArabic={isArabic} />}
            <ClassFeed     feed={social.socialFeed} isArabic={isArabic} />
          </motion.div>
        )}
      </AnimatePresence>
    </StudentLayout>
  );
}
