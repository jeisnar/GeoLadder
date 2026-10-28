(function () {
  'use strict';

  var GG = (window.GG = window.GG || {});
  var NS = 'http://www.w3.org/2000/svg';
  var U = 100; /* ukuran 1 kotak pada viewBox 1000 x 1000 */

  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) {
      e.setAttribute(k, attrs[k]);
    });
    return e;
  }

  function pt(n, cfg) {
    var c = GG.utils.cellCenter(n, cfg.cols, cfg.rows);
    return { x: c.x * 10, y: c.y * 10 };
  }

  function ladder(svg, a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var len = Math.hypot(dx, dy);
    var ux = dx / len;
    var uy = dy / len;
    var nx = -uy * 15;
    var ny = ux * 15;
    [1, -1].forEach(function (s) {
      svg.appendChild(
        el('line', { x1: a.x + nx * s, y1: a.y + ny * s, x2: b.x + nx * s, y2: b.y + ny * s, stroke: '#b59a74', 'stroke-width': 9, 'stroke-linecap': 'round' })
      );
    });
    for (var d = 36; d < len - 20; d += 40) {
      var cx = a.x + ux * d;
      var cy = a.y + uy * d;
      svg.appendChild(
        el('line', { x1: cx + nx, y1: cy + ny, x2: cx - nx, y2: cy - ny, stroke: '#cdb68f', 'stroke-width': 7, 'stroke-linecap': 'round' })
      );
    }
  }

  function snake(svg, a, b, i) {
    var colors = ['#c99a98', '#9db08a', '#c4a27c', '#8fa3c2', '#b09bc0'];
    var color = colors[i % colors.length];
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var len = Math.hypot(dx, dy);
    var nx = (-dy / len) * len * 0.16;
    var ny = (dx / len) * len * 0.16;
    var s = i % 2 ? 1 : -1;
    var d =
      'M' + a.x + ' ' + a.y +
      ' C' + (a.x + dx * 0.3 + nx * s) + ' ' + (a.y + dy * 0.3 + ny * s) +
      ' ' + (b.x - dx * 0.3 - nx * s) + ' ' + (b.y - dy * 0.3 - ny * s) +
      ' ' + b.x + ' ' + b.y;
    svg.appendChild(el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 24, 'stroke-linecap': 'round' }));
    svg.appendChild(el('path', { d: d, fill: 'none', stroke: '#fff', 'stroke-opacity': 0.4, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-dasharray': '2 22' }));
    svg.appendChild(el('circle', { cx: a.x, cy: a.y, r: 22, fill: color }));
    [-8, 8].forEach(function (o) {
      svg.appendChild(el('circle', { cx: a.x + o, cy: a.y - 6, r: 5, fill: '#fff' }));
      svg.appendChild(el('circle', { cx: a.x + o, cy: a.y - 6, r: 2.4, fill: '#2e3a48' }));
    });
  }

  function build() {
    var cfg = GG.CONFIG.boards[100];
    var pal = ['#dfe9dc', '#efe6d0', '#dbe7f1', '#f1e3d9'];
    var svg = el('svg', { viewBox: '0 0 1000 1000', preserveAspectRatio: 'xMidYMid slice', focusable: 'false' });

    for (var r = 0; r < cfg.rows; r++) {
      for (var c = 0; c < cfg.cols; c++) {
        var n = GG.utils.squareAt(r, c, cfg.cols, cfg.rows);
        svg.appendChild(el('rect', { x: c * U, y: r * U, width: U, height: U, fill: pal[(r * 3 + c) % 4], stroke: '#fbf9f4', 'stroke-width': 3 }));
        var t = el('text', { x: c * U + 10, y: r * U + 30, 'font-size': 24, 'font-weight': 700, fill: '#8590a0', 'fill-opacity': 0.55, 'font-family': 'sans-serif' });
        t.textContent = String(n);
        svg.appendChild(t);
      }
    }
    cfg.ladders.forEach(function (l) {
      ladder(svg, pt(l.from, cfg), pt(l.to, cfg));
    });
    cfg.snakes.forEach(function (s, i) {
      snake(svg, pt(s.from, cfg), pt(s.to, cfg), i);
    });
    return svg;
  }

  function init() {
    var art = document.createElement('div');
    art.className = 'bg-art';
    art.setAttribute('aria-hidden', 'true');
    art.appendChild(build());
    var veil = document.createElement('div');
    veil.className = 'bg-veil';
    veil.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(veil, document.body.firstChild);
    document.body.insertBefore(art, veil);
  }

  GG.Background = { init: init };
})();
