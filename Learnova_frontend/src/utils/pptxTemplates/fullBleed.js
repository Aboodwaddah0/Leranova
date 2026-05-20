export default function fullBleed(s, slide, idx, ctx) {
  const { pptx, W, H, isRTL, al, bl, nt, bh, renderBody } = ctx;
  const c = { bg: '1A1A2E', accent: 'F97316', text: 'FFFFFF' };
  s.background = { color: c.bg };

  if (slide.type === 'title') {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: H - 3.6, w: W, h: 3.6, fill: { color: '000000', transparency: 35 }, line: { type: 'none' } });
    s.addText(slide.title, { x: 0.6, y: H - 3.4, w: W - 1.2, h: 2.0, fontSize: 44, bold: true, color: 'FFFFFF', fontFace: 'Calibri', align: al, valign: 'bottom' });
    s.addShape(pptx.ShapeType.rect, { x: 0.6, y: H - 1.2, w: 2.0, h: 0.07, fill: { color: c.accent }, line: { type: 'none' } });
    if (slide.subtitle) s.addText(slide.subtitle, { x: 0.6, y: H - 1.05, w: W - 1.2, h: 0.6, fontSize: 15, color: c.accent, fontFace: 'Calibri Light', italic: true, align: al });
  } else {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.1, fill: { color: '000000', transparency: 40 }, line: { type: 'none' } });
    s.addText(slide.title, { x: 0.5, y: 0.17, w: W - 1.0, h: 0.78, fontSize: 20, bold: true, color: 'FFFFFF', fontFace: 'Calibri', align: al });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.15, w: W, h: H - 1.15, fill: { color: '000000', transparency: 48 }, line: { type: 'none' } });
    const bodyH = bh(slide.notes);
    bl(s, slide.bullets, slide.type === 'summary', 0.55, 1.32, W - 0.9, bodyH, 'FFFFFF');
    renderBody(s, slide, 0.55, 1.32, W - 0.9, bodyH, c.accent, 'FFFFFF');
    if (slide.notes) {
      s.addShape(pptx.ShapeType.rect, { x: 0, y: H - 0.55, w: W, h: 0.42, fill: { color: c.accent + '55' }, line: { type: 'none' } });
      s.addText('📝  ' + slide.notes, { x: 0.3, y: H - 0.51, w: W - 0.6, h: 0.34, fontSize: 9, color: 'FFFFFF', fontFace: 'Calibri Light', italic: true, align: al });
    }
  }
  s.addText(String(idx + 1), { x: W - 0.65, y: H - 0.38, w: 0.5, h: 0.28, fontSize: 8, color: c.accent + '90', align: 'right', fontFace: 'Calibri Light' });
}
