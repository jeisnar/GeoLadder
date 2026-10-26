(function () {
  'use strict';

  var GG = (window.GG = window.GG || {});
  var utils = GG.utils;
  var h = utils.h;
  var sleep = utils.sleep;
  var squareAt = utils.squareAt;
  var cellCenter = utils.cellCenter;

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var OFFSETS = {
    1: [[0, 0]],
    2: [[-0.5, 0], [0.5, 0]],
    3: [[-0.5, -0.45], [0.5, -0.45], [0, 0.55]],
    4: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]
  };

  function svg(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      el.setAttribute(k, attrs[k]);
    });
    return el;
  }

  function Board(root, cfg, levelMap) {
    this.root = root;
    this.cfg = cfg;
    this.levelMap = levelMap;
    this.cols = cfg.cols;
    this.rows = cfg.rows;
    this.total = cfg.size;
    this.cells = {};
    this.ladderEls = [];
    this.pawns = {};
    this.pos = {};
    this.players = [];
    this.previewed = [];
    this.build();
  }

  Board.prototype.center = function (n) {
    return cellCenter(n, this.cols, this.rows);
  };

  Board.prototype.build = function () {
    var cfg = this.cfg;
    var self = this;
    var ladderBase = {};
    var ladderTop = {};
    var snakeHead = {};
    cfg.ladders.forEach(function (l) {
      ladderBase[l.from] = l;
      ladderTop[l.to] = l;
    });
    cfg.snakes.forEach(function (s) {
      snakeHead[s.from] = s;
    });

    this.root.innerHTML = '';
    this.el = h('div', {
      class: 'board',
      style: '--cols:' + this.cols + ';--rows:' + this.rows
    });
    this.inner = h('div', { class: 'board-inner' });
    this.grid = h('div', { class: 'board-grid', role: 'grid', 'aria-label': 'Papan permainan' });

    for (var row = 0; row < this.rows; row++) {
      for (var col = 0; col < this.cols; col++) {
        var n = squareAt(row, col, this.cols, this.rows);
        var level = this.levelMap[n];
        var lv = level ? GG.CONFIG.levels[level] : null;
        var isStart = n === 1;
        var isFinish = n === this.total;

        var classes = 'cell-face';
        if (isStart) classes += ' is-start';
        if (isFinish) classes += ' is-finish';
        if (level) classes += ' lv-' + level;

        var titleParts = ['Kotak ' + n];
        if (isStart) titleParts.push('Mulai');
        if (isFinish) titleParts.push('Finis (Soal Final)');
        if (lv && !isStart) titleParts.push('Soal ' + lv.label);
        if (ladderBase[n]) titleParts.push('Dasar tangga → ' + ladderBase[n].to);
        if (ladderTop[n]) titleParts.push('Puncak tangga dari ' + ladderTop[n].from);
        if (snakeHead[n]) titleParts.push('Kepala ular → ' + snakeHead[n].to);

        var face = h(
          'div',
          { class: classes, title: titleParts.join(' • '), dataset: { n: String(n) } },
          h('span', { class: 'cell-num' }, String(n)),
          lv && !isStart ? h('span', { class: 'cell-level', 'aria-hidden': 'true' }, lv.symbol) : null,
          isStart ? h('span', { class: 'cell-label' }, 'MULAI') : null,
          isFinish ? h('span', { class: 'cell-label' }, 'FINIS') : null,
          ladderBase[n]
            ? h('span', { class: 'cell-tag tag-ladder' }, '↑' + ladderBase[n].to)
            : null,
          snakeHead[n] ? h('span', { class: 'cell-tag tag-snake' }, '↓' + snakeHead[n].to) : null,
          ladderTop[n] && !ladderBase[n] ? h('span', { class: 'cell-tag tag-top' }, 'puncak') : null
        );

        this.cells[n] = face;
        this.grid.appendChild(h('div', { class: 'cell', role: 'gridcell' }, face));
      }
    }

    this.svg = svg('svg', {
      class: 'board-svg',
      viewBox: '0 0 100 100',
      preserveAspectRatio: 'none',
      'aria-hidden': 'true'
    });
    cfg.ladders.forEach(function (l) {
      self.drawLadder(l);
    });
    cfg.snakes.forEach(function (s, i) {
      self.drawSnake(s, i);
    });

    this.pawnLayer = h('div', { class: 'pawn-layer' });

    this.inner.appendChild(this.grid);
    this.inner.appendChild(this.svg);
    this.inner.appendChild(this.pawnLayer);
    this.el.appendChild(this.inner);
    this.root.appendChild(this.el);
  };

  Board.prototype.drawLadder = function (l) {
    var u = 100 / this.cols;
    var a = this.center(l.from);
    var b = this.center(l.to);
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var len = Math.hypot(dx, dy);
    var ux = dx / len;
    var uy = dy / len;
    var nx = -uy;
    var ny = ux;
    var trim = u * 0.22;
    var off = u * 0.15;

    var x1 = a.x + ux * trim;
    var y1 = a.y + uy * trim;
    var x2 = b.x - ux * trim;
    var y2 = b.y - uy * trim;
    var span = Math.hypot(x2 - x1, y2 - y1);

    var g = svg('g', { class: 'ladder' });

    [1, -1].forEach(function (side) {
      g.appendChild(
        svg('line', {
          x1: x1 + nx * off * side,
          y1: y1 + ny * off * side,
          x2: x2 + nx * off * side,
          y2: y2 + ny * off * side,
          stroke: '#a3805a',
          'stroke-width': u * 0.075,
          'stroke-linecap': 'round'
        })
      );
    });

    var rungs = Math.max(3, Math.round(span / (u * 0.46)));
    for (var i = 1; i <= rungs; i++) {
      var t = i / (rungs + 1);
      var cx = x1 + (x2 - x1) * t;
      var cy = y1 + (y2 - y1) * t;
      g.appendChild(
        svg('line', {
          x1: cx + nx * off,
          y1: cy + ny * off,
          x2: cx - nx * off,
          y2: cy - ny * off,
          stroke: '#c9ab80',
          'stroke-width': u * 0.06,
          'stroke-linecap': 'round'
        })
      );
    }

    this.svg.appendChild(g);
    this.ladderEls.push({ ladder: l, el: g });
  };

  Board.prototype.drawSnake = function (s, index) {
    var u = 100 / this.cols;
    var color = GG.CONFIG.snakeColors[index % GG.CONFIG.snakeColors.length];
    var head = this.center(s.from);
    var tail = this.center(s.to);
    var dx = tail.x - head.x;
    var dy = tail.y - head.y;
    var len = Math.hypot(dx, dy);
    var nx = -dy / len;
    var ny = dx / len;
    var amp = len * 0.13 + u * 0.18;
    var dir = index % 2 === 0 ? 1 : -1;

    var c1 = { x: head.x + dx * 0.3 + nx * amp * dir, y: head.y + dy * 0.3 + ny * amp * dir };
    var c2 = { x: head.x + dx * 0.7 - nx * amp * dir, y: head.y + dy * 0.7 - ny * amp * dir };
    var d =
      'M' + head.x + ' ' + head.y +
      ' C' + c1.x + ' ' + c1.y + ' ' + c2.x + ' ' + c2.y + ' ' + tail.x + ' ' + tail.y;

    var w = u * 0.2;
    var g = svg('g', { class: 'snake', opacity: '0.92' });

    g.appendChild(
      svg('path', {
        d: d,
        fill: 'none',
        stroke: color,
        'stroke-width': w,
        'stroke-linecap': 'round'
      })
    );
    g.appendChild(
      svg('path', {
        d: d,
        fill: 'none',
        stroke: '#ffffff',
        'stroke-opacity': '0.45',
        'stroke-width': w * 0.36,
        'stroke-linecap': 'round',
        'stroke-dasharray': u * 0.02 + ' ' + u * 0.16
      })
    );

    var hx = c1.x - head.x;
    var hy = c1.y - head.y;
    var hl = Math.hypot(hx, hy) || 1;
    hx /= hl;
    hy /= hl;
    var px = -hy;
    var py = hx;

    g.appendChild(
      svg('line', {
        x1: head.x + hx * u * 0.12,
        y1: head.y + hy * u * 0.12,
        x2: head.x + hx * u * 0.26,
        y2: head.y + hy * u * 0.26,
        stroke: '#b5574d',
        'stroke-width': u * 0.026,
        'stroke-linecap': 'round'
      })
    );
    g.appendChild(
      svg('circle', { cx: head.x, cy: head.y, r: u * 0.15, fill: color })
    );
    [1, -1].forEach(function (side) {
      var ex = head.x + hx * u * 0.04 + px * u * 0.075 * side;
      var ey = head.y + hy * u * 0.04 + py * u * 0.075 * side;
      g.appendChild(svg('circle', { cx: ex, cy: ey, r: u * 0.036, fill: '#fff' }));
      g.appendChild(svg('circle', { cx: ex, cy: ey, r: u * 0.017, fill: '#2e3a48' }));
    });

    this.svg.appendChild(g);
  };

  Board.prototype.setPlayers = function (players) {
    var self = this;
    this.players = players;
    this.pawnLayer.innerHTML = '';
    this.pawns = {};
    this.pos = {};
    players.forEach(function (p) {
      var el = h(
        'div',
        { class: 'pawn', style: '--pc:' + p.color, dataset: { id: String(p.id) }, title: p.name },
        h('div', { class: 'pawn-hop' }, h('div', { class: 'pawn-body' }, String(p.id + 1)))
      );
      self.pawns[p.id] = el;
      self.pos[p.id] = p.pos;
      self.pawnLayer.appendChild(el);
    });
    this.layout();
  };

  Board.prototype.layout = function () {
    var self = this;
    var groups = {};
    this.players.forEach(function (p) {
      var n = self.pos[p.id];
      if (!groups[n]) groups[n] = [];
      groups[n].push(p.id);
    });

    Object.keys(groups).forEach(function (key) {
      var ids = groups[key];
      var c = self.center(Number(key));
      ids.forEach(function (id, i) {
        var off = OFFSETS[ids.length][i] || [0, 0];
        var el = self.pawns[id];
        el.style.left = c.x + '%';
        el.style.top = c.y + '%';
        el.style.transform =
          'translate(calc(-50% + ' + off[0] * 110 + '%), calc(-50% + ' + off[1] * 110 + '%))';
      });
    });
  };

  Board.prototype.setPos = function (id, n, ms) {
    this.pos[id] = n;
    var dur = (ms || 0) * GG.CONFIG.speed + 'ms';
    var self = this;
    Object.keys(this.pawns).forEach(function (k) {
      self.pawns[k].style.setProperty('--move-ms', dur);
    });
    this.layout();
  };

  Board.prototype.setActive = function (id) {
    var self = this;
    Object.keys(this.pawns).forEach(function (k) {
      var on = id !== null && Number(k) === id;
      self.pawns[k].classList.toggle('is-active', on);
    });
  };

  Board.prototype.hop = function (id) {
    var el = this.pawns[id].querySelector('.pawn-hop');
    el.classList.remove('is-hop');
    void el.offsetWidth;
    el.classList.add('is-hop');
  };

  Board.prototype.pulseCell = function (n) {
    var face = this.cells[n];
    if (!face) return;
    face.classList.remove('is-landed');
    void face.offsetWidth;
    face.classList.add('is-landed');
    setTimeout(function () {
      face.classList.remove('is-landed');
    }, 700 * GG.CONFIG.speed + 20);
  };

  Board.prototype.step = async function (id, n, ms) {
    ms = ms || 270;
    this.setPos(id, n, ms);
    this.hop(id);
    this.pulseCell(n);
    await sleep(ms + 25);
  };

  Board.prototype.slide = async function (id, n, ms) {
    ms = ms || 900;
    this.setPos(id, n, ms);
    await sleep(ms + 60);
  };

  Board.prototype.clearPreview = function () {
    this.previewed.forEach(function (el) {
      el.classList.remove('is-preview', 'is-preview-from', 'is-preview-to');
    });
    this.ladderEls.forEach(function (o) {
      o.el.classList.remove('is-hl');
    });
    this.previewed = [];
  };

  Board.prototype.previewSquare = function (n) {
    this.clearPreview();
    var face = this.cells[n];
    if (!face) return;
    face.classList.add('is-preview');
    this.previewed.push(face);
  };

  Board.prototype.previewLadder = function (ladder) {
    this.clearPreview();
    var from = this.cells[ladder.from];
    var to = this.cells[ladder.to];
    from.classList.add('is-preview', 'is-preview-from');
    to.classList.add('is-preview', 'is-preview-to');
    this.previewed.push(from, to);
    this.ladderEls.forEach(function (o) {
      if (o.ladder === ladder) o.el.classList.add('is-hl');
    });
  };

  GG.Board = Board;
})();
