(function () {
  'use strict';

  var GG = (window.GG = window.GG || {});
  var h = GG.utils.h;
  var KEY = 'geoladder:muted:v1';

  var ctx = null;
  var master = null;
  var bgmGain = null;
  var sfxGain = null;
  var noiseBuf = null;
  var muted = !!GG.utils.storage.get(KEY, false);
  var unlocked = false;
  var bgmOn = false;
  var bgmTimer = null;
  var bar = 0;
  var nextT = 0;
  var btn = null;

  var BEAT = 60 / 74;
  var CHORDS = [
    [53, 57, 60, 64], /* Fmaj7 */
    [52, 55, 59, 62], /* Em7 */
    [50, 53, 57, 60], /* Dm7 */
    [48, 52, 55, 59] /* Cmaj7 */
  ];
  var SCALE = [72, 74, 76, 79, 81, 84];

  var ICON_ON =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var ICON_OFF =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="m16 9 5 6M21 9l-5 6"/></svg>';

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.15;
    bgmGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(master);
    return ctx;
  }

  function hz(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  function tone(o) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    var t = o.t;
    var vol = o.vol || 0.3;
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    if (o.lp) {
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      osc.connect(f);
      f.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(o.dest || sfxGain);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  function hat(t, vol) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = ctx.createBufferSource();
    var f = ctx.createBiquadFilter();
    var g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = 'highpass';
    f.frequency.value = 7500;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f);
    f.connect(g);
    g.connect(bgmGain);
    s.start(t);
    s.stop(t + 0.1);
  }

  /* ---------- BGM: lo-fi santai, 1 birama dijadwalkan sebelum waktunya ---------- */

  function scheduleBar() {
    var t = nextT;
    var chord = CHORDS[bar % CHORDS.length];
    var len = BEAT * 4;
    var i;

    chord.forEach(function (m) {
      tone({ t: t, f: hz(m), dur: len * 1.02, type: 'triangle', vol: 0.2, attack: 0.5, lp: 900, dest: bgmGain });
    });
    tone({ t: t, f: hz(chord[0] - 12), dur: BEAT * 1.6, type: 'sine', vol: 0.5, attack: 0.03, dest: bgmGain });
    tone({ t: t + BEAT * 2.5, f: hz(chord[0] - 12), dur: BEAT * 1.2, type: 'sine', vol: 0.4, attack: 0.03, dest: bgmGain });

    tone({ t: t, f: 110, to: 42, dur: 0.28, type: 'sine', vol: 0.8, dest: bgmGain });
    tone({ t: t + BEAT * 2, f: 110, to: 42, dur: 0.28, type: 'sine', vol: 0.6, dest: bgmGain });
    for (i = 0; i < 8; i++) hat(t + i * (BEAT / 2) + (i % 2 ? 0.04 : 0), i % 2 ? 0.1 : 0.05);

    var spots = [0, 1.5, 2, 3, 3.5];
    spots.forEach(function (b) {
      if (Math.random() < 0.55) {
        var m = SCALE[Math.floor(Math.random() * SCALE.length)];
        tone({ t: t + b * BEAT, f: hz(m), dur: BEAT * 1.4, type: 'sine', vol: 0.22, attack: 0.02, lp: 2200, dest: bgmGain });
      }
    });

    nextT += len;
    bar += 1;
  }

  function tick() {
    if (!bgmOn || !ctx) return;
    while (nextT < ctx.currentTime + 2.5) scheduleBar();
  }

  function startBgm() {
    if (bgmOn || !ensure()) return;
    bgmOn = true;
    ctx.resume();
    nextT = ctx.currentTime + 0.15;
    tick();
    bgmTimer = setInterval(tick, 700);
  }

  /* ---------- SFX ---------- */

  var SFX = {
    select: function (t) {
      tone({ t: t, f: 660, dur: 0.09, type: 'triangle', vol: 0.3 });
      tone({ t: t + 0.05, f: 880, dur: 0.1, type: 'triangle', vol: 0.25 });
    },
    play: function (t) {
      tone({ t: t, f: 300, to: 760, dur: 0.14, type: 'triangle', vol: 0.28, lp: 2500 });
    },
    step: function (t) {
      tone({ t: t, f: 420, to: 300, dur: 0.09, type: 'sine', vol: 0.32, lp: 1600 });
    },
    correct: function (t) {
      [784, 1047, 1319].forEach(function (f, i) {
        tone({ t: t + i * 0.1, f: f, dur: 0.4, type: 'sine', vol: 0.3, attack: 0.008 });
      });
    },
    wrong: function (t) {
      tone({ t: t, f: 180, to: 110, dur: 0.32, type: 'sawtooth', vol: 0.2, lp: 420 });
      tone({ t: t + 0.13, f: 150, to: 90, dur: 0.36, type: 'sawtooth', vol: 0.18, lp: 380 });
    },
    ladder: function (t) {
      [523, 587, 659, 784, 880, 1047, 1175, 1319].forEach(function (f, i) {
        tone({ t: t + i * 0.085, f: f, dur: 0.22, type: 'sine', vol: 0.26 });
      });
    },
    snake: function (t) {
      tone({ t: t, f: 720, to: 110, dur: 0.9, type: 'triangle', vol: 0.3, lp: 2200 });
      tone({ t: t + 0.05, f: 540, to: 90, dur: 0.85, type: 'sine', vol: 0.2 });
    },
    swap: function (t) {
      tone({ t: t, f: 400, to: 900, dur: 0.24, type: 'sine', vol: 0.28 });
      tone({ t: t + 0.15, f: 900, to: 400, dur: 0.26, type: 'sine', vol: 0.24 });
    },
    win: function (t) {
      [523, 659, 784, 1047].forEach(function (f, i) {
        tone({ t: t + i * 0.14, f: f, dur: 0.5, type: 'triangle', vol: 0.3 });
      });
      [523, 659, 784, 1047].forEach(function (f) {
        tone({ t: t + 0.6, f: f, dur: 1.1, type: 'sine', vol: 0.16, attack: 0.05 });
      });
    }
  };

  function sfx(name) {
    if (muted || !SFX[name] || !ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    try {
      SFX[name](ctx.currentTime + 0.01);
    } catch (e) {
      /* abaikan galat audio */
    }
  }

  /* ---------- Kontrol ---------- */

  function syncBtn() {
    if (!btn) return;
    btn.innerHTML = muted ? ICON_OFF : ICON_ON;
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    btn.setAttribute('aria-label', muted ? 'Aktifkan suara' : 'Matikan suara');
    btn.classList.toggle('is-muted', muted);
  }

  function toggle() {
    muted = !muted;
    GG.utils.storage.set(KEY, muted);
    if (ensure()) {
      master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.04);
      if (!muted) {
        ctx.resume();
        startBgm();
        sfx('select');
      }
    }
    syncBtn();
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
    if (!muted) startBgm();
  }

  function init() {
    btn = h('button', { class: 'audio-btn', type: 'button', on: { click: toggle } });
    document.body.appendChild(btn);
    syncBtn();
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', function () {
      if (!ctx) return;
      if (document.hidden) ctx.suspend();
      else ctx.resume();
    });
  }

  GG.Audio = {
    init: init,
    sfx: sfx,
    toggle: toggle,
    get muted() {
      return muted;
    }
  };
})();
