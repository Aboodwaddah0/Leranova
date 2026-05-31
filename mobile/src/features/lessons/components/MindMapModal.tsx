/**
 * MindMapModal — full-screen interactive mind map.
 *
 * ✓ Pinch-to-zoom + pan on UI thread (60 fps, no jank)
 * ✓ Soft pan boundaries so the map can't disappear off-screen
 * ✓ Every node is individually draggable
 * ✓ Drag a branch node  → branch + ALL its children follow + glow
 * ✓ Drag the center     → ALL nodes follow + glow
 * ✓ SVG lines update live via AnimatedLine + useAnimatedProps
 * ✓ ↺ Reset returns every node and the canvas to original position
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal,
} from 'react-native';
import Svg, { Line, Path, Rect, Ellipse, Defs, Pattern, Circle } from 'react-native-svg';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps,
  withSpring, withTiming, withDelay, withSequence,
  runOnJS, Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import type { MindMap } from '../../../types/student';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get('window');
const CW = 1400, CH = 1400, CX = 700, CY = 700;
const BRANCH_R = 310, CHILD_R = 190, SPREAD = 0.68;
const INITIAL_SCALE = (SW / CW) * 0.87;
const INITIAL_TX    = SW / 2 - CW / 2;
const INITIAL_TY    = (CH * INITIAL_SCALE) / 2 - CH / 2;
const SPRING        = { damping: 15, stiffness: 120 } as const;

// Keep the canvas within ±PAN_LIMIT canvas-pixels of initial centre
const PAN_LIMIT_X = CW * 0.65;
const PAN_LIMIT_Y = CH * 0.65;

const COLORS = [
  { bg: '#6366f1', child: '#e0e7ff', childFg: '#3730a3', line: '#818cf8' },
  { bg: '#8b5cf6', child: '#ede9fe', childFg: '#5b21b6', line: '#a78bfa' },
  { bg: '#ec4899', child: '#fce7f3', childFg: '#9d174d', line: '#f472b6' },
  { bg: '#f59e0b', child: '#fef3c7', childFg: '#92400e', line: '#fbbf24' },
  { bg: '#10b981', child: '#d1fae5', childFg: '#065f46', line: '#34d399' },
  { bg: '#ef4444', child: '#fee2e2', childFg: '#7f1d1d', line: '#f87171' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
type Pos     = { x: number; y: number };
type PosMap  = Record<string, Pos>;
type KidsMap = Record<string, string[]>;

function buildLayout(mm: MindMap): PosMap {
  const out: PosMap = { center: { x: CX, y: CY } };
  const branches = mm.branches ?? [];
  const n = branches.length || 1;
  branches.forEach((b, bi) => {
    const ang = (bi / n) * 2 * Math.PI - Math.PI / 2;
    const bx = CX + Math.cos(ang) * BRANCH_R;
    const by = CY + Math.sin(ang) * BRANCH_R;
    out[`b${bi}`] = { x: bx, y: by };
    (b.children ?? []).forEach((_, ci) => {
      const kids = (b.children ?? []).length;
      const fan  = kids > 1 ? (ci - (kids - 1) / 2) * SPREAD : 0;
      out[`c${bi}_${ci}`] = {
        x: bx + Math.cos(ang + fan) * CHILD_R,
        y: by + Math.sin(ang + fan) * CHILD_R,
      };
    });
  });
  return out;
}

function buildKidsMap(mm: MindMap): KidsMap {
  const out: KidsMap = { center: [] };
  (mm.branches ?? []).forEach((b, bi) => {
    const childIds = (b.children ?? []).map((_, ci) => `c${bi}_${ci}`);
    out[`b${bi}`] = childIds;
    out.center.push(`b${bi}`, ...childIds); // center drags ALL
    childIds.forEach(id => { out[id] = []; });
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// PaperMapSvg — paper map visual used in the opening animation
// ─────────────────────────────────────────────────────────────────────────────
const MAP_W = 220, MAP_H = 150;

function PaperMapSvg() {
  return (
    <View style={S.paperShadow}>
      <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        {/* Ocean */}
        <Rect x="0" y="0" width={MAP_W} height={MAP_H} fill="#3da8d4" rx="5" />
        {/* Continents */}
        <Ellipse cx="38"  cy="58"  rx="24" ry="30" fill="#2eb865" />
        <Ellipse cx="36"  cy="36"  rx="11" ry="9"  fill="#2eb865" />
        <Ellipse cx="100" cy="42"  rx="36" ry="26" fill="#45c974" />
        <Ellipse cx="88"  cy="76"  rx="16" ry="12" fill="#2eb865" />
        <Ellipse cx="112" cy="74"  rx="9"  ry="7"  fill="#45c974" />
        <Ellipse cx="156" cy="53"  rx="19" ry="23" fill="#2eb865" />
        <Ellipse cx="172" cy="89"  rx="11" ry="8"  fill="#45c974" />
        <Ellipse cx="190" cy="42"  rx="13" ry="17" fill="#1da050" />
        {/* Horizontal fold crease — shadow then highlight */}
        <Line x1="0" y1={MAP_H/2} x2={MAP_W} y2={MAP_H/2} stroke="rgba(0,0,0,0.2)" strokeWidth="1.2" />
        <Line x1="0" y1={MAP_H/2+1.5} x2={MAP_W} y2={MAP_H/2+1.5} stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
        {/* Vertical fold crease — shadow then highlight */}
        <Line x1={MAP_W/2} y1="0" x2={MAP_W/2} y2={MAP_H} stroke="rgba(0,0,0,0.2)" strokeWidth="1.2" />
        <Line x1={MAP_W/2+1.5} y1="0" x2={MAP_W/2+1.5} y2={MAP_H} stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
      </Svg>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedPath — live bezier SVG connector via useAnimatedProps
// ─────────────────────────────────────────────────────────────────────────────
const AnimatedPath = Animated.createAnimatedComponent(Path);

function LiveCurve({
  fromId, toId, positions, stroke, strokeWidth, strokeDasharray,
}: {
  fromId:          string;
  toId:            string;
  positions:       SharedValue<PosMap>;
  stroke:          string;
  strokeWidth:     string;
  strokeDasharray?: string;
}) {
  const aProps = useAnimatedProps(() => {
    'worklet';
    const f  = positions.value[fromId] ?? { x: 0, y: 0 };
    const t  = positions.value[toId]   ?? { x: 0, y: 0 };
    const mx = (f.x + t.x) / 2;
    const my = (f.y + t.y) / 2;
    // Pull control point slightly toward canvas centre for an organic bow
    const cpx = mx + (CX - mx) * 0.12;
    const cpy = my + (CY - my) * 0.12;
    return { d: `M ${f.x} ${f.y} Q ${cpx} ${cpy}, ${t.x} ${t.y}` };
  });
  return (
    <AnimatedPath
      animatedProps={aProps}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      fill="none"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DraggableNode — individual node, drags itself + its children together
// ─────────────────────────────────────────────────────────────────────────────
function DraggableNode({
  nodeId, positions, kidsOf, bg, color, label, size,
  canvasScale, isHighlighted, onBeginDrag, onEndDrag,
}: {
  nodeId:       string;
  positions:    SharedValue<PosMap>;
  kidsOf:       SharedValue<KidsMap>;
  bg:           string;
  color:        string;
  label:        string;
  size:         'lg' | 'md' | 'sm';
  canvasScale:  SharedValue<number>;
  isHighlighted: boolean;
  onBeginDrag:  (ids: string[]) => void;
  onEndDrag:    () => void;
}) {
  const prevTx = useSharedValue(0);
  const prevTy = useSharedValue(0);

  const maxW  = size === 'lg' ? 150 : size === 'md' ? 132 : 118;
  const fSize = size === 'lg' ? 13  : size === 'md' ? 11  : 10;
  const pad   = size === 'lg' ? 12  : 8;

  const drag = Gesture.Pan()
    .minDistance(5)
    .onBegin(() => {
      'worklet';
      prevTx.value = 0;
      prevTy.value = 0;
      // Highlight: nodeId + its direct children (for branches) or all (for center)
      const beginKids = kidsOf.value[nodeId] ?? [];
      const ids: string[] = [nodeId];
      for (let i = 0; i < beginKids.length; i++) { ids.push(beginKids[i]); }
      runOnJS(onBeginDrag)(ids);
    })
    .onUpdate(e => {
      'worklet';
      const s  = canvasScale.value;
      const dx = (e.translationX - prevTx.value) / s;
      const dy = (e.translationY - prevTy.value) / s;
      prevTx.value = e.translationX;
      prevTy.value = e.translationY;

      // Nodes to move: this node + its children
      const dragKids = kidsOf.value[nodeId] ?? [];
      const affected: string[] = [nodeId];
      for (let i = 0; i < dragKids.length; i++) { affected.push(dragKids[i]); }
      const cur  = positions.value;
      const next: PosMap = {};

      // Copy all positions (primitive-safe iteration)
      const keys = Object.keys(cur);
      for (let i = 0; i < keys.length; i++) {
        next[keys[i]] = cur[keys[i]];
      }
      // Apply delta
      for (let i = 0; i < affected.length; i++) {
        const id = affected[i];
        const p  = next[id];
        if (p) next[id] = { x: p.x + dx, y: p.y + dy };
      }
      positions.value = next;
    })
    .onEnd(() => {
      'worklet';
      runOnJS(onEndDrag)();
    });

  const animStyle = useAnimatedStyle(() => {
    'worklet';
    const p = positions.value[nodeId] ?? { x: 0, y: 0 };
    return {
      left: p.x - maxW / 2,
      top:  p.y - 24,
    };
  });

  return (
    <GestureDetector gesture={drag}>
      <Animated.View style={[
        S.node,
        {
          maxWidth:    maxW,
          backgroundColor: bg,
          padding:     pad,
          borderWidth: isHighlighted ? 2.5 : 0,
          borderColor: 'rgba(255,255,255,0.9)',
          shadowColor: '#fff',
          shadowOpacity: isHighlighted ? 0.55 : 0,
          shadowRadius:  isHighlighted ? 10   : 0,
          elevation:     isHighlighted ? 12   : 3,
        },
        animStyle,
      ]}>
        <Text
          style={{ color, fontSize: fSize, fontWeight: fontWeight.bold, textAlign: 'center' }}
          numberOfLines={3}
        >
          {label}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FoldedMapIntro — paper map unfolds in the air, then blows open to reveal map
// ─────────────────────────────────────────────────────────────────────────────
function FoldedMapIntro({ bg, onFinish }: { bg: string; onFinish: () => void }) {
  const scaleX    = useSharedValue(0.36);
  const scaleY    = useSharedValue(0.5);
  const rotZ      = useSharedValue(-4);
  const paperOp   = useSharedValue(0);
  const overlayOp = useSharedValue(1);

  useEffect(() => {
    // Paper fades in (folded), holds through unfold, then vanishes with explosion
    paperOp.value = withSequence(
      withTiming(1, { duration: 130 }),
      withTiming(1, { duration: 580 }),
      withTiming(0, { duration: 180 }),
    );
    // Rotation straightens as horizontal panels unfold
    rotZ.value = withDelay(130, withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }));

    // Horizontal unfold (130→430ms) → hold (430→710ms) → explode (710→890ms)
    scaleX.value = withDelay(130, withSequence(
      withTiming(1,   { duration: 300, easing: Easing.out(Easing.back(1.12)) }),
      withTiming(1,   { duration: 280 }),
      withTiming(5.5, { duration: 180, easing: Easing.in(Easing.quad) }),
    ));

    // Vertical unfold (410→610ms) → hold (610→710ms) → explode (710→890ms)
    scaleY.value = withDelay(410, withSequence(
      withTiming(1,   { duration: 200, easing: Easing.out(Easing.back(1.08)) }),
      withTiming(1,   { duration: 100 }),
      withTiming(5.5, { duration: 180, easing: Easing.in(Easing.quad) }),
    ));

    // Overlay fades out after explosion → mind map is already rendered beneath
    overlayOp.value = withDelay(870, withTiming(0, { duration: 130 }, (done) => {
      if (done) runOnJS(onFinish)();
    }));
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOp.value }));
  const paperStyle   = useAnimatedStyle(() => ({
    opacity:   paperOp.value,
    transform: [
      { scaleX:  scaleX.value       },
      { scaleY:  scaleY.value       },
      { rotateZ: `${rotZ.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, overlayStyle]}
    >
      <Animated.View style={paperStyle}>
        <PaperMapSvg />
      </Animated.View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MindMapModal
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  visible:  boolean;
  onClose:  () => void;
  mindmap?: MindMap;
  title?:   string;
}

export function MindMapModal({ visible, onClose, mindmap, title }: Props) {
  const { isDark, T } = useTheme();
  const insets        = useSafeAreaInsets();

  // ── Pre-compute layout (stable while mindmap doesn't change) ─────────────
  const initialPos = useMemo(() => mindmap ? buildLayout(mindmap) : {} as PosMap, [mindmap]);
  const kidsMap    = useMemo(() => mindmap ? buildKidsMap(mindmap) : {} as KidsMap, [mindmap]);

  // ── Shared values ─────────────────────────────────────────────────────────
  const positions = useSharedValue<PosMap>(initialPos);
  const kidsOf    = useSharedValue<KidsMap>(kidsMap);

  const scale  = useSharedValue(INITIAL_SCALE);
  const scaleS = useSharedValue(INITIAL_SCALE);
  const tx     = useSharedValue(INITIAL_TX);
  const ty     = useSharedValue(INITIAL_TY);
  const txS    = useSharedValue(INITIAL_TX);
  const tyS    = useSharedValue(INITIAL_TY);

  // Sync shared values when mindmap changes
  useEffect(() => { positions.value = { ...initialPos }; }, [initialPos]);
  useEffect(() => { kidsOf.value    = { ...kidsMap    }; }, [kidsMap]);

  // ── Opening animation + zoom display state ───────────────────────────────
  const [showIntro, setShowIntro] = useState(true);
  const [zoomPct,   setZoomPct]   = useState(Math.round(INITIAL_SCALE * 100));

  // Reset canvas+positions when modal opens; reset intro flag on close so it
  // plays again next time the modal is opened.
  useEffect(() => {
    if (!visible) { setShowIntro(true); return; }
    positions.value = { ...initialPos };
    scale.value = INITIAL_SCALE; scaleS.value = INITIAL_SCALE;
    tx.value    = INITIAL_TX;   txS.value    = INITIAL_TX;
    ty.value    = INITIAL_TY;   tyS.value    = INITIAL_TY;
    setHighlighted(new Set());
  }, [visible]);

  // ── Highlighted nodes (glow effect while dragging) ────────────────────────
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const handleBeginDrag = useCallback((ids: string[]) => setHighlighted(new Set(ids)), []);
  const handleEndDrag   = useCallback(() => setHighlighted(new Set()), []);

  // ── Canvas gestures ───────────────────────────────────────────────────────
  const pan = Gesture.Pan()
    .onUpdate(e => {
      'worklet';
      const s = scale.value;
      tx.value = Math.max(
        INITIAL_TX - PAN_LIMIT_X * s,
        Math.min(INITIAL_TX + PAN_LIMIT_X * s, txS.value + e.translationX),
      );
      ty.value = Math.max(
        INITIAL_TY - PAN_LIMIT_Y * s,
        Math.min(INITIAL_TY + PAN_LIMIT_Y * s, tyS.value + e.translationY),
      );
    })
    .onEnd(() => {
      'worklet';
      txS.value = tx.value;
      tyS.value = ty.value;
    });

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      'worklet';
      scale.value = Math.max(0.12, Math.min(4.5, scaleS.value * e.scale));
    })
    .onEnd(() => {
      'worklet';
      scaleS.value = scale.value;
      runOnJS(setZoomPct)(Math.round(scale.value * 100));
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  const canvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  // ── Zoom controls ─────────────────────────────────────────────────────────
  const zoomIn  = () => { const n = Math.min(4.5, scale.value*1.4);  scale.value = withSpring(n, SPRING); scaleS.value = n; setZoomPct(Math.round(n * 100)); };
  const zoomOut = () => { const n = Math.max(0.12, scale.value/1.4); scale.value = withSpring(n, SPRING); scaleS.value = n; setZoomPct(Math.round(n * 100)); };
  const reset   = () => {
    positions.value = { ...initialPos };
    scale.value  = withSpring(INITIAL_SCALE, SPRING);
    tx.value     = withSpring(INITIAL_TX,    SPRING);
    ty.value     = withSpring(INITIAL_TY,    SPRING);
    scaleS.value = INITIAL_SCALE; txS.value = INITIAL_TX; tyS.value = INITIAL_TY;
    setHighlighted(new Set());
    setZoomPct(Math.round(INITIAL_SCALE * 100));
  };

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!mindmap) return null;

  const branches = mindmap.branches ?? [];
  const bg       = isDark ? '#0a0920' : '#eef2ff';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[S.root, { backgroundColor: bg }]}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <View style={[S.header, {
          backgroundColor:   isDark ? '#111029' : '#fff',
          borderBottomColor: T.border,
          paddingTop:        insets.top + spacing[2],
        }]}>
          <TouchableOpacity onPress={onClose} style={S.iconBtn} hitSlop={8}>
            <ArrowLeft size={20} color={T.primary} />
          </TouchableOpacity>

          <Text style={[S.headerTitle, { color: T.text }]} numberOfLines={1}>
            {title ?? 'Mind Map'}
          </Text>

          <TouchableOpacity
            onPress={reset}
            style={[S.iconBtn, { backgroundColor: T.elevated, borderWidth: 1, borderColor: T.border }]}
            hitSlop={8}
          >
            <RotateCcw size={15} color={T.muted} />
          </TouchableOpacity>
        </View>

        {/* ── Hint ────────────────────────────────────────────────── */}
        <View
          style={[S.hintBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}
          pointerEvents="none"
        >
          <Text style={[S.hintText, { color: T.muted }]}>
            Pinch to zoom · Drag canvas · Hold node to move it with children
          </Text>
        </View>

        {/* ── Canvas ──────────────────────────────────────────────── */}
        <GestureDetector gesture={composed}>
          <View style={S.canvasFill}>
          <Animated.View style={[S.canvas, canvasStyle]}>

            {/* Dot-grid + live bezier curves */}
            <Svg style={StyleSheet.absoluteFillObject} width={CW} height={CH}>
              {/* Subtle dot grid */}
              <Defs>
                <Pattern id="dotgrid" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
                  <Circle cx="25" cy="25" r="1.2"
                    fill={isDark ? 'rgba(129,140,248,0.10)' : 'rgba(99,102,241,0.08)'} />
                </Pattern>
              </Defs>
              <Rect width={CW} height={CH} fill="url(#dotgrid)" />

              {/* Bezier connections */}
              {branches.map((branch, bi) => {
                const col = COLORS[bi % COLORS.length];
                return (
                  <React.Fragment key={bi}>
                    <LiveCurve
                      fromId="center" toId={`b${bi}`}
                      positions={positions}
                      stroke={col.line} strokeWidth="2.5" strokeDasharray="7 4"
                    />
                    {(branch.children ?? []).map((_: unknown, ci: number) => (
                      <LiveCurve
                        key={ci}
                        fromId={`b${bi}`} toId={`c${bi}_${ci}`}
                        positions={positions}
                        stroke={col.line} strokeWidth="1.8"
                      />
                    ))}
                  </React.Fragment>
                );
              })}
            </Svg>

            {/* Center node */}
            <DraggableNode
              nodeId="center"
              positions={positions} kidsOf={kidsOf}
              bg="#6366f1" color="#fff" label={mindmap.title} size="lg"
              canvasScale={scale}
              isHighlighted={highlighted.has('center')}
              onBeginDrag={handleBeginDrag} onEndDrag={handleEndDrag}
            />

            {/* Branch + child nodes */}
            {branches.map((branch, bi) => {
              const col = COLORS[bi % COLORS.length];
              return (
                <React.Fragment key={bi}>
                  <DraggableNode
                    nodeId={`b${bi}`}
                    positions={positions} kidsOf={kidsOf}
                    bg={col.bg} color="#fff" label={branch.label} size="md"
                    canvasScale={scale}
                    isHighlighted={highlighted.has(`b${bi}`)}
                    onBeginDrag={handleBeginDrag} onEndDrag={handleEndDrag}
                  />
                  {(branch.children ?? []).map((child: string, ci: number) => {
                    const id = `c${bi}_${ci}`;
                    return (
                      <DraggableNode
                        key={ci} nodeId={id}
                        positions={positions} kidsOf={kidsOf}
                        bg={col.child} color={col.childFg} label={child} size="sm"
                        canvasScale={scale}
                        isHighlighted={highlighted.has(id)}
                        onBeginDrag={handleBeginDrag} onEndDrag={handleEndDrag}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}

          </Animated.View>
          </View>
        </GestureDetector>

        {/* ── Zoom controls ──────────────────────────────────────── */}
        <View style={[S.controls, {
          backgroundColor: isDark ? 'rgba(17,16,41,0.92)' : 'rgba(255,255,255,0.92)',
          borderColor:     T.border,
          bottom:          insets.bottom + spacing[4],
        }]}>
          <TouchableOpacity onPress={zoomIn}  style={S.ctrlBtn} hitSlop={8}>
            <ZoomIn  size={18} color={T.text} />
          </TouchableOpacity>
          <View style={[S.ctrlDiv, { backgroundColor: T.border }]} />
          <Text style={[S.zoomText, { color: T.muted }]}>{zoomPct}%</Text>
          <View style={[S.ctrlDiv, { backgroundColor: T.border }]} />
          <TouchableOpacity onPress={zoomOut} style={S.ctrlBtn} hitSlop={8}>
            <ZoomOut size={18} color={T.text} />
          </TouchableOpacity>
        </View>

        {/* ── Opening animation overlay ─────────────────────────── */}
        {showIntro && (
          <FoldedMapIntro
            bg={bg}
            onFinish={() => setShowIntro(false)}
          />
        )}

      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal:  spacing[4],
    paddingBottom:      spacing[3],
    borderBottomWidth:  1,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.semibold,
    textAlign: 'center', marginHorizontal: spacing[2],
  },

  hintBar:  { paddingVertical: spacing[1], alignItems: 'center' },
  hintText: { fontSize: 10 },

  controls: {
    position:     'absolute',
    right:         spacing[4],
    flexDirection: 'row',
    alignItems:   'center',
    borderRadius:  radius.xl,
    borderWidth:   1,
    overflow:     'hidden',
    elevation:     8,
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius:  8,
  },
  ctrlBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  ctrlDiv: { width: 1, height: 24 },

  canvasFill: { flex: 1, overflow: 'hidden' },
  canvas:     { width: CW, height: CH },

  // ── Intro + controls ───────────────────────────────────────────────────────
  paperShadow: {
    borderRadius:  5,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius:  18,
    elevation:     18,
  },
  zoomText: {
    paddingHorizontal: spacing[2],
    fontSize:          10,
    fontWeight:        fontWeight.bold,
    letterSpacing:     0.3,
  },

  node: {
    position:       'absolute',
    borderRadius:    radius.lg,
    alignItems:     'center',
    justifyContent: 'center',
    minWidth:        64,
  },
});
