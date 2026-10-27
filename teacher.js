(function () {
  'use strict';

  var GG = (window.GG = window.GG || {});
  var h = GG.utils.h;
  var QB = GG.QuestionBank;
  var LV = GG.CONFIG.levels;
  var LEVELS = ['easy', 'medium', 'hard'];
  var KEYS = 'ABCD';

  var unlocked = false;
  var panel = null;
  var host = null;
  var state = { level: 'easy', editing: null };

  function $(s) {
    return document.querySelector(s);
  }

  function plain(html) {
    var d = document.createElement('div');
    d.innerHTML = QB.sanitize(html);
    return d.textContent;
  }

  function syncBadge() {
    var badge = $('#mode-badge');
    var btn = $('#btn-teacher');
    if (badge) {
      badge.textContent = unlocked ? 'Mode Guru' : 'Mode Murid';
      badge.classList.toggle('is-teacher', unlocked);
    }
    if (btn) btn.textContent = unlocked ? 'Panel Guru' : 'Mode Guru';
  }

  function open() {
    if (unlocked) showPanel();
    else askPin();
  }

  /* ---------- PIN ---------- */

  function askPin() {
    var modal;
    var err = h('p', { class: 'pin-error', role: 'alert' });
    var input = h('input', {
      type: 'password',
      class: 'input pin-input',
      inputmode: 'numeric',
      maxlength: '8',
      autocomplete: 'off',
      placeholder: 'PIN',
      'aria-label': 'PIN guru'
    });

    function submit() {
      if (input.value === GG.CONFIG.teacherPin) {
        unlocked = true;
        modal.close();
        syncBadge();
        showPanel();
      } else {
        err.textContent = 'PIN salah. Coba lagi.';
        input.value = '';
        input.focus();
      }
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });

    modal = GG.UI.openModal(
      h(
        'div',
        null,
        h('h3', null, 'Masuk Mode Guru'),
        h('p', { class: 'modal-text' }, 'Masukkan PIN untuk mengelola bank soal.'),
        input,
        err,
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn btn-ghost', type: 'button', on: { click: function () { modal.close(); } } }, 'Batal'),
          h('button', { class: 'btn btn-primary', type: 'button', on: { click: submit } }, 'Masuk')
        )
      ),
      { className: 'modal-narrow', dismissible: true }
    );
    setTimeout(function () {
      input.focus();
    }, 80);
  }

  /* ---------- Panel ---------- */

  function showPanel() {
    state.editing = null;
    host = h('div', { class: 'tp' });
    render();
    panel = GG.UI.openModal(host, { className: 'modal-wide', dismissible: false });
  }

  function closePanel() {
    if (panel) panel.close();
    panel = null;
    host = null;
  }

  function render() {
    if (!host) return;
    host.innerHTML = '';
    host.appendChild(header());
    host.appendChild(levelTabs());
    host.appendChild(state.editing ? form() : list());
  }

  function header() {
    return h(
      'div',
      { class: 'tp-head' },
      h(
        'div',
        null,
        h('h3', null, 'Panel Guru · Bank Soal'),
        h('p', { class: 'modal-text' }, 'Perubahan tersimpan di perangkat ini dan langsung dipakai pada soal berikutnya.')
      ),
      h(
        'div',
        { class: 'tp-head-actions' },
        h(
          'button',
          {
            class: 'btn btn-ghost btn-sm',
            type: 'button',
            on: {
              click: function () {
                unlocked = false;
                closePanel();
                syncBadge();
                GG.UI.toast('Keluar dari Mode Guru', 'info');
              }
            }
          },
          'Keluar Mode Guru'
        ),
        h('button', { class: 'btn btn-primary btn-sm', type: 'button', on: { click: closePanel } }, 'Tutup')
      )
    );
  }

  function levelTabs() {
    var wrap = h('div', { class: 'tt-tabs', role: 'tablist' });
    LEVELS.forEach(function (lvl) {
      wrap.appendChild(
        h(
          'button',
          {
            class: 'tt-tab lv-' + lvl + (state.level === lvl ? ' is-active' : ''),
            type: 'button',
            role: 'tab',
            'aria-selected': state.level === lvl ? 'true' : 'false',
            on: {
              click: function () {
                state.level = lvl;
                state.editing = null;
                render();
              }
            }
          },
          LV[lvl].symbol + ' ' + LV[lvl].label + ' (' + QB.count(lvl) + ')'
        )
      );
    });
    return wrap;
  }

  function list() {
    var wrap = h('div');
    wrap.appendChild(
      h(
        'div',
        { class: 'tp-toolbar' },
        h(
          'button',
          {
            class: 'btn btn-primary btn-sm',
            type: 'button',
            on: {
              click: function () {
                state.editing = { id: null, level: state.level, text: '', options: ['', '', '', ''], answer: 0, explanation: '' };
                render();
              }
            }
          },
          '+ Tambah Soal ' + LV[state.level].label
        ),
        h(
          'button',
          {
            class: 'btn btn-ghost btn-sm',
            type: 'button',
            on: {
              click: function () {
                GG.UI.confirmDialog({
                  title: 'Pulihkan soal bawaan?',
                  text: 'Semua soal buatan/perubahan guru akan diganti dengan bank soal bawaan.',
                  okLabel: 'Pulihkan'
                }).then(function (ok) {
                  if (!ok) return;
                  QB.resetDefaults();
                  GG.UI.toast('Bank soal dipulihkan', 'info');
                  render();
                });
              }
            }
          },
          'Pulihkan Soal Bawaan'
        )
      )
    );

    QB.list(state.level).forEach(function (q, i) {
      wrap.appendChild(
        h(
          'div',
          { class: 'q-item' },
          h('span', { class: 'q-no' }, String(i + 1)),
          h(
            'div',
            { class: 'q-body' },
            h('div', { class: 'q-prev', html: QB.sanitize(q.text) }),
            h('small', null, 'Kunci: ' + KEYS[q.answer] + '. ' + plain(q.options[q.answer]))
          ),
          h(
            'div',
            { class: 'q-btns' },
            h(
              'button',
              {
                class: 'btn btn-soft btn-sm',
                type: 'button',
                on: {
                  click: function () {
                    state.editing = JSON.parse(JSON.stringify(q));
                    render();
                  }
                }
              },
              'Edit'
            ),
            h(
              'button',
              {
                class: 'btn btn-ghost btn-sm btn-del',
                type: 'button',
                on: {
                  click: function () {
                    GG.UI.confirmDialog({ title: 'Hapus soal ini?', text: plain(q.text).slice(0, 120), okLabel: 'Hapus' }).then(function (ok) {
                      if (!ok) return;
                      var msg = QB.remove(q.id);
                      if (msg) GG.UI.toast(msg, 'warn');
                      else GG.UI.toast('Soal dihapus', 'info');
                      render();
                    });
                  }
                }
              },
              'Hapus'
            )
          )
        )
      );
    });
    return wrap;
  }

  function form() {
    var q = state.editing;
    var focused = null;
    var inputs = [];

    function field(el) {
      inputs.push(el);
      el.addEventListener('focus', function () {
        focused = el;
      });
      el.addEventListener('input', updatePreview);
      return el;
    }

    var sel = h(
      'select',
      { class: 'input', 'aria-label': 'Tingkat kesulitan' },
      LEVELS.map(function (l) {
        return h('option', { value: l, selected: l === q.level }, LV[l].label);
      })
    );

    var text = field(h('textarea', { class: 'input tt-area', rows: '3', 'aria-label': 'Teks soal', placeholder: 'Tulis soal di sini…' }));
    text.value = q.text;
    focused = text;

    var radios = [];
    var optRows = h('div', { class: 'tt-opts' });
    q.options.forEach(function (o, i) {
      var r = h('input', { type: 'radio', name: 'correct', value: String(i), 'aria-label': 'Jawaban benar ' + KEYS[i] });
      r.checked = i === q.answer;
      radios.push(r);
      var t = field(h('input', { type: 'text', class: 'input', 'aria-label': 'Pilihan ' + KEYS[i], placeholder: 'Pilihan ' + KEYS[i] }));
      t.value = o;
      optRows.appendChild(h('label', { class: 'tt-opt' }, r, h('b', null, KEYS[i]), t));
    });

    var expl = field(h('textarea', { class: 'input tt-area', rows: '3', 'aria-label': 'Pembahasan', placeholder: 'Pembahasan langkah demi langkah…' }));
    expl.value = q.explanation;

    var preview = h('div', { class: 'tt-preview', 'aria-live': 'polite' });
    var errBox = h('p', { class: 'pin-error', role: 'alert' });

    function wrapSel(tag) {
      var ta = focused || text;
      var s = ta.selectionStart;
      var e = ta.selectionEnd;
      var v = ta.value;
      ta.value = v.slice(0, s) + '<' + tag + '>' + v.slice(s, e) + '</' + tag + '>' + v.slice(e);
      ta.focus();
      ta.setSelectionRange(s + tag.length + 2, e + tag.length + 2);
      updatePreview();
    }

    function tool(label, tag, title) {
      return h(
        'button',
        {
          class: 'tt-tool',
          type: 'button',
          title: title,
          'aria-label': title,
          on: {
            mousedown: function (e) {
              e.preventDefault();
            },
            click: function () {
              wrapSel(tag);
            }
          }
        },
        label
      );
    }

    function updatePreview() {
      var li = inputs
        .slice(1, 5)
        .map(function (el, i) {
          return '<li' + (radios[i].checked ? ' class="is-key"' : '') + '>' + KEYS[i] + '. ' + QB.sanitize(el.value) + '</li>';
        })
        .join('');
      preview.innerHTML =
        '<div class="tt-prev-q">' + QB.sanitize(text.value) + '</div><ul>' + li + '</ul>' +
        '<div class="tt-prev-e"><b>Pembahasan:</b> ' + QB.sanitize(expl.value) + '</div>';
    }
    radios.forEach(function (r) {
      r.addEventListener('change', updatePreview);
    });

    function save() {
      var answer = -1;
      radios.forEach(function (r, i) {
        if (r.checked) answer = i;
      });
      var data = {
        level: sel.value,
        text: text.value,
        options: inputs.slice(1, 5).map(function (el) {
          return el.value;
        }),
        answer: answer,
        explanation: expl.value
      };
      var msg = q.id ? QB.update(q.id, data) : QB.add(data);
      if (msg) {
        errBox.textContent = msg;
        return;
      }
      state.level = data.level;
      state.editing = null;
      GG.UI.toast('Soal disimpan', 'good');
      render();
    }

    updatePreview();

    return h(
      'div',
      { class: 'tt-form' },
      h('h4', null, q.id ? 'Edit Soal' : 'Soal Baru'),
      h('label', { class: 'tt-label' }, 'Tingkat kesulitan', sel),
      h(
        'div',
        { class: 'tt-tools' },
        h('span', { class: 'tt-label' }, 'Format teks terpilih:'),
        tool('x₂', 'sub', 'Subskrip (Uₙ)'),
        tool('x²', 'sup', 'Pangkat (r²)'),
        tool('B', 'b', 'Tebal'),
        tool('I', 'i', 'Miring')
      ),
      h('label', { class: 'tt-label' }, 'Teks soal', text),
      h('div', { class: 'tt-label' }, 'Pilihan jawaban (pilih bulatan di kiri untuk kunci)'),
      optRows,
      h('label', { class: 'tt-label' }, 'Pembahasan (tampil setelah siswa menjawab)', expl),
      h('small', { class: 'tt-hint' }, 'Tag yang diizinkan: b, i, sub, sup, br. Untuk tanda “<” ketik &lt; dan untuk “>” ketik &gt;.'),
      h('div', { class: 'tt-label' }, 'Pratinjau'),
      preview,
      errBox,
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
                state.editing = null;
                render();
              }
            }
          },
          'Batal'
        ),
        h('button', { class: 'btn btn-primary', type: 'button', on: { click: save } }, 'Simpan Soal')
      )
    );
  }

  function init() {
    var btn = $('#btn-teacher');
    if (btn) btn.addEventListener('click', open);
    syncBadge();
  }

  GG.Teacher = {
    init: init,
    get unlocked() {
      return unlocked;
    }
  };
})();
