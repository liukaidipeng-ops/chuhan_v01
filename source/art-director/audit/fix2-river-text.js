(() => { // 第 2 条：河界字保持大号，压扁、加宽，塞进斜看时露出来的那条河面
  const B = window.__xq.Board, tex = B.waterMat.uniforms.uText.value, cv = tex.image, g = cv.getContext('2d'), w = cv.width, h = cv.height;
  const RF = window.__RF || 92, DY = window.__RDY == null ? -22 : window.__RDY, SX = window.__RSX || 1, SY = window.__RSY || 1;
  g.clearRect(0, 0, w, h);
  g.font = `900 ${RF}px ${B.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
  for (const [x, t] of [[0.27, '楚　　河'], [0.73, '漢　　界']]) { g.save(); g.translate(w * x, h / 2 + DY); g.scale(SX, SY); g.fillText(t, 0, 0); g.restore(); }
  tex.needsUpdate = true;
})()
