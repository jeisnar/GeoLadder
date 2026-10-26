(function () {
  'use strict';

  var GG = (window.GG = window.GG || {});
  var CONFIG = GG.CONFIG;
  var h = GG.utils.h;
  var storage = GG.utils.storage;

  var STORE_KEY = 'geoladder:setup:v1';
  var KEYS = 'ABCD';

  var ICON = {
    swap:
      '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h12l-3-3"/><path d="M17 17H5l3 3"/></svg>',
    ladder:
      '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8"/></svg>',
    trophy:
      '<svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>'
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  var setup = Object.assign(
    { count: 2, boardSize: 36, penalty: 'random', names: [] },
    storage.get(STORE_KEY, {})
  );
  setup.names = [0, 1, 2, 3].map(function (i) {
    return (setup.names && setup.names[i]) || '';
  });
  setup.count = Math.min(CONFIG.maxPlayers, Math.max(CONFIG.minPlayers, Number(setup.count) || 2));
  if (!CONFIG.boards[setup.boardSize]) setup.boardSize = 36;

  var game = null;
  var board = null;
  var settings = null;
  var selected = null;
  var activeTab = 'players';
  var dealPending = false;

  /* =========================================================
     Utilitas UI
     ========================================================= */

  function toast(msg, tone) {
    var root = $('#toast-root');
    var el = h('div', { class: 'toast ' + (tone || '') }, msg);
    root.appendChild(el);
    while (root.children.length > 3) root.removeChild(root.firstChild);
    var life = 2300 * CONFIG.speed + 40;
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 260 * CONFIG.speed + 20);
    }, life);
  }

  function openModal(content, opts) {
    opts = opts || {};
    var root = $('#modal-root');
    var overlay = h(
      'div',
      { class: 'modal-overlay' },
      h('div', { class: 'modal ' + (opts.className || ''), role: 'dialog', 'aria-modal': 'true' }, content)
    );
    var closed = false;
    var api = {
      el: overlay,
      close: function () {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKey);
        overlay.classList.remove('is-open');
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          if (!root.children.length) document.body.classList.remove('has-modal');
        }, 200 * CONFIG.speed + 10);
      }
    };

    function onKey(e) {
      if (opts.dismissible && e.key === 'Escape') {
        api.close();
        return;
      }
      if (opts.onKey) opts.onKey(e);
    }

    if (opts.dismissible) {
      overlay.addEventListener('mousedown', function (e) {
        if (e.target === overlay) api.close();
      });
    }

    document.addEventListener('keydown', onKey);
    root.appendChild(overlay);
    document.body.classList.add('has-modal');
    requestAnimationFrame(function () {
      overlay.classList.add('is-open');
    });
    return api;
  }

  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var m;
      var content = h(
        'div',
        null,
        h('h3', null, opts.title),
        h('p', { class: 'modal-text' }, opts.text),
        h(
          'div',
          { class: 'modal-actions' },
          h(
            'button',
            {
              class: 'btn btn-ghost',
              type: 'button',
              on: {
                click: function () {
                  m.close();
                  resolve(false);
                }
              }
            },
            'Batal'
          ),
          h(
            'button',
            {
              class: 'btn btn-primary',
              type: 'button',
              on: {
                click: function () {
                  m.close();
                  resolve(true);
                }
              }
            },
            opts.okLabel || 'Ya'
          )
        )
      );
      m = openModal(content, { className: 'modal-narrow' });
    });
  }

  function levelChip(level, small) {
    var lv = CONFIG.levels[level];
    return h('span', { class: 'chip-level lv-' + level + (small ? ' chip-sm' : '') }, lv.symbol + ' ' + lv.label);
  }

  /* =========================================================
     Layar & pengaturan
     ========================================================= */

  function showScreen(name) {
    $('#screen-setup').classList.toggle('is-active', name === 'setup');
    $('#screen-game').classList.toggle('is-active', name === 'game');
    $('#btn-menu').classList.toggle('is-hidden', name !== 'game');
    $('#btn-restart').classList.toggle('is-hidden', name !== 'game');
    window.scrollTo(0, 0);
  }

  function renderNameFields() {
    var wrap = $('#name-fields');
    wrap.innerHTML = '';
    for (var i = 0; i < setup.count; i++) {
      (function (idx) {
        var input = h('input', {
          type: 'text',
          class: 'input',
          maxlength: '14',
          placeholder: CONFIG.defaultNames[idx],
          value: setup.names[idx],
          'aria-label': 'Nama pemain ' + (idx + 1),
          on: {
            input: function (e) {
              setup.names[idx] = e.target.value;
            }
          }
        });
        wrap.appendChild(
          h(
            'label',
            { class: 'name-row', style: '--pc:' + CONFIG.playerColors[idx] },
            h('span', { class: 'pawn-dot' }, String(idx + 1)),
            input
          )
        );
      })(i);
    }
  }

  function bindSegment(selector, key, parse) {
    var root = $(selector);
    function sync() {
      $$('.seg', root).forEach(function (b) {
        var on = String(setup[key]) === b.dataset.value;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('.seg');
      if (!b) return;
      setup[key] = parse ? parse(b.dataset.value) : b.dataset.value;
      sync();
      if (key === 'count') renderNameFields();
    });
    sync();
  }

  function buildSettings() {
    var names = [];
    for (var i = 0; i < setup.count; i++) {
      names.push((setup.names[i] || '').trim() || CONFIG.defaultNames[i]);
    }
    return {
      count: setup.count,
      boardSize: setup.boardSize,
      penalty: setup.penalty,
      names: names
    };
  }

  function startGame() {
    storage.set(STORE_KEY, setup);
    settings = buildSettings();

    $('#modal-root').innerHTML = '';
    document.body.classList.remove('has-modal');

    game = new GG.Game(settings, view);
    board = new GG.Board($('#board'), game.cfg, game.levelMap);
    board.setPlayers(game.players);

    selected = null;
    activeTab = 'players';
    dealPending = true;

    showScreen('game');
    renderAll();
    toast('Giliran pertama: ' + game.current.name, 'info');
  }

  function backToMenu() {
    $('#modal-root').innerHTML = '';
    document.body.classList.remove('has-modal');
    game = null;
    board = null;
    showScreen('setup');
  }

  /* =========================================================
     Render panel
     ========================================================= */

  function sameCard(a, b) {
    return !!a && !!b && a.type === b.type && a.index === b.index;
  }

  function describeSelection(p) {
    if (game.over) return h('span', null, 'Permainan telah selesai.');
    if (game.busy) return h('span', null, 'Memproses langkah…');
    if (!selected) {
      return h('span', null, 'Pilih satu kartu dari dekmu, lalu tekan ', h('b', null, 'Mainkan Kartu'), '.');
    }
    var st = game.cardState(p, selected);
    if (!st.ok) return h('span', null, st.reason);

    if (selected.type === 'num') {
      var snake = game.snakeByHead[st.dest];
      var lvl = st.dest === game.total ? 'hard' : game.levelMap[st.dest];
      var extra = snake ? ' — ada kepala ular, jawab benar agar lolos!' : '';
      var label = st.dest === game.total ? 'Soal Final' : 'Soal ' + CONFIG.levels[lvl].label;
      return h('span', null, 'Maju ', h('b', null, String(st.value)), ' langkah ke kotak ', h('b', null, String(st.dest)), ' · ' + label + extra);
    }
    if (selected.type === 'swap') {
      return h('span', null, h('b', null, 'Kartu Tukar'), ': pilih pemain target, jawab soal sedang/sulit. Gagal = giliran hangus.');
    }
    return h(
      'span',
      null,
      h('b', null, 'Kartu Tangga'),
      ': naik ke kotak ',
      h('b', null, String(st.ladder.to)),
      ' bila soal ' + CONFIG.levels[st.ladder.level].label.toLowerCase() + ' di puncaknya terjawab benar.'
    );
  }

  function renderTurn() {
    var box = $('#turn-panel');
    box.innerHTML = '';
    var p = game.current;
    box.style.setProperty('--pc', p.color);

    box.appendChild(
      h(
        'div',
        { class: 'turn-head', style: '--pc:' + p.color },
        h('span', { class: 'pawn-dot' }, String(p.id + 1)),
        h(
          'div',
          null,
          h('div', { class: 'turn-title' }, game.over ? 'Permainan selesai' : 'Giliran: ' + p.name),
          h('div', { class: 'turn-sub' }, 'Ronde ' + game.round + ' · Kotak ' + p.pos + ' dari ' + game.total)
        )
      )
    );
    box.appendChild(h('div', { class: 'turn-hint', 'aria-live': 'polite' }, describeSelection(p)));
  }

  function cardClasses(base, card, st) {
    var cls = base;
    if (sameCard(selected, card)) cls += ' is-selected';
    if (game.busy || game.over) cls += ' is-locked';
    else if (!st.ok) cls += ' is-disabled';
    return cls;
  }

  function renderHand() {
    var box = $('#hand-panel');
    box.innerHTML = '';
    var p = game.current;

    box.appendChild(
      h('div', { class: 'panel-title' }, h('span', null, 'Dek Kartu'), h('small', null, p.name))
    );

    var row = h('div', { class: 'hand-row' + (dealPending ? ' deal' : '') });
    p.hand.forEach(function (v, i) {
      var card = { type: 'num', index: i };
      var st = game.cardState(p, card);
      var pips = [];
      for (var k = 0; k < v; k++) pips.push(h('i'));
      row.appendChild(
        h(
          'button',
          {
            class: cardClasses('card-num', card, st),
            type: 'button',
            title: st.ok ? 'Maju ' + v + ' langkah' : st.reason,
            'aria-pressed': sameCard(selected, card) ? 'true' : 'false',
            'aria-label': 'Kartu angka ' + v,
            style: '--i:' + i,
            on: {
              click: function () {
                selectCard(card);
              }
            }
          },
          h('span', { class: 'corner tl' }, String(v)),
          h('span', { class: 'corner br' }, String(v)),
          h('span', { class: 'val' }, String(v)),
          h('span', { class: 'pips' }, pips)
        )
      );
    });
    box.appendChild(row);
    dealPending = false;

    var sp = h('div', { class: 'special-row' });
    [
      { type: 'swap', cls: 'sp-swap', title: 'Kartu Tukar', desc: 'Tukar posisi + soal', count: p.swap },
      { type: 'ladder', cls: 'sp-ladder', title: 'Kartu Tangga', desc: 'Naik tangga + soal', count: p.ladder }
    ].forEach(function (s) {
      var card = { type: s.type };
      var st = game.cardState(p, card);
      sp.appendChild(
        h(
          'button',
          {
            class: cardClasses('card-sp ' + s.cls, card, st),
            type: 'button',
            title: st.ok ? s.title : st.reason,
            'aria-pressed': sameCard(selected, card) ? 'true' : 'false',
            on: {
              click: function () {
                selectCard(card);
              }
            }
          },
          h('span', { html: ICON[s.type] }),
          h('span', null, h('strong', null, s.title), h('small', null, s.desc)),
          h('span', { class: 'sp-count' }, '×' + s.count)
        )
      );
    });
    box.appendChild(sp);

    var actions = h('div', { class: 'hand-actions' });
    var canPlay = !!selected && !game.busy && !game.over && game.cardState(p, selected).ok;
    actions.appendChild(
      h(
        'button',
        {
          class: 'btn btn-primary btn-block',
          type: 'button',
          id: 'btn-play',
          disabled: !canPlay,
          on: { click: playSelected }
        },
        'Mainkan Kartu'
      )
    );

    if (!game.over && !game.busy && !game.hasPlayable(p)) {
      actions.appendChild(
        h(
          'button',
          {
            class: 'btn btn-sand btn-block',
            type: 'button',
            id: 'btn-pass',
            on: {
              click: function () {
                game.pass();
              }
            }
          },
          'Tidak ada kartu yang bisa dimainkan — Ganti Kartu & Lewati'
        )
      );
    }
    box.appendChild(actions);
  }

  function renderPlayers() {
    var wrap = h('div');
    game.players.forEach(function (p) {
      var pct = Math.round(((p.pos - 1) / (game.total - 1)) * 100);
      var isTurn = !game.over && p.id === game.current.id;
      wrap.appendChild(
        h(
          'div',
          { class: 'pl-card' + (isTurn ? ' is-turn' : ''), style: '--pc:' + p.color },
          h(
            'div',
            { class: 'pl-top' },
            h('span', { class: 'pawn-dot' }, String(p.id + 1)),
            h('div', { class: 'pl-name' }, h('strong', null, p.name), h('small', null, 'Kotak ' + p.pos + ' / ' + game.total)),
            h('div', { class: 'pl-score' }, h('b', null, String(p.score)), h('small', null, 'poin'))
          ),
          h('div', { class: 'progress' }, h('i', { style: 'width:' + pct + '%' })),
          h(
            'div',
            { class: 'pl-meta' },
            h('span', { title: 'Kartu Tukar' }, '⇄ Tukar ×' + p.swap),
            h('span', { title: 'Kartu Tangga' }, '↑ Tangga ×' + p.ladder),
            h('span', { title: 'Kartu angka di tangan' }, 'Kartu ' + p.hand.length),
            p.streak > 1 ? h('span', { class: 'streak' }, 'Beruntun ×' + p.streak) : null
          )
        )
      );
    });
    return wrap;
  }

  function rankTable(players, withWinner) {
    var table = h(
      'table',
      { class: 'score-table' },
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          h('th', null, '#'),
          h('th', null, 'Pemain'),
          h('th', { class: 'num' }, 'Skor'),
          h('th', { class: 'num' }, 'Benar'),
          h('th', { class: 'num' }, 'Salah'),
          h('th', { class: 'num' }, 'Akurasi'),
          h('th', { class: 'num' }, 'Kotak')
        )
      )
    );
    var body = h('tbody');
    players.forEach(function (p, i) {
      body.appendChild(
        h(
          'tr',
          null,
          h('td', null, String(i + 1)),
          h(
            'td',
            null,
            h(
              'span',
              { class: 'who', style: '--pc:' + p.color },
              h('span', { class: 'pawn-dot' }, String(p.id + 1)),
              p.name + (withWinner && game.winner === p ? ' 🏁' : '')
            )
          ),
          h('td', { class: 'num' }, h('b', null, String(p.score))),
          h('td', { class: 'num' }, String(p.correct)),
          h('td', { class: 'num' }, String(p.wrong)),
          h('td', { class: 'num' }, game.accuracy(p) + '%'),
          h('td', { class: 'num' }, String(p.pos))
        )
      );
    });
    table.appendChild(body);
    return table;
  }

  function renderScores() {
    var sorted = game.players.slice().sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return b.pos - a.pos;
    });
    return rankTable(sorted, false);
  }

  function renderHistory() {
    if (!game.history.length) {
      return h('div', { class: 'empty' }, 'Belum ada soal yang dijawab. Mainkan sebuah kartu untuk memulai!');
    }
    var wrap = h('div');
    game.history.forEach(function (e) {
      wrap.appendChild(
        h(
          'details',
          { class: 'hist-item ' + (e.correct ? 'ok' : 'bad') },
          h(
            'summary',
            null,
            h('span', { class: 'pawn-dot', style: '--pc:' + e.color + ';width:24px;height:24px;font-size:.72rem' }, String(e.playerId + 1)),
            h('span', { class: 'hist-main' }, h('strong', null, '#' + e.id + ' · ' + e.playerName), h('small', null, e.contextLabel)),
            levelChip(e.level, true),
            h('span', { class: 'hist-res' }, e.correct ? '+' + e.points : '✗')
          ),
          h(
            'div',
            { class: 'hist-body' },
            h('div', { class: 'hist-q', html: e.text }),
            h('div', null, h('b', { class: 'k' }, 'Jawaban pemain: '), h('span', { html: e.chosenHtml })),
            h('div', null, h('b', { class: 'k' }, 'Jawaban benar: '), h('span', { html: e.correctHtml })),
            h('div', null, h('b', { class: 'k' }, 'Pembahasan: '), h('span', { html: e.explanation }))
          )
        )
      );
    });
    return wrap;
  }

  function renderTabs() {
    $$('.tab').forEach(function (t) {
      var on = t.dataset.tab === activeTab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var body = $('#tab-body');
    var openIds = [];
    $$('details[open]', body).forEach(function (d, i) {
      openIds.push(i);
    });
    var scroll = body.scrollTop;
    body.innerHTML = '';
    var content =
      activeTab === 'players' ? renderPlayers() : activeTab === 'scores' ? renderScores() : renderHistory();
    body.appendChild(content);
    if (activeTab === 'history') {
      var items = $$('details', body);
      openIds.forEach(function (i) {
        if (items[i]) items[i].open = true;
      });
    }
    body.scrollTop = scroll;
  }

  function renderAll() {
    if (!game) return;
    board.setActive(game.over ? null : game.current.id);
    renderTurn();
    renderHand();
    renderTabs();
  }

  /* =========================================================
     Interaksi kartu
     ========================================================= */

  function selectCard(card) {
    if (!game || game.busy || game.over) return;
    var p = game.current;
    var st = game.cardState(p, card);
    if (!st.ok) {
      toast(st.reason, 'warn');
      return;
    }

    if (sameCard(selected, card)) {
      selected = null;
      board.clearPreview();
    } else {
      selected = card;
      if (card.type === 'num') board.previewSquare(st.dest);
      else if (card.type === 'ladder') board.previewLadder(st.ladder);
      else board.clearPreview();
    }
    renderTurn();
    renderHand();
  }

  async function playSelected() {
    if (!game || !selected || game.busy || game.over) return;
    var card = selected;
    var el = $('.card-num.is-selected') || $('.card-sp.is-selected');
    if (el) el.classList.add('is-played');
    board.clearPreview();
    await GG.utils.sleep(300);
    var consumed = await game.play(card);
    if (consumed) selected = null;
    renderAll();
  }

  /* =========================================================
     Modal soal, target, pemenang, aturan
     ========================================================= */

  function askQuestion(params) {
    return new Promise(function (resolve) {
      var player = params.player;
      var q = params.question;
      var chosen = null;
      var submitted = false;
      var optEls = [];
      var submitBtn;
      var modal;

      var optionsBox = h('div', { class: 'q-options', role: 'radiogroup', 'aria-label': 'Pilihan jawaban' });
      q.options.forEach(function (html, i) {
        var btn = h(
          'button',
          {
            class: 'opt',
            type: 'button',
            role: 'radio',
            'aria-checked': 'false',
            on: {
              click: function () {
                choose(i);
              }
            }
          },
          h('span', { class: 'opt-key' }, KEYS[i]),
          h('span', { class: 'opt-text', html: html })
        );
        optEls.push(btn);
        optionsBox.appendChild(btn);
      });

      submitBtn = h(
        'button',
        { class: 'btn btn-primary', type: 'button', disabled: true, on: { click: submit } },
        'Kirim Jawaban'
      );

      var actions = h(
        'div',
        { class: 'q-actions' },
        h('span', { class: 'kbd-hint' }, 'Tip: tekan A–D lalu Enter'),
        submitBtn
      );

      var feedbackHost = h('div');

      var content = h(
        'div',
        { class: 'q-modal' },
        h(
          'div',
          { class: 'q-head', style: '--pc:' + player.color },
          h('span', { class: 'pawn-dot' }, String(player.id + 1)),
          h('div', { class: 'q-who' }, h('strong', null, player.name), h('small', null, params.contextLabel)),
          levelChip(params.level)
        ),
        h('div', { class: 'q-text', html: q.text }),
        optionsBox,
        feedbackHost,
        actions
      );

      function choose(i) {
        if (submitted) return;
        chosen = i;
        optEls.forEach(function (el, k) {
          el.classList.toggle('is-picked', k === i);
          el.setAttribute('aria-checked', k === i ? 'true' : 'false');
        });
        submitBtn.disabled = false;
      }

      function submit() {
        if (submitted || chosen === null) return;
        submitted = true;
        var correct = chosen === q.answerIndex;

        optEls.forEach(function (el, k) {
          el.disabled = true;
          el.classList.remove('is-picked');
          if (k === q.answerIndex) el.classList.add('is-correct');
          else if (k === chosen) el.classList.add('is-wrong');
          else el.classList.add('is-dim');
        });
        submitBtn.disabled = true;
        submitBtn.textContent = 'Memeriksa…';

        resolve({
          correct: correct,
          chosenIndex: chosen,
          showFeedback: function (info) {
            return new Promise(function (done) {
              feedbackHost.appendChild(feedbackBlock(info));

              var next = h(
                'button',
                {
                  class: 'btn btn-primary',
                  type: 'button',
                  on: {
                    click: function () {
                      finish();
                    }
                  }
                },
                'Lanjutkan'
              );
              actions.innerHTML = '';
              actions.appendChild(next);
              next.focus();

              var finished = false;
              function finish() {
                if (finished) return;
                finished = true;
                modal.close();
                done();
              }
              modal.onContinue = finish;
              setTimeout(function () {
                var fb = feedbackHost.firstChild;
                if (fb && fb.scrollIntoView) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }, 60);
            });
          }
        });
      }

      modal = openModal(content, {
        dismissible: false,
        onKey: function (e) {
          if (e.target && e.target.tagName === 'INPUT') return;
          var key = e.key;
          if (!submitted) {
            var idx = KEYS.indexOf(key.toUpperCase());
            if (key.length === 1 && idx > -1 && idx < q.options.length) {
              choose(idx);
              e.preventDefault();
            } else if (/^[1-4]$/.test(key) && Number(key) <= q.options.length) {
              choose(Number(key) - 1);
              e.preventDefault();
            } else if (key === 'Enter' && chosen !== null) {
              submit();
              e.preventDefault();
            }
          } else if (key === 'Enter' && modal.onContinue) {
            modal.onContinue();
            e.preventDefault();
          }
        }
      });
    });
  }

  function feedbackBlock(info) {
    return h(
      'div',
      { class: 'feedback ' + (info.correct ? 'is-correct' : 'is-wrong') },
      h('div', { class: 'fb-title' }, info.correct ? 'Jawaban benar!' : 'Jawaban kurang tepat'),
      info.correct && info.points
        ? h('div', { class: 'fb-points' }, '+' + info.points + ' poin' + (info.streak > 1 ? ' · Beruntun ×' + info.streak : ''))
        : null,
      h('p', { class: 'fb-conseq' }, info.text),
      info.bonus ? h('span', { class: 'fb-bonus' }, info.bonus) : null,
      h('div', { class: 'fb-explain' }, h('strong', null, 'Pembahasan'), h('div', { html: info.explanation }))
    );
  }

  function pickTarget(player, candidates) {
    return new Promise(function (resolve) {
      var modal;
      var list = h('div', { class: 'target-list' });
      candidates.forEach(function (c) {
        list.appendChild(
          h(
            'button',
            {
              class: 'target-btn',
              type: 'button',
              style: '--pc:' + c.color,
              on: {
                click: function () {
                  modal.close();
                  resolve(c);
                }
              }
            },
            h('span', { class: 'pawn-dot' }, String(c.id + 1)),
            h('span', { class: 't-info' }, h('strong', null, c.name), h('small', null, 'Kotak ' + c.pos)),
            h('span', { class: 't-swap' }, player.pos + ' ⇄ ' + c.pos)
          )
        );
      });

      var content = h(
        'div',
        null,
        h('h3', null, 'Kartu Tukar'),
        h(
          'p',
          { class: 'modal-text' },
          'Pilih pemain yang posisinya ingin kamu tukar. Kamu harus menjawab satu soal tingkat sedang/sulit dengan benar.'
        ),
        list,
        h(
          'div',
          { class: 'modal-actions' },
          h(
            'button',
            {
              class: 'btn btn-ghost',
              type: 'button',
              on: {
                click: function () {
                  modal.close();
                  resolve(null);
                }
              }
            },
            'Batal'
          )
        )
      );
      modal = openModal(content, { className: 'modal-narrow' });
    });
  }

  function showWinner(ranking) {
    var winner = ranking[0];
    var modal;
    var content = h(
      'div',
      { class: 'winner' },
      h('div', { class: 'trophy', html: ICON.trophy }),
      h('h3', null, 'Selamat, ' + winner.name + '!'),
      h('p', { class: 'modal-text' }, 'Mencapai finis lebih dulu dengan total ' + winner.score + ' poin.'),
      h('div', { class: 'rank-table' }, rankTable(ranking, true)),
      h(
        'div',
        { class: 'modal-actions', style: 'justify-content:center' },
        h(
          'button',
          {
            class: 'btn btn-ghost',
            type: 'button',
            on: {
              click: function () {
                modal.close();
                activeTab = 'history';
                renderTabs();
              }
            }
          },
          'Lihat Riwayat'
        ),
        h(
          'button',
          {
            class: 'btn btn-soft',
            type: 'button',
            on: {
              click: function () {
                modal.close();
                backToMenu();
              }
            }
          },
          'Menu Utama'
        ),
        h(
          'button',
          {
            class: 'btn btn-primary',
            type: 'button',
            on: {
              click: function () {
                modal.close();
                startGame();
              }
            }
          },
          'Main Lagi'
        )
      )
    );
    modal = openModal(content, { dismissible: true });
  }

  function showRules() {
    var modal;
    var rules = [
      ['Kartu Angka', 'Setiap giliran, pilih 1 kartu angka (1–6) untuk melangkah maju sebanyak nilainya. Setelah dipakai, kartu baru dibagikan. Finis harus ditempuh dengan langkah yang tepat.'],
      ['Soal di Setiap Kotak', 'Setelah mendarat, kamu menjawab soal sesuai warna kotak: ● Mudah (a, r, Uₙ), ◆ Sedang (Sₙ, dua suku acak), ▲ Sulit (S∞, soal cerita).'],
      ['Jawaban Salah', 'Kamu mundur 1–2 langkah sesuai pengaturan. Jika mendarat di kepala ular lalu salah menjawab, kamu meluncur turun ke ekor ular; jika benar, kamu lolos.'],
      ['Kartu Tukar', 'Pilih 1 pemain target (posisi berbeda) lalu jawab soal sedang/sulit. Benar: posisi tertukar. Salah: giliran hangus.'],
      ['Kartu Tangga', 'Melompat ke tangga terdekat di depanmu. Kamu harus menjawab soal di puncak tangga itu. Benar: naik. Salah: tetap di tempat.'],
      ['Poin & Bonus', 'Benar: +10 (mudah), +20 (sedang), +30 (sulit), ditambah bonus beruntun. Jawaban sulit yang benar saat mendarat dapat memberi kartu spesial tambahan.'],
      ['Menang', 'Pemain pertama yang tiba di kotak finis dan menjawab Soal Final dengan benar adalah pemenangnya. Gagal di soal final berarti mundur.']
    ];
    var grid = h('div', { class: 'rules-grid' });
    rules.forEach(function (r, i) {
      grid.appendChild(
        h('div', { class: 'rule' }, h('span', { class: 'rule-no' }, String(i + 1)), h('div', null, h('strong', null, r[0]), r[1]))
      );
    });
    var content = h(
      'div',
      null,
      h('h3', null, 'Cara Bermain'),
      h('p', { class: 'modal-text' }, 'Tanpa dadu — strategimu ada di kartu dan ketepatan menjawab.'),
      grid,
      h(
        'div',
        { class: 'modal-actions' },
        h(
          'button',
          {
            class: 'btn btn-primary',
            type: 'button',
            on: {
              click: function () {
                modal.close();
              }
            }
          },
          'Mengerti'
        )
      )
    );
    modal = openModal(content, { dismissible: true });
  }

  /* =========================================================
     Antarmuka untuk mesin permainan
     ========================================================= */

  var view = {
    get board() {
      return board;
    },
    refresh: function () {
      renderAll();
    },
    turnChanged: function (p) {
      selected = null;
      dealPending = true;
      board.clearPreview();
      renderAll();
      toast('Giliran ' + p.name, 'info');
    },
    askQuestion: askQuestion,
    pickTarget: pickTarget,
    toast: toast,
    showWinner: showWinner
  };

  /* =========================================================
     Inisialisasi
     ========================================================= */

  function init() {
    bindSegment('#seg-count', 'count', function (v) {
      return Number(v);
    });
    bindSegment('#seg-board', 'boardSize', function (v) {
      return Number(v);
    });
    bindSegment('#seg-penalty', 'penalty');
    renderNameFields();

    $('#btn-start').addEventListener('click', startGame);
    $('#btn-rules').addEventListener('click', showRules);
    $('#brand-link').addEventListener('click', function (e) {
      e.preventDefault();
    });

    $('#btn-menu').addEventListener('click', function () {
      confirmDialog({
        title: 'Kembali ke menu?',
        text: 'Permainan yang sedang berjalan akan dihentikan.',
        okLabel: 'Ke Menu'
      }).then(function (ok) {
        if (ok) backToMenu();
      });
    });

    $('#btn-restart').addEventListener('click', function () {
      confirmDialog({
        title: 'Mulai ulang permainan?',
        text: 'Posisi, skor, dan riwayat saat ini akan diatur ulang.',
        okLabel: 'Mulai Ulang'
      }).then(function (ok) {
        if (ok) startGame();
      });
    });

    $$('.tab').forEach(function (t) {
      t.addEventListener('click', function () {
        activeTab = t.dataset.tab;
        if (game) renderTabs();
      });
    });
  }

  GG.UI = {
    init: init,
    view: view,
    get game() {
      return game;
    }
  };
})();
