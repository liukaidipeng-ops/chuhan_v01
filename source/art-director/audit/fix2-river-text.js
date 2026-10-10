(() => { // 第 2 条：河界字往汉方（镜头这一侧）挪、略收小，斜看时不被楚方棋盘的厚边挡住
  const B = window.__xq.Board, tex = B.waterMat.uniforms.uText.value, cv = tex.image, g = cv.getContext('2d'), w = cv.width, h = cv.height;
  g.clearRect(0, 0, w, h);
  g.font = `900 ${window.__RF || 80}px ${B.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
  const dy = window.__RDY == null ? 22 : window.__RDY;
  g.save(); g.translate(w * 0.27, h / 2 + dy); g.fillText('楚　　河', 0, 0); g.restore();
  g.save(); g.translate(w * 0.73, h / 2 + dy); g.fillText('漢　　界', 0, 0); g.restore();
  tex.needsUpdate = true;
})()
