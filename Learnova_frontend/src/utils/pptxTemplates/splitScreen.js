export default function splitScreen(s, slide, idx, ctx) {
  const { pptx, W, H, isRTL, al, bl, nt, bh, renderBody } = ctx;
  const c = { bg: 'FFFFFF', panel: '1B3A5C', accent: 'F97316', text: '1E293B' };
  s.background = { color: c.bg };

  const cx = 0.5, cw = W - 0.8;

  if (slide.type === 'title') {
    s.addText(slide.title, { x: cx, y: 1.8, w: cw, h: 2.5, fontSize: 34, bold: true, color: c.panel, fontFace: 'Calibri', align: al, valign: 'middle' });
    s.addShape(pptx.ShapeType.rect, { x: cx, y: 4.4, w: 1.8, h: 0.06, fill: { color: c.accent }, line: { type: 'none' } });
    if (slide.subtitle) s.addText(slide.subtitle, { x: cx, y: 4.55, w: cw, h: 0.7, fontSize: 15, color: c.panel, fontFace: 'Calibri Light', italic: true, align: al });
  } else {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.06, fill: { color: c.accent }, line: { type: 'none' } });
    s.addText(slide.title, { x: cx, y: 0.15, w: cw, h: 0.72, fontSize: 20, bold: true, color: c.panel, fontFace: 'Calibri', align: al });
    const bodyH = bh(slide.notes);
    bl(s, slide.bullets, slide.type === 'summary', cx, 1.0, cw, bodyH, c.text);
    renderBody(s, slide, cx, 1.0, cw, bodyH, c.accent, c.text);
    nt(s, slide.notes, 0, W, c.accent);
  }
  s.addText(String(idx + 1), { x: cx + cw + 0.15, y: H - 0.38, w: 0.4, h: 0.28, fontSize: 8, color: c.accent + '80', align: 'right', fontFace: 'Calibri Light' });
}
