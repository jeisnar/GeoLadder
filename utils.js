(function () {
  'use strict';

  var GG = (window.GG = window.GG || {});

  function sleep(ms) {
    var scale = GG.CONFIG ? GG.CONFIG.speed : 1;
    return new Promise(function (resolve) {
      setTimeout(resolve, Math.max(0, ms * scale));
    });
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function squareToCell(n, cols, rows) {
    var rowFromBottom = Math.floor((n - 1) / cols);
    var idx = (n - 1) % cols;
    var col = rowFromBottom % 2 === 0 ? idx : cols - 1 - idx;
    return { row: rows - 1 - rowFromBottom, col: col };
  }

  function squareAt(row, col, cols, rows) {
    var rowFromBottom = rows - 1 - row;
    var idx = rowFromBottom % 2 === 0 ? col : cols - 1 - col;
    return rowFromBottom * cols + idx + 1;
  }

  function cellCenter(n, cols, rows) {
    var c = squareToCell(n, cols, rows);
    return { x: ((c.col + 0.5) / cols) * 100, y: ((c.row + 0.5) / rows) * 100 };
  }

  function h(tag, props) {
    var node = document.createElement(tag);
    var children = Array.prototype.slice.call(arguments, 2);

    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v === undefined || v === null || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else if (k === 'on') {
          Object.keys(v).forEach(function (ev) {
            node.addEventListener(ev, v[ev]);
          });
        } else node.setAttribute(k, v === true ? '' : v);
      });
    }

    function append(c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) {
        c.forEach(append);
        return;
      }
      node.appendChild(c && c.nodeType ? c : document.createTextNode(String(c)));
    }
    children.forEach(append);
    return node;
  }

  var storage = {
    get: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* penyimpanan tidak tersedia */
      }
    }
  };

  GG.utils = {
    sleep: sleep,
    randInt: randInt,
    pick: pick,
    shuffle: shuffle,
    clamp: clamp,
    squareToCell: squareToCell,
    squareAt: squareAt,
    cellCenter: cellCenter,
    h: h,
    storage: storage
  };
})();
