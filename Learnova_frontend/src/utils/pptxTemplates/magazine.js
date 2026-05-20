export default function magazine(s, slide, idx, ctx) {
  const { pptx, W, H, isRTL, al, bl, nt, bh, renderBody } = ctx;
  const c = { bg: 'FFFFFF', band: 'E11D48', accent: 'E11D48', text: '1E293B' };
  s.background = { color: c.bg };

  if (slide.type === 'title') {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 2.9, fill: { color: c.band }, line: { type: 'none' } });
    s.addText(slide.title, { x: 0.6, y: 0.3, w: W - 1.2, h: 2.1, fontSize: 42, bold: true, color: 'FFFFFF', fontFace: 'Calibri', align: al, valign: 'middle' });
    if (slide.subtitle) s.addText(slide.subtitle, { x: 0.6, y: 3.1, w: W - 1.2, h: 0.8, fontSize: 17, color: c.text, fontFace: 'Calibri Light', italic: true, align: al });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: H - 0.1, w: W, h: 0.1, fill: { color: c.band }, line: { type: 'none' } });
  } else {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.88, fill: { color: c.band }, line: { type: 'none' } });
    s.addText(slide.title, { x: 0.5, y: 0.09, w: W - 1.0, h: 0.7, fontSize: 20, bold: true, color: 'FFFFFF', fontFace: 'Calibri', align: al });
    s.addText(String(idx + 1).padStart(2, '0'), { x: isRTL ? 0.2 : W - 3.5, y: H - 4.2, w: 3.2, h: 3.8, fontSize: 120, bold: true, color: c.accent + '10', fontFace: 'Calibri', align: isRTL ? 'left' : 'right' });
    const cx = 0.5, cw = W - 0.8;
    const bodyH = bh(slide.notes);
    bl(s, slide.bullets, slide.type === 'summary', cx, 1.0, cw - 0.2, bodyH, c.text);
    renderBody(s, slide, cx, 1.0, cw - 0.2, bodyH, c.accent, c.text);
    nt(s, slide.notes, 0, W, c.accent);
    s.addShape(pptx.ShapeType.rect, { x: 0, y: H - 0.1, w: W, h: 0.1, fill: { color: c.band }, line: { type: 'none' } });
  }
}
