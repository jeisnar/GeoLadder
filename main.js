(function () {
  'use strict';

  var GG = window.GG;

  try {
    var speed = parseFloat(new URLSearchParams(window.location.search).get('speed'));
    if (speed > 0 && speed <= 4) GG.CONFIG.speed = speed;
  } catch (e) {
    /* abaikan */
  }

  function boot() {
    GG.UI.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
