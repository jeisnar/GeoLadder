(function () {
  'use strict';

  var GG = (window.GG = window.GG || {});
  var C = GG.CONFIG.cloud || { provider: 'none' };
  var WRITE_KEY = 'geoladder:writekey:v1'; /* hanya tersimpan di perangkat guru */

  function writeKey() {
    return GG.utils.storage.get(WRITE_KEY, '') || '';
  }

  /* fetch dengan batas waktu + pesan galat yang ramah */
  function request(url, opts) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, C.timeoutMs || 6000) : null;
    opts = Object.assign({ cache: 'no-store' }, opts || {});
    if (ctrl) opts.signal = ctrl.signal;

    return fetch(url, opts).then(
      function (res) {
        if (timer) clearTimeout(timer);
        if (!res.ok) {
          var msg = res.status === 401 || res.status === 403 ? 'Akses ditolak (periksa kunci tulis)' : 'Server membalas ' + res.status;
          throw new Error(msg);
        }
        return res.text().then(function (t) {
          return t ? JSON.parse(t) : null;
        });
      },
      function (err) {
        if (timer) clearTimeout(timer);
        throw new Error(err && err.name === 'AbortError' ? 'Waktu habis' : 'Tidak ada koneksi');
      }
    );
  }

  /* ---------- Firebase Realtime Database (REST + Server-Sent Events) ---------- */
  var firebase = {
    ready: function () {
      return !!(C.firebase && C.firebase.databaseURL);
    },
    url: function (withAuth) {
      var base = C.firebase.databaseURL.replace(/\/+$/, '');
      var path = (C.firebase.path || 'geoladder/questionBank').replace(/^\/+|\/+$/g, '');
      var auth = withAuth && writeKey() ? '?auth=' + encodeURIComponent(writeKey()) : '';
      return base + '/' + path + '.json' + auth;
    },
    load: function () {
      return request(firebase.url(false));
    },
    save: function (doc) {
      return request(firebase.url(true), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      });
    },
    stream: function (onPing, onState) {
      if (typeof EventSource !== 'function') return null;
      var es = new EventSource(firebase.url(false));
      es.addEventListener('put', onPing);
      es.addEventListener('patch', onPing);
      es.onopen = function () { onState('online'); };
      es.onerror = function () { onState('offline'); };
      return function () { es.close(); };
    }
  };

  /* ---------- JSONBin.io (polling) ---------- */
  var jsonbin = {
    ready: function () {
      return !!(C.jsonbin && C.jsonbin.binId);
    },
    base: function () {
      return 'https://api.jsonbin.io/v3/b/' + C.jsonbin.binId;
    },
    load: function () {
      var headers = { 'X-Bin-Meta': 'false' };
      if (C.jsonbin.accessKey) headers['X-Access-Key'] = C.jsonbin.accessKey;
      return request(jsonbin.base() + '/latest', { headers: headers }).then(function (r) {
        return r && r.record ? r.record : r;
      });
    },
    save: function (doc) {
      if (!writeKey()) return Promise.reject(new Error('Kunci tulis belum diisi'));
      return request(jsonbin.base(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': writeKey() },
        body: JSON.stringify(doc)
      });
    }
  };

  function adapter() {
    if (C.provider === 'firebase' && firebase.ready()) return firebase;
    if (C.provider === 'jsonbin' && jsonbin.ready()) return jsonbin;
    return null;
  }

  GG.Cloud = {
    configured: function () {
      return !!adapter();
    },
    provider: function () {
      return adapter() ? C.provider : 'none';
    },
    hasWriteKey: function () {
      return !!writeKey();
    },
    setWriteKey: function (k) {
      GG.utils.storage.set(WRITE_KEY, String(k || '').trim());
    },
    load: function () {
      var a = adapter();
      return a ? a.load() : Promise.reject(new Error('Cloud belum dikonfigurasi'));
    },
    save: function (doc) {
      var a = adapter();
      return a ? a.save(doc) : Promise.reject(new Error('Cloud belum dikonfigurasi'));
    },

    /* Real-time: SSE (Firebase) atau polling berkala (JSONBin / tanpa EventSource). */
    subscribe: function (onDoc, onState) {
      var a = adapter();
      if (!a) return function () {};
      var stopStream = null;
      var poll = null;
      var debounce = null;

      function pull() {
        a.load().then(
          function (doc) {
            onState('online');
            onDoc(doc);
          },
          function () {
            onState('offline');
          }
        );
      }
      function ping() {
        clearTimeout(debounce);
        debounce = setTimeout(pull, 300);
      }
      function onVisible() {
        if (!document.hidden) ping();
      }

      if (a.stream) {
        stopStream = a.stream(ping, function (s) {
          onState(s);
          if (s === 'online') ping();
        });
      }
      if (!stopStream) poll = setInterval(pull, C.pollMs || 30000);

      window.addEventListener('online', ping);
      document.addEventListener('visibilitychange', onVisible);

      return function () {
        if (stopStream) stopStream();
        if (poll) clearInterval(poll);
        clearTimeout(debounce);
        window.removeEventListener('online', ping);
        document.removeEventListener('visibilitychange', onVisible);
      };
    }
  };
})();
