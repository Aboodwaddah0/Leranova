export default function timelineJourney(s, slide, idx, ctx) {
  const { pptx, W, H, total, isRTL, al, bl, nt, bh, renderBody } = ctx;
  const c = { bg: 'F0F9FF', accent: '0284C7', text: '1E293B', inactive: 'CBD5E1' };
  s.background = { color: c.bg };
  const TLY = H - 1.1;
  s.addShape(pptx.ShapeType.rect, { x: 0, y: TLY, w: W, h: 1.1, fill: { color: 'FFFFFF' }, line: { type: 'none' } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: TLY, w: W, h: 0.04, fill: { color: c.accent + '40' }, line: { type: 'none' } });
  const sw2 = W / total;
  for (let i = 0; i < total; i++) {
    const dX = sw2 * i + sw2 / 2, active = i === idx, r2 = active ? 0.22 : 0.14;
    s.addShape(pptx.ShapeType.ellipse, { x: dX - r2, y: TLY + 0.28 - r2, w: r2 * 2, h: r2 * 2, fill: { color: active ? c.accent : c.inactive }, line: { type: 'none' } });
    if (active) s.addText(String(i + 1), { x: dX - 0.2, y: TLY + 0.08, w: 0.4, h: 0.38, fontSize: 9, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: 'Calibri' });
  }

  const cx = 0.5, cw = W - 0.8;

  if (slide.type === 'title') {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: TLY, fill: { color: c.accent + '10' }, line: { type: 'none' } });
    s.addText(slide.title, { x: cx, y: 1.5, w: cw - 0.3, h: 2.2, fontSize: 36, bold: true, color: c.accent, fontFace: 'Calibri', align: al, valign: 'middle' });
    s.addShape(pptx.ShapeType.rect, { x: cx, y: 3.8, w: 1.8, h: 0.07, fill: { color: c.accent }, line: { type: 'none' } });
    if (slide.subtitle) s.addText(slide.subtitle, { x: cx, y: 4.0, w: cw - 0.3, h: 0.65, fontSize: 15, color: c.text, fontFace: 'Calibri Light', italic: true, align: al });
  } else {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.9, fill: { color: c.accent }, line: { type: 'none' } });
    s.addText(slide.title, { x: 0.5, y: 0.1, w: W - 0.8, h: 0.72, fontSize: 20, bold: true, color: 'FFFFFF', fontFace: 'Calibri', align: al });
    const avH = TLY - 0.9 - (slide.notes ? 0.55 : 0.1);
    bl(s, slide.bullets, slide.type === 'summary', cx, 1.0, cw - 0.3, avH, c.text);
    renderBody(s, slide, cx, 1.0, cw - 0.3, avH, c.accent, c.text);
    if (slide.notes) nt(s, slide.notes, 0, W, c.accent);
  }
}
