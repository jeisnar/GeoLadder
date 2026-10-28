(function () {
  'use strict';

  var GG = window.GG;

  try {
    var speed = parseFloat(new URLSearchParams(window.location.search).get('speed'));
    if (speed > 0 && speed <= 4) GG.CONFIG.speed = speed;
  } catch (e) {
    /* abaikan */
  }

  function hideLoader(screen) {
    screen.classList.add('is-done');
    setTimeout(function () {
      if (screen.parentNode) screen.parentNode.removeChild(screen);
    }, 450);
  }

  function boot() {
    GG.Background.init();
    GG.Audio.init();
    GG.UI.init();
    GG.Teacher.init();

    var screen = document.getElementById('boot-screen');
    var msg = document.getElementById('boot-msg');
    var slow = setTimeout(function () {
      if (msg) msg.textContent = 'Menghubungi server soal…';
    }, 1800);
    var guard = new Promise(function (resolve) {
      setTimeout(resolve, (GG.CONFIG.cloud.timeoutMs || 6000) + 1500);
    });

    /* boot() tidak pernah menolak; guard menjamin layar tidak menggantung. */
    Promise.race([GG.QuestionBank.boot(), guard]).then(function () {
      clearTimeout(slow);
      if (screen) hideLoader(screen);
      if (GG.Cloud.configured() && GG.QuestionBank.status.state !== 'online') {
        GG.UI.toast('Mode offline: memakai soal yang tersimpan di perangkat.', 'warn');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
