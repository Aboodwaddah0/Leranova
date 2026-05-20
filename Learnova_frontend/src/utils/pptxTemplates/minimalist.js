export default function minimalist(s, slide, idx, ctx) {
  const { pptx, W, H, isRTL, al, bl, nt, bh, renderBody } = ctx;
  const c = { bg: 'FFFFFF', accent: '2563EB', text: '1E293B', sub: '64748B' };
  s.background = { color: c.bg };
  s.addShape(pptx.ShapeType.rect, { x: isRTL ? W - 0.18 : 0, y: 0, w: 0.18, h: H, fill: { color: c.accent }, line: { type: 'none' } });

  const cx = isRTL ? 0.2 : 0.35, cw = W - 0.8;

  if (slide.type === 'title') {
    const tX = isRTL ? 0.5 : 0.5, tW = W - 1.0;
    s.addText(slide.title, { x: tX, y: 2.0, w: tW, h: 2.2, fontSize: 36, bold: true, color: c.text, fontFace: 'Calibri', align: al, valign: 'middle' });
    s.addShape(pptx.ShapeType.rect, { x: tX, y: 4.3, w: 1.5, h: 0.05, fill: { color: c.accent }, line: { type: 'none' } });
    if (slide.subtitle) s.addText(slide.subtitle, { x: tX, y: 4.45, w: tW, h: 0.7, fontSize: 16, color: c.sub, fontFace: 'Calibri Light', italic: true, align: al });
  } else {
    s.addText(slide.title, { x: cx + 0.45, y: 0.18, w: cw - 0.45, h: 0.72, fontSize: 20, bold: true, color: c.accent, fontFace: 'Calibri', align: al });
    s.addShape(pptx.ShapeType.rect, { x: cx + 0.45, y: 0.94, w: cw - 0.9, h: 0.04, fill: { color: c.accent + '50' }, line: { type: 'none' } });
    const bodyH = bh(slide.notes);
    bl(s, slide.bullets, slide.type === 'summary', cx + 0.45, 1.1, cw - 0.9, bodyH, c.text);
    renderBody(s, slide, cx + 0.45, 1.1, cw - 0.9, bodyH, c.accent, c.text);
    nt(s, slide.notes, cx, cw + cx, c.accent);
  }
  s.addText(String(idx + 1), { x: W - 0.65, y: H - 0.38, w: 0.5, h: 0.28, fontSize: 8, color: c.accent + '80', align: 'right', fontFace: 'Calibri Light' });
}
