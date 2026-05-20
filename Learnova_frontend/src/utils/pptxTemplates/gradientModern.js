export default function gradientModern(s, slide, idx, ctx) {
  const { pptx, W, H, isRTL, al, bl, nt, bh, renderBody } = ctx;
  const c = { bg: '1B2B4B', accent: '60A5FA', text: 'FFFFFF', sub: '93C5FD' };
  s.background = { color: c.bg };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: '2563EB', transparency: 86 }, line: { type: 'none' } });
  s.addShape(pptx.ShapeType.rect, { x: W * 0.5, y: 0, w: W * 0.5, h: H, fill: { color: '1E40AF', transparency: 80 }, line: { type: 'none' } });
  s.addShape(pptx.ShapeType.rect, { x: W * 0.72, y: H * 0.5, w: W * 0.28, h: H * 0.5, fill: { color: '3B82F6', transparency: 74 }, line: { type: 'none' } });

  const cx = 0.5, cw = W - 0.8;

  if (slide.type === 'title') {
    const side = 0.5, tw = W - 1.0;
    s.addText(slide.title, { x: side, y: 2.0, w: tw, h: 2.5, fontSize: 38, bold: true, color: 'FFFFFF', fontFace: 'Calibri', align: al, valign: 'middle' });
    if (slide.subtitle) s.addText(slide.subtitle, { x: side, y: 4.6, w: tw, h: 0.7, fontSize: 15, color: c.accent, fontFace: 'Calibri Light', italic: true, align: al });
  } else {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.95, fill: { color: '000000', transparency: 65 }, line: { type: 'none' } });
    s.addText(slide.title, { x: 0.5, y: 0.12, w: cw - 0.3, h: 0.75, fontSize: 20, bold: true, color: 'FFFFFF', fontFace: 'Calibri', align: al });
    const bodyH = bh(slide.notes);
    bl(s, slide.bullets, slide.type === 'summary', cx, 1.1, cw - 0.3, bodyH, c.text);
    renderBody(s, slide, cx, 1.1, cw - 0.3, bodyH, c.accent, c.text);
    nt(s, slide.notes, 0, W, c.accent);
  }
  s.addShape(pptx.ShapeType.rect, { x: 0, y: H - 0.09, w: W, h: 0.09, fill: { color: c.accent }, line: { type: 'none' } });
  s.addText(String(idx + 1), { x: W - 0.65, y: H - 0.38, w: 0.5, h: 0.28, fontSize: 8, color: c.accent + '90', align: 'right', fontFace: 'Calibri Light' });
}
