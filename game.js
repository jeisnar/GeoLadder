(function () {
  'use strict';

  var GG = (window.GG = window.GG || {});
  var CONFIG = GG.CONFIG;
  var randInt = GG.utils.randInt;
  var pick = GG.utils.pick;
  var sleep = GG.utils.sleep;

  function buildLevelMap(cfg) {
    var map = {};
    var total = cfg.size;
    var ladderTops = {};
    var snakeHeads = {};
    cfg.ladders.forEach(function (l) {
      ladderTops[l.to] = l.level;
    });
    cfg.snakes.forEach(function (s) {
      snakeHeads[s.from] = s.level;
    });

    for (var n = 2; n <= total; n++) {
      if (n === total) {
        map[n] = 'hard';
        continue;
      }
      if (ladderTops[n]) {
        map[n] = ladderTops[n];
        continue;
      }
      if (snakeHeads[n]) {
        map[n] = snakeHeads[n];
        continue;
      }
      var roll = ((n * 37 + 11) % 17) / 16;
      var progress = n / total;
      var easyCut = 0.58 - 0.3 * progress;
      var medCut = easyCut + 0.3;
      map[n] = roll < easyCut ? 'easy' : roll < medCut ? 'medium' : 'hard';
    }
    return map;
  }

  function Game(settings, view) {
    this.settings = settings;
    this.view = view;
    this.cfg = CONFIG.boards[settings.boardSize];
    this.total = this.cfg.size;
    this.levelMap = buildLevelMap(this.cfg);

    this.snakeByHead = {};
    this.cfg.snakes.forEach(
      function (s) {
        this.snakeByHead[s.from] = s;
      }.bind(this)
    );

    this.turn = 0;
    this.round = 1;
    this.busy = false;
    this.over = false;
    this.winner = null;
    this.history = [];
    this.seq = 0;

    GG.QuestionBank.reset();

    this.players = settings.names.map(
      function (name, i) {
        var p = {
          id: i,
          name: name,
          color: CONFIG.playerColors[i],
          pos: 1,
          hand: [],
          swap: CONFIG.startSwap,
          ladder: CONFIG.startLadder,
          score: 0,
          correct: 0,
          wrong: 0,
          streak: 0
        };
        this.fillHand(p);
        return p;
      }.bind(this)
    );
  }

  Game.buildLevelMap = buildLevelMap;

  Object.defineProperty(Game.prototype, 'current', {
    get: function () {
      return this.players[this.turn];
    }
  });

  /* ---------- Kartu & aturan ---------- */

  Game.prototype.drawNumber = function () {
    return randInt(1, 6);
  };

  Game.prototype.fillHand = function (p) {
    while (p.hand.length < CONFIG.handSize) p.hand.push(this.drawNumber());
    this.ensurePlayable(p);
  };

  Game.prototype.ensurePlayable = function (p) {
    var remaining = this.total - p.pos;
    if (remaining < 1) return;
    var ok = p.hand.some(function (v) {
      return v <= remaining;
    });
    if (!ok) {
      p.hand[randInt(0, p.hand.length - 1)] = randInt(1, Math.min(6, remaining));
    }
  };

  Game.prototype.nearestLadder = function (pos) {
    var best = null;
    this.cfg.ladders.forEach(function (l) {
      if (l.from >= pos && (!best || l.from < best.from)) best = l;
    });
    return best;
  };

  Game.prototype.swapCandidates = function (p) {
    return this.players.filter(function (o) {
      return o.id !== p.id && o.pos !== p.pos;
    });
  };

  Game.prototype.cardState = function (p, card) {
    if (card.type === 'num') {
      var v = p.hand[card.index];
      if (v === undefined) return { ok: false, reason: 'Kartu tidak tersedia' };
      var dest = p.pos + v;
      if (dest > this.total) {
        return { ok: false, reason: 'Melebihi kotak ' + this.total + ' (harus tepat di finis)' };
      }
      return { ok: true, dest: dest, value: v };
    }

    if (card.type === 'swap') {
      if (p.swap <= 0) return { ok: false, reason: 'Kartu Tukar sudah habis' };
      if (!this.swapCandidates(p).length) {
        return { ok: false, reason: 'Tidak ada pemain dengan posisi berbeda' };
      }
      return { ok: true };
    }

    if (card.type === 'ladder') {
      if (p.ladder <= 0) return { ok: false, reason: 'Kartu Tangga sudah habis' };
      var ladder = this.nearestLadder(p.pos);
      if (!ladder) return { ok: false, reason: 'Tidak ada tangga di depan posisimu' };
      return { ok: true, ladder: ladder };
    }

    return { ok: false, reason: 'Kartu tidak dikenal' };
  };

  Game.prototype.hasPlayable = function (p) {
    var self = this;
    var anyNum = p.hand.some(function (_, i) {
      return self.cardState(p, { type: 'num', index: i }).ok;
    });
    return (
      anyNum ||
      this.cardState(p, { type: 'swap' }).ok ||
      this.cardState(p, { type: 'ladder' }).ok
    );
  };

  Game.prototype.penaltySteps = function () {
    var mode = this.settings.penalty;
    if (mode === '1') return 1;
    if (mode === '2') return 2;
    return randInt(1, 2);
  };

  Game.prototype.award = function (p, level, correct) {
    var pts = 0;
    if (correct) {
      p.streak += 1;
      p.correct += 1;
      pts =
        CONFIG.points[level] +
        Math.min(CONFIG.points.streakMax, (p.streak - 1) * CONFIG.points.streakBonus);
    } else {
      p.streak = 0;
      p.wrong += 1;
    }
    p.score += pts;
    return pts;
  };

  /* ---------- Alur permainan ---------- */

  Game.prototype.play = async function (card) {
    if (this.busy || this.over) return false;
    var p = this.current;
    var st = this.cardState(p, card);
    if (!st.ok) {
      this.view.toast(st.reason, 'warn');
      return false;
    }

    this.busy = true;
    this.view.refresh();

    var consumed = false;
    try {
      if (card.type === 'num') consumed = await this.playNumber(p, card.index);
      else if (card.type === 'swap') consumed = await this.playSwap(p);
      else consumed = await this.playLadder(p);
    } catch (err) {
      console.error(err);
      consumed = true;
    }

    this.busy = false;
    if (consumed) this.endTurn();
    else this.view.refresh();
    return consumed;
  };

  Game.prototype.pass = function () {
    if (this.busy || this.over) return false;
    var p = this.current;
    if (this.hasPlayable(p)) return false;
    p.hand = [];
    this.fillHand(p);
    this.view.toast(p.name + ' mengganti kartu dan melewati giliran', 'info');
    this.endTurn();
    return true;
  };

  Game.prototype.endTurn = function () {
    var p = this.current;
    this.fillHand(p);

    if (this.over) {
      this.view.refresh();
      return;
    }

    this.turn = (this.turn + 1) % this.players.length;
    if (this.turn === 0) this.round += 1;
    this.view.turnChanged(this.current);
  };

  Game.prototype.walk = async function (p, from, to) {
    var dir = to > from ? 1 : -1;
    for (var n = from + dir; dir > 0 ? n <= to : n >= to; n += dir) {
      p.pos = n;
      await this.view.board.step(p.id, n);
    }
  };

  Game.prototype.ask = async function (p, opts) {
    var q = GG.QuestionBank.next(opts.level);
    var ans = await this.view.askQuestion({
      player: p,
      question: q,
      level: opts.level,
      contextLabel: opts.contextLabel
    });

    var points = this.award(p, opts.level, ans.correct);

    var bonus = '';
    if (ans.correct && opts.reward && opts.level === 'hard') {
      var type = pick(['swap', 'ladder']);
      if (p[type] < CONFIG.maxSpecial) {
        p[type] += 1;
        bonus = 'Bonus: +1 Kartu ' + (type === 'swap' ? 'Tukar' : 'Tangga') + '!';
      }
    }

    this.history.unshift({
      id: ++this.seq,
      round: this.round,
      playerId: p.id,
      playerName: p.name,
      color: p.color,
      level: opts.level,
      contextLabel: opts.contextLabel,
      text: q.text,
      chosenHtml: q.options[ans.chosenIndex],
      correctHtml: q.options[q.answerIndex],
      correct: ans.correct,
      points: points,
      explanation: q.explanation
    });

    this.view.refresh();

    await ans.showFeedback({
      correct: ans.correct,
      points: points,
      streak: p.streak,
      bonus: bonus,
      text: ans.correct ? opts.consequence.correct : opts.consequence.wrong,
      explanation: q.explanation
    });

    return { correct: ans.correct, points: points };
  };

  Game.prototype.playNumber = async function (p, index) {
    var v = p.hand[index];
    var from = p.pos;
    var dest = from + v;
    p.hand.splice(index, 1);

    this.view.toast(p.name + ' memainkan kartu ' + v, 'info');
    await this.walk(p, from, dest);
    await this.resolveLanding(p, dest);
    return true;
  };

  Game.prototype.resolveLanding = async function (p, n) {
    var isFinal = n === this.total;
    var level = isFinal ? 'hard' : this.levelMap[n];
    var snake = this.snakeByHead[n];
    var back = Math.max(1, n - this.penaltySteps());
    var steps = n - back;

    var contextLabel;
    var consequence;

    if (isFinal) {
      contextLabel = 'Soal Final — kotak ' + n;
      consequence = {
        correct: 'Luar biasa! Kamu mencapai garis finis!',
        wrong: 'Belum tepat. Mundur ' + steps + ' langkah ke kotak ' + back + '.'
      };
    } else if (snake) {
      contextLabel = 'Kepala ular di kotak ' + n;
      consequence = {
        correct: 'Kamu lolos! Ular tidak jadi menelanmu dan kamu bertahan di kotak ' + n + '.',
        wrong: 'Ular menelanmu! Meluncur turun ke kotak ' + snake.to + '.'
      };
    } else {
      contextLabel = 'Mendarat di kotak ' + n;
      consequence = {
        correct: 'Kamu bertahan di kotak ' + n + '.',
        wrong: 'Mundur ' + steps + ' langkah ke kotak ' + back + '.'
      };
    }

    var res = await this.ask(p, {
      level: level,
      contextLabel: contextLabel,
      consequence: consequence,
      reward: !isFinal
    });

    if (res.correct) {
      if (isFinal) {
        await this.win(p);
      } else if (snake) {
        this.view.toast(p.name + ' lolos dari ular!', 'good');
      }
      return;
    }

    if (snake) {
      p.pos = snake.to;
      await this.view.board.slide(p.id, snake.to, 1100);
    } else {
      await this.walk(p, n, back);
    }
  };

  Game.prototype.playSwap = async function (p) {
    var candidates = this.swapCandidates(p);
    var target = await this.view.pickTarget(p, candidates);
    if (!target) return false;

    p.swap -= 1;
    var level = Math.random() < 0.5 ? 'medium' : 'hard';
    var a = p.pos;
    var b = target.pos;

    var res = await this.ask(p, {
      level: level,
      contextLabel: 'Kartu Tukar — target ' + target.name,
      consequence: {
        correct: 'Posisi tertukar! ' + p.name + ' ke kotak ' + b + ', ' + target.name + ' ke kotak ' + a + '.',
        wrong: 'Penukaran gagal. Giliranmu hangus dan posisi tidak berubah.'
      },
      reward: false
    });

    if (res.correct) {
      p.pos = b;
      target.pos = a;
      await Promise.all([
        this.view.board.slide(p.id, b, 1000),
        this.view.board.slide(target.id, a, 1000)
      ]);
      this.ensurePlayable(target);
      this.view.toast(p.name + ' bertukar posisi dengan ' + target.name, 'good');
    } else {
      this.view.toast('Penukaran gagal, giliran hangus', 'warn');
    }
    return true;
  };

  Game.prototype.playLadder = async function (p) {
    var ladder = this.nearestLadder(p.pos);
    p.ladder -= 1;

    var res = await this.ask(p, {
      level: ladder.level,
      contextLabel: 'Kartu Tangga — puncak tangga kotak ' + ladder.to,
      consequence: {
        correct: 'Kamu memanjat tangga ke kotak ' + ladder.to + '!',
        wrong: 'Gagal memanjat. Kamu tetap di kotak ' + p.pos + '.'
      },
      reward: false
    });

    if (res.correct) {
      p.pos = ladder.to;
      await this.view.board.slide(p.id, ladder.to, 1200);
      this.view.board.pulseCell(ladder.to);
      this.view.toast(p.name + ' naik tangga ke kotak ' + ladder.to, 'good');
    } else {
      this.view.toast('Gagal memanjat tangga', 'warn');
    }
    return true;
  };

  Game.prototype.win = async function (p) {
    p.score += CONFIG.points.finish;
    this.over = true;
    this.winner = p;
    this.view.refresh();
    await sleep(450);
    this.view.showWinner(this.ranking());
  };

  Game.prototype.accuracy = function (p) {
    var total = p.correct + p.wrong;
    return total ? Math.round((p.correct / total) * 100) : 0;
  };

  Game.prototype.ranking = function () {
    var winner = this.winner;
    return this.players.slice().sort(function (a, b) {
      if (winner) {
        if (a === winner) return -1;
        if (b === winner) return 1;
      }
      if (b.score !== a.score) return b.score - a.score;
      return b.pos - a.pos;
    });
  };

  GG.Game = Game;
})();
