export default function darkExec(s, slide, idx, ctx) {
  const { pptx, W, H, isRTL, al, bl, nt, bh, renderBody } = ctx;
  const c = { bg: '0F172A', accent: '38BDF8', text: 'E2E8F0', sub: '94A3B8' };
  s.background = { color: c.bg };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.1, fill: { color: c.accent }, line: { type: 'none' } });

  const tX = 0.5, tW = W - 1.0;

  if (slide.type === 'title') {
    const lX = 0.5, lW = W - 1.0;
    s.addText(slide.title, { x: lX, y: 2.0, w: lW, h: 2.4, fontSize: 36, bold: true, color: 'FFFFFF', fontFace: 'Calibri', align: al, valign: 'middle' });
    if (slide.subtitle) s.addText(slide.subtitle, { x: lX, y: 4.55, w: lW, h: 0.7, fontSize: 15, color: c.accent, fontFace: 'Calibri Light', italic: true, align: al });
  } else {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0.1, w: W, h: 1.0, fill: { color: 'FFFFFF', transparency: 92 }, line: { type: 'none' } });
    s.addText(slide.title, { x: tX, y: 0.2, w: tW, h: 0.75, fontSize: 20, bold: true, color: c.accent, fontFace: 'Calibri', align: al });
    const bodyH = bh(slide.notes);
    bl(s, slide.bullets, slide.type === 'summary', tX, 1.2, tW, bodyH, c.text);
    renderBody(s, slide, tX, 1.2, tW, bodyH, c.accent, c.text);
    nt(s, slide.notes, 0, W, c.accent);
  }
  s.addText(String(idx + 1), { x: W - 0.65, y: H - 0.38, w: 0.5, h: 0.28, fontSize: 8, color: c.accent + '80', align: 'right', fontFace: 'Calibri Light' });
}
