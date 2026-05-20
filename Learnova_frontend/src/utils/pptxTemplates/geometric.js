export default function geometric(s, slide, idx, ctx) {
  const { pptx, W, H, isRTL, al, bl, nt, bh, renderBody } = ctx;
  const c = { bg: 'FAFAFA', accent: '7C3AED', text: '1E293B', sub: '6B7280' };
  s.background = { color: c.bg };
  s.addShape(pptx.ShapeType.ellipse, { x: W - 4.8, y: -2.2, w: 5.8, h: 5.8, fill: { color: c.accent, transparency: 83 }, line: { type: 'none' } });
  s.addShape(pptx.ShapeType.ellipse, { x: -1.8, y: H - 3.2, w: 4.2, h: 4.2, fill: { color: c.accent, transparency: 88 }, line: { type: 'none' } });
  s.addShape(pptx.ShapeType.ellipse, { x: W * 0.38, y: H - 1.4, w: 1.8, h: 1.8, fill: { color: c.accent, transparency: 78 }, line: { type: 'none' } });

  const cx = 0.5, cw = W - 0.8;

  if (slide.type === 'title') {
    const tX = 0.6, tW = W - 1.2;
    s.addText(slide.title, { x: tX, y: 2.0, w: tW, h: 2.5, fontSize: 38, bold: true, color: c.text, fontFace: 'Calibri', align: al, valign: 'middle' });
    s.addShape(pptx.ShapeType.rect, { x: tX, y: 4.6, w: 2.0, h: 0.08, fill: { color: c.accent }, line: { type: 'none' } });
    if (slide.subtitle) s.addText(slide.subtitle, { x: tX, y: 4.75, w: tW, h: 0.65, fontSize: 15, color: c.sub, fontFace: 'Calibri Light', italic: true, align: al });
  } else {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.88, fill: { color: c.accent + '15' }, line: { type: 'none' } });
    s.addShape(pptx.ShapeType.rect, { x: isRTL ? W - 0.22 : 0, y: 0, w: 0.22, h: 0.88, fill: { color: c.accent }, line: { type: 'none' } });
    s.addText(slide.title, { x: 0.38, y: 0.1, w: cw - 0.2, h: 0.7, fontSize: 20, bold: true, color: c.accent, fontFace: 'Calibri', align: al });
    const bodyH = bh(slide.notes);
    bl(s, slide.bullets, slide.type === 'summary', cx, 1.0, cw - 0.3, bodyH, c.text);
    renderBody(s, slide, cx, 1.0, cw - 0.3, bodyH, c.accent, c.text);
    nt(s, slide.notes, 0, W, c.accent);
  }
  s.addText(String(idx + 1), { x: W - 0.65, y: H - 0.38, w: 0.5, h: 0.28, fontSize: 8, color: c.accent + '80', align: 'right', fontFace: 'Calibri Light' });
}
