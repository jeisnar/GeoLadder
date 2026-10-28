(function () {
  'use strict';

  var GG = (window.GG = window.GG || {});
  var shuffle = GG.utils.shuffle;
  var pick = GG.utils.pick;
  var storage = GG.utils.storage;

  var CACHE_KEY = GG.CONFIG.questionStoreKey;
  var LEVELS = ['easy', 'medium', 'hard'];
  var TAG = /<(\/?)([a-z][a-z0-9]*)\b[^>]*>/gi;

  var bank = [];
  var rev = 0;
  var source = 'default'; /* default | cache | cloud */
  var used = { easy: {}, medium: {}, hard: {} };
  var status = { state: 'local', detail: '' };
  var listeners = { change: [], status: [] };
  var queue = Promise.resolve();
  var bootPromise = null;
  var stopRealtime = null;

  /* ---------- Util ---------- */

  function emit(name) {
    listeners[name].slice().forEach(function (fn) {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    });
  }

  function setStatus(state, detail) {
    status = { state: state, detail: detail || '' };
    emit('status');
  }

  function sanitize(s) {
    return String(s == null ? '' : s).replace(TAG, function (m, slash, tag) {
      tag = tag.toLowerCase();
      return /^(b|i|sub|sup|br)$/.test(tag) ? '<' + slash + tag + '>' : '';
    });
  }

  function toArray(v) {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') {
      return Object.keys(v).map(function (k) {
        return v[k];
      });
    }
    return null;
  }

  function normalize(q) {
    var opts = q ? toArray(q.options) : null;
    if (!q || LEVELS.indexOf(q.level) < 0 || !opts || opts.length !== 4) return null;
    return {
      id: String(q.id || ''),
      level: q.level,
      text: sanitize(q.text).trim(),
      options: opts.map(function (o) {
        return sanitize(o).trim();
      }),
      answer: Number(q.answer),
      explanation: sanitize(q.explanation).trim()
    };
  }

  function validate(q) {
    if (!q.text) return 'Teks soal wajib diisi.';
    if (
      q.options.some(function (o) {
        return !o;
      })
    )
      return 'Keempat pilihan jawaban wajib diisi.';
    if (new Set(q.options).size < 4) return 'Pilihan jawaban tidak boleh sama.';
    if (!(q.answer >= 0 && q.answer < 4)) return 'Pilih satu jawaban yang benar.';
    if (!q.explanation) return 'Pembahasan wajib diisi.';
    return '';
  }

  /* Salinan segar dari cadangan master (DEFAULT_QUESTIONS tidak pernah berubah). */
  function defaults() {
    return GG.DEFAULT_QUESTIONS.map(function (q) {
      return normalize(JSON.parse(JSON.stringify(q)));
    });
  }

  function ensureLevels(list) {
    LEVELS.forEach(function (lvl) {
      var has = list.some(function (q) {
        return q.level === lvl;
      });
      if (!has) {
        defaults().forEach(function (d) {
          if (d.level === lvl) list.push(d);
        });
      }
    });
    return list;
  }

  /* Terima dokumen cloud/cache: { rev, questions } atau array murni. Kembalikan null bila tak valid. */
  function parseDoc(raw) {
    if (!raw) return null;
    var list = toArray(Array.isArray(raw) ? raw : raw.questions);
    if (!list) return null;
    var out = [];
    var seen = {};
    list.forEach(function (r) {
      var q = normalize(r);
      if (q && q.id && !seen[q.id] && !validate(q)) {
        seen[q.id] = true;
        out.push(q);
      }
    });
    if (!out.length) return null;
    return { rev: Number(raw.rev) || 0, questions: ensureLevels(out) };
  }

  function cacheSave() {
    storage.set(CACHE_KEY, { rev: rev, questions: bank });
  }

  function apply(doc, src) {
    bank = doc.questions;
    rev = doc.rev;
    source = src;
    cacheSave();
    emit('change');
  }

  /* ---------- Sinkronisasi ---------- */

  function push() {
    if (!GG.Cloud.configured()) {
      setStatus('local', 'Tersimpan di perangkat ini (cloud belum dikonfigurasi)');
      return Promise.resolve(false);
    }
    setStatus('syncing', 'Menyimpan ke cloud…');
    queue = queue.then(function () {
      return GG.Cloud.save({ rev: rev, updatedAt: new Date().toISOString(), questions: bank }).then(
        function () {
          setStatus('online', 'Tersinkron dengan cloud');
          return true;
        },
        function (e) {
          setStatus('error', 'Gagal ke cloud: ' + e.message + '. Perubahan tetap tersimpan di perangkat ini.');
          return false;
        }
      );
    });
    return queue;
  }

  function commit() {
    rev = Math.max(Date.now(), rev + 1);
    cacheSave();
    emit('change');
    return push();
  }

  function startRealtime() {
    if (stopRealtime || !GG.Cloud.configured()) return;
    stopRealtime = GG.Cloud.subscribe(
      function (raw) {
        var doc = parseDoc(raw);
        if (doc && doc.rev > rev) {
          apply(doc, 'cloud');
          setStatus('online', 'Soal diperbarui dari cloud');
        }
      },
      function (state) {
        if (status.state === 'syncing') return;
        if (state === 'online') setStatus('online', 'Terhubung ke cloud');
        else setStatus('offline', 'Tidak terhubung · memakai soal tersimpan');
      }
    );
  }

  /* Muat awal: cache lokal / DEFAULT_QUESTIONS dulu, lalu coba unduh dari cloud. Tidak pernah menolak. */
  function boot() {
    if (bootPromise) return bootPromise;
    var cached = parseDoc(storage.get(CACHE_KEY, null));
    if (cached) {
      bank = cached.questions;
      rev = cached.rev;
      source = 'cache';
    } else {
      bank = defaults();
      rev = 0;
      source = 'default';
    }

    if (!GG.Cloud.configured()) {
      setStatus('local', 'Cloud belum dikonfigurasi · soal tersimpan di perangkat ini');
      bootPromise = Promise.resolve({ source: source });
      return bootPromise;
    }

    setStatus('loading', 'Mengunduh soal terbaru…');
    bootPromise = GG.Cloud.load().then(
      function (raw) {
        var doc = parseDoc(raw);
        if (doc) {
          apply(doc, 'cloud');
          setStatus('online', 'Terhubung ke cloud');
        } else {
          setStatus('online', 'Cloud masih kosong · memakai soal ' + (source === 'default' ? 'bawaan' : 'tersimpan'));
        }
        startRealtime();
        return { source: source };
      },
      function (e) {
        setStatus('offline', e.message + ' · memakai soal ' + (source === 'default' ? 'bawaan' : 'tersimpan'));
        startRealtime(); /* tetap mencoba tersambung kembali di latar belakang */
        return { source: source };
      }
    );
    return bootPromise;
  }

  /* ---------- Bank soal ---------- */

  function pool(level) {
    return bank.filter(function (q) {
      return q.level === level;
    });
  }

  function newId() {
    return 'Q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }

  function prepare(q) {
    var order = shuffle(
      q.options.map(function (_, i) {
        return i;
      })
    );
    return {
      id: q.id,
      level: q.level,
      text: q.text,
      options: order.map(function (i) {
        return q.options[i];
      }),
      answerIndex: order.indexOf(q.answer),
      explanation: q.explanation
    };
  }

  function indexOf(id) {
    return bank.findIndex(function (q) {
      return q.id === id;
    });
  }

  bank = defaults(); /* aman dipakai walau boot() belum selesai */

  GG.QuestionBank = {
    sanitize: sanitize,
    boot: boot,

    get status() {
      return status;
    },
    get source() {
      return source;
    },

    on: function (name, fn) {
      listeners[name].push(fn);
      return function () {
        listeners[name] = listeners[name].filter(function (f) {
          return f !== fn;
        });
      };
    },

    whenSynced: function () {
      return queue;
    },

    /* Ambil ulang dari cloud sekarang juga (tombol "Sinkronkan" guru). */
    refresh: function () {
      return GG.Cloud.load().then(
        function (raw) {
          var doc = parseDoc(raw);
          if (doc) {
            apply(doc, 'cloud');
            setStatus('online', 'Soal diperbarui dari cloud');
            return true;
          }
          setStatus('online', 'Cloud masih kosong');
          return false;
        },
        function (e) {
          setStatus('offline', e.message);
          return false;
        }
      );
    },

    count: function (level) {
      return level ? pool(level).length : bank.length;
    },

    list: function (level) {
      return JSON.parse(JSON.stringify(pool(level)));
    },

    add: function (data) {
      var q = normalize(Object.assign({}, data, { id: 'x' }));
      if (!q) return 'Data soal tidak valid.';
      var err = validate(q);
      if (err) return err;
      q.id = newId();
      bank.push(q);
      commit();
      return '';
    },

    update: function (id, data) {
      var idx = indexOf(id);
      if (idx < 0) return 'Soal tidak ditemukan.';
      var q = normalize(Object.assign({}, data, { id: id }));
      if (!q) return 'Data soal tidak valid.';
      var err = validate(q);
      if (err) return err;
      if (q.level !== bank[idx].level && pool(bank[idx].level).length <= 1) {
        return 'Setiap tingkat harus memiliki minimal 1 soal.';
      }
      bank[idx] = q;
      commit();
      return '';
    },

    remove: function (id) {
      var idx = indexOf(id);
      if (idx < 0) return 'Soal tidak ditemukan.';
      if (pool(bank[idx].level).length <= 1) return 'Setiap tingkat harus memiliki minimal 1 soal.';
      bank.splice(idx, 1);
      commit();
      return '';
    },

    /* Kembalikan ke DEFAULT_QUESTIONS dan TIMPA bank soal di cloud. Resolves true bila cloud ikut terbarui. */
    resetDefaults: function () {
      bank = defaults();
      used = { easy: {}, medium: {}, hard: {} };
      source = 'default';
      return commit();
    },

    reset: function () {
      used = { easy: {}, medium: {}, hard: {} };
    },

    next: function (level) {
      var all = pool(level);
      if (!all.length) all = bank.slice();
      var fresh = all.filter(function (q) {
        return !used[level][q.id];
      });
      if (!fresh.length) {
        used[level] = {};
        fresh = all;
      }
      var q = pick(fresh);
      used[level][q.id] = true;
      return prepare(q);
    }
  };
})();
