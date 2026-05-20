export default function diagonal(s, slide, idx, ctx) {
  const { pptx, W, H, isRTL, al, bl, nt, bh, renderBody } = ctx;
  const c = { bg: 'FFFFFF', diag: '1B2B4B', accent: 'C8A951', text: '1E293B' };
  s.background = { color: c.bg };
  const rot = isRTL ? -15 : 15;
  s.addShape(pptx.ShapeType.rect, { x: isRTL ? W * 0.4 : -2.0, y: -1.5, w: W * 0.55, h: 3.5, rotate: rot, fill: { color: c.diag }, line: { type: 'none' } });
  s.addShape(pptx.ShapeType.rect, { x: isRTL ? W * 0.58 : -0.4, y: -1.1, w: W * 0.4, h: 3.2, rotate: rot, fill: { color: c.accent, transparency: 35 }, line: { type: 'none' } });

  const cx = 0.5, cw = W - 0.8;

  if (slide.type === 'title') {
    const tX = 0.5, tW = W - 1.0;
    s.addText(slide.title, { x: tX, y: 1.8, w: tW, h: 2.2, fontSize: 34, bold: true, color: 'FFFFFF', fontFace: 'Calibri', align: al, valign: 'middle' });
    s.addShape(pptx.ShapeType.rect, { x: tX, y: 4.1, w: 1.5, h: 0.06, fill: { color: c.accent }, line: { type: 'none' } });
    if (slide.subtitle) s.addText(slide.subtitle, { x: tX, y: 4.25, w: tW, h: 0.7, fontSize: 15, color: c.accent, fontFace: 'Calibri Light', italic: true, align: al });
  } else {
    s.addShape(pptx.ShapeType.rect, { x: cx, y: 0.92, w: cw - 0.3, h: 0.05, fill: { color: c.accent }, line: { type: 'none' } });
    s.addText(slide.title, { x: cx, y: 0.1, w: cw - 0.3, h: 0.76, fontSize: 20, bold: true, color: c.text, fontFace: 'Calibri', align: al });
    const bodyH = bh(slide.notes);
    bl(s, slide.bullets, slide.type === 'summary', cx, 1.1, cw - 0.3, bodyH, c.text);
    renderBody(s, slide, cx, 1.1, cw - 0.3, bodyH, c.accent, c.text);
    nt(s, slide.notes, 0, W, c.accent);
  }
  s.addShape(pptx.ShapeType.rect, { x: 0, y: H - 0.08, w: W, h: 0.08, fill: { color: c.accent }, line: { type: 'none' } });
  s.addText(String(idx + 1), { x: W - 0.65, y: H - 0.38, w: 0.5, h: 0.28, fontSize: 8, color: c.accent + '80', align: 'right', fontFace: 'Calibri Light' });
}
