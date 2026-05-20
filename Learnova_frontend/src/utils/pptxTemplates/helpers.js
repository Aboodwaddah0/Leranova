/**
 * Factory that builds slide-rendering helpers bound to a specific pptx instance and layout.
 * @param {{ pptx: object, W: number, H: number, isRTL: boolean, al: string }} ctx
 */
export const makeHelpers = ({ pptx, W, H, isRTL, al }) => {
  const bl = (s, bullets, isSummary, x, y, w, h, color, fs = 15) => {
    if (!bullets?.length) return;
    s.addText(
      bullets.map(b => ({
        text: (isSummary ? '✓  ' : '▸  ') + b,
        options: { fontSize: fs, color, fontFace: 'Calibri Light', bullet: false, breakLine: false },
      })),
      { x, y, w, h, valign: 'top', align: al, paraSpaceAfter: 9 }
    );
  };

  const nt = (s, notes, nx, nw, accent) => {
    if (!notes) return;
    s.addShape(pptx.ShapeType.rect, { x: nx, y: H - 0.55, w: nw, h: 0.42, fill: { color: accent + '30' }, line: { type: 'none' } });
    s.addText('📝  ' + notes, { x: nx + 0.3, y: H - 0.51, w: nw - 0.6, h: 0.34, fontSize: 9, color: accent, fontFace: 'Calibri Light', italic: true, align: al });
  };

  const bh = (notes) => notes ? H - 0.55 - 1.15 : H - 1.15;

  const renderBody = (s, slide, cx, cy, cw, bodyH, accent, tc) => {
    switch (slide.type) {
      case 'comparison': {
        const mid = cx + cw / 2, cW = cw / 2 - 0.4;
        const lx = isRTL ? mid + 0.2 : cx + 0.15, rx = isRTL ? cx + 0.15 : mid + 0.2;
        s.addShape(pptx.ShapeType.rect, { x: lx, y: cy, w: cW, h: 0.4, fill: { color: accent }, line: { type: 'none' } });
        s.addText(slide.left?.label || '', { x: lx, y: cy, w: cW, h: 0.4, fontSize: 13, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: 'Calibri' });
        s.addShape(pptx.ShapeType.rect, { x: rx, y: cy, w: cW, h: 0.4, fill: { color: accent + '50' }, line: { type: 'none' } });
        s.addText(slide.right?.label || '', { x: rx, y: cy, w: cW, h: 0.4, fontSize: 13, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: 'Calibri' });
        s.addShape(pptx.ShapeType.rect, { x: mid - 0.012, y: cy, w: 0.024, h: bodyH, fill: { color: accent, transparency: 50 }, line: { type: 'none' } });
        const lb = (slide.left?.points || []).map(p => ({ text: '▸  ' + p, options: { fontSize: 13, color: tc, fontFace: 'Calibri Light', bullet: false } }));
        const rb = (slide.right?.points || []).map(p => ({ text: '▸  ' + p, options: { fontSize: 13, color: tc, fontFace: 'Calibri Light', bullet: false } }));
        if (lb.length) s.addText(lb, { x: lx + 0.1, y: cy + 0.5, w: cW - 0.2, h: bodyH - 0.55, valign: 'top', align: al, paraSpaceAfter: 8 });
        if (rb.length) s.addText(rb, { x: rx + 0.1, y: cy + 0.5, w: cW - 0.2, h: bodyH - 0.55, valign: 'top', align: al, paraSpaceAfter: 8 });
        break;
      }
      case 'timeline': {
        const steps = slide.steps || []; if (!steps.length) break;
        const lineY = cy + bodyH * 0.42, sw2 = cw / steps.length;
        s.addShape(pptx.ShapeType.rect, { x: cx + 0.3, y: lineY - 0.012, w: cw - 0.6, h: 0.024, fill: { color: accent }, line: { type: 'none' } });
        steps.forEach((st, si) => {
          const dX = cx + 0.3 + sw2 * si + sw2 / 2;
          s.addShape(pptx.ShapeType.ellipse, { x: dX - 0.17, y: lineY - 0.17, w: 0.34, h: 0.34, fill: { color: accent }, line: { type: 'none' } });
          s.addText(st.year || '', { x: dX - 0.6, y: lineY - 0.62, w: 1.2, h: 0.35, fontSize: 10, bold: true, color: accent, align: 'center', fontFace: 'Calibri' });
          s.addText(st.label || '', { x: dX - sw2 / 2 + 0.05, y: lineY + 0.26, w: sw2 - 0.1, h: 0.4, fontSize: 11, bold: true, color: tc, align: 'center', fontFace: 'Calibri' });
          if (st.description) s.addText(st.description, { x: dX - sw2 / 2 + 0.05, y: lineY + 0.7, w: sw2 - 0.1, h: 0.7, fontSize: 9, color: tc, align: 'center', fontFace: 'Calibri Light' });
        });
        break;
      }
      case 'process': {
        const steps = slide.steps || []; if (!steps.length) break;
        const n = steps.length, bW = Math.min(2.2, (cw - 0.4 - (n - 1) * 0.45) / n);
        const tW2 = n * bW + (n - 1) * 0.45, sX = cx + (cw - tW2) / 2, bY = cy + (bodyH - 1.55) / 2;
        steps.forEach((st, si) => {
          const bx = sX + si * (bW + 0.45);
          s.addShape(pptx.ShapeType.roundRect, { x: bx, y: bY, w: bW, h: 1.55, fill: { color: si === 0 ? accent : accent + '28' }, line: { color: accent, pt: 1.5 }, rectRadius: 0.1 });
          s.addShape(pptx.ShapeType.ellipse, { x: bx + bW / 2 - 0.21, y: bY - 0.24, w: 0.42, h: 0.42, fill: { color: accent }, line: { type: 'none' } });
          s.addText(String(si + 1), { x: bx + bW / 2 - 0.21, y: bY - 0.24, w: 0.42, h: 0.42, fontSize: 11, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: 'Calibri' });
          s.addText(st, { x: bx + 0.1, y: bY + 0.12, w: bW - 0.2, h: 1.25, fontSize: 12, bold: si === 0, color: si === 0 ? 'FFFFFF' : tc, align: 'center', valign: 'middle', fontFace: 'Calibri', wrap: true });
          if (si < n - 1) s.addText('→', { x: bx + bW + 0.05, y: bY + 0.5, w: 0.35, h: 0.5, fontSize: 20, bold: true, color: accent, align: 'center', fontFace: 'Calibri' });
        });
        break;
      }
      case 'hierarchy': {
        const root = slide.root || '', ch2 = slide.children || [], n = ch2.length;
        const rW = 2.5, rH = 0.55, rX = cx + cw / 2 - rW / 2, rY = cy + 0.1;
        s.addShape(pptx.ShapeType.roundRect, { x: rX, y: rY, w: rW, h: rH, fill: { color: accent }, line: { type: 'none' }, rectRadius: 0.07 });
        s.addText(root, { x: rX, y: rY, w: rW, h: rH, fontSize: 14, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: 'Calibri' });
        if (n > 0) {
          const cY2 = rY + rH + 0.38, cW2 = Math.min(2.3, (cw - 0.4) / n - 0.22), tCW = n * cW2 + (n - 1) * 0.22, csX = cx + (cw - tCW) / 2;
          s.addShape(pptx.ShapeType.rect, { x: cx + cw / 2 - 0.011, y: rY + rH, w: 0.022, h: 0.38, fill: { color: accent, transparency: 40 }, line: { type: 'none' } });
          if (n > 1) s.addShape(pptx.ShapeType.rect, { x: csX + cW2 / 2, y: cY2 - 0.011, w: tCW - cW2, h: 0.022, fill: { color: accent, transparency: 40 }, line: { type: 'none' } });
          ch2.forEach((child, ci) => {
            const chX = csX + ci * (cW2 + 0.22);
            s.addShape(pptx.ShapeType.rect, { x: chX + cW2 / 2 - 0.011, y: cY2 - 0.011, w: 0.022, h: 0.3, fill: { color: accent, transparency: 40 }, line: { type: 'none' } });
            s.addShape(pptx.ShapeType.roundRect, { x: chX, y: cY2 + 0.3, w: cW2, h: 0.5, fill: { color: accent, transparency: 35 }, line: { color: accent, pt: 1 }, rectRadius: 0.06 });
            s.addText(child.label || '', { x: chX, y: cY2 + 0.3, w: cW2, h: 0.5, fontSize: 11, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: 'Calibri' });
            const gcs = child.children || [];
            if (gcs.length) {
              const gcY = cY2 + 0.88, gcW = cW2 / Math.min(gcs.length, 3) - 0.06;
              gcs.slice(0, 3).forEach((gc, gi) => {
                const gcX = chX + gi * (gcW + 0.06);
                s.addShape(pptx.ShapeType.rect, { x: gcX, y: gcY, w: gcW, h: 0.36, fill: { color: accent, transparency: 68 }, line: { color: accent, pt: 0.5 } });
                s.addText(gc, { x: gcX, y: gcY, w: gcW, h: 0.36, fontSize: 9, color: tc, align: 'center', valign: 'middle', fontFace: 'Calibri Light' });
              });
            }
          });
        }
        break;
      }
      case 'chart': {
        if ((slide.labels || []).length && (slide.values || []).length) {
          const ctMap = { pie: pptx.ChartType.pie, line: pptx.ChartType.line, bar: pptx.ChartType.bar };
          s.addChart(
            ctMap[slide.chartType] ?? pptx.ChartType.bar,
            [{ name: slide.title || 'Data', labels: slide.labels, values: slide.values.map(Number) }],
            { x: cx + 0.4, y: cy, w: cw - 0.8, h: bodyH, showTitle: false, showValue: true, barDir: 'col', showLegend: false, chartColors: [accent], dataLabelColor: accent, valAxisMaxVal: Math.max(...slide.values.map(Number)) * 1.25 }
          );
        }
        break;
      }
      default: break;
    }
  };

  return { bl, nt, bh, renderBody };
};
