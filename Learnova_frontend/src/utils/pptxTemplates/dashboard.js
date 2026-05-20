export default function dashboard(s, slide, idx, ctx) {
  const { pptx, W, H, isRTL, al, bl, nt, bh, renderBody } = ctx;
  const c = { bg: 'F8FAFC', accent: '3B82F6', text: '1E293B', hbg: '1E293B', ht: 'FFFFFF' };
  const CC = ['3B82F6', '10B981', 'F59E0B', 'EF4444', '8B5CF6', '06B6D4'];
  s.background = { color: c.bg };

  if (slide.type === 'title') {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 2.8, fill: { color: c.hbg }, line: { type: 'none' } });
    s.addText(slide.title, { x: 0.6, y: 0.4, w: W - 1.2, h: 2.0, fontSize: 40, bold: true, color: 'FFFFFF', fontFace: 'Calibri', align: al, valign: 'middle' });
    if (slide.subtitle) s.addText(slide.subtitle, { x: 0.6, y: 2.95, w: W - 1.2, h: 0.7, fontSize: 17, color: c.text, fontFace: 'Calibri Light', italic: true, align: al });
  } else if (slide.type === 'content' || slide.type === 'summary') {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.0, fill: { color: c.hbg }, line: { type: 'none' } });
    s.addText(slide.title, { x: 0.5, y: 0.13, w: W - 1.0, h: 0.75, fontSize: 20, bold: true, color: c.ht, fontFace: 'Calibri', align: al });
    const bullets = slide.bullets || [], nc = Math.min(bullets.length, 3) || 1, nr = Math.ceil(bullets.length / nc);
    const cardW = (W - 0.8) / nc - 0.18, cardH = Math.min((H - 1.6) / nr - 0.12, 1.85);
    bullets.forEach((b, bi) => {
      const col = bi % nc, row = Math.floor(bi / nc), bx = 0.38 + col * (cardW + 0.18), by = 1.12 + row * (cardH + 0.12), cc = CC[bi % CC.length];
      s.addShape(pptx.ShapeType.rect, { x: bx, y: by, w: cardW, h: 0.28, fill: { color: cc }, line: { type: 'none' } });
      s.addShape(pptx.ShapeType.rect, { x: bx, y: by + 0.28, w: cardW, h: cardH - 0.28, fill: { color: 'FFFFFF' }, line: { color: cc + '55', pt: 1 } });
      s.addText((slide.type === 'summary' ? '✓ ' : '') + b, { x: bx + 0.1, y: by + 0.32, w: cardW - 0.2, h: cardH - 0.4, fontSize: 13, color: c.text, fontFace: 'Calibri Light', valign: 'top', align: al, wrap: true });
    });
    nt(s, slide.notes, 0, W, c.accent);
  } else {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.0, fill: { color: c.hbg }, line: { type: 'none' } });
    s.addText(slide.title, { x: 0.5, y: 0.13, w: W - 1.0, h: 0.75, fontSize: 20, bold: true, color: c.ht, fontFace: 'Calibri', align: al });
    const bodyH = bh(slide.notes);
    renderBody(s, slide, 0.5, 1.1, W - 0.8, bodyH, c.accent, c.text);
    nt(s, slide.notes, 0, W, c.accent);
  }
  s.addText(String(idx + 1), { x: W - 0.65, y: H - 0.38, w: 0.5, h: 0.28, fontSize: 8, color: c.accent + '80', align: 'right', fontFace: 'Calibri Light' });
}
