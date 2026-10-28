(function () {
  'use strict';

  var GG = (window.GG = window.GG || {});

  GG.CONFIG = {
    speed: 1,
    handSize: 5,
    maxSpecial: 3,
    startSwap: 1,
    startLadder: 1,
    minPlayers: 2,
    maxPlayers: 4,
    teacherPin: '1234',
    questionStoreKey: 'geoladder:questions:v3',

    /* Cloud bank soal. provider: 'firebase' | 'jsonbin' | 'none' (lihat README.md) */
    cloud: {
      provider: 'none',
      timeoutMs: 6000,
      pollMs: 30000,
      firebase: { databaseURL: '', path: 'geoladder/questionBank' },
      jsonbin: { binId: '', accessKey: '' }
    },

    points: {
      easy: 10,
      medium: 20,
      hard: 30,
      finish: 50,
      streakBonus: 5,
      streakMax: 15
    },

    levels: {
      easy: { key: 'easy', label: 'Mudah', symbol: '●', desc: 'Konsep dasar: a, r, dan Uₙ' },
      medium: { key: 'medium', label: 'Sedang', symbol: '◆', desc: 'Sₙ dan dua suku acak' },
      hard: { key: 'hard', label: 'Sulit', symbol: '▲', desc: 'S∞ dan soal cerita' }
    },

    playerColors: ['#4f7cac', '#cf7a62', '#4f9a7f', '#8a70b0'],
    defaultNames: ['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4'],

    snakeColors: ['#c98585', '#93a56f', '#b8906a', '#7f94b8', '#a88cb8'],

    boards: {
      36: {
        size: 36,
        cols: 6,
        rows: 6,
        label: '6 × 6',
        ladders: [
          { from: 3, to: 13, level: 'medium' },
          { from: 8, to: 20, level: 'hard' },
          { from: 16, to: 29, level: 'medium' },
          { from: 22, to: 32, level: 'hard' }
        ],
        snakes: [
          { from: 17, to: 6, level: 'medium' },
          { from: 24, to: 11, level: 'hard' },
          { from: 31, to: 19, level: 'medium' },
          { from: 34, to: 25, level: 'hard' }
        ]
      },
      100: {
        size: 100,
        cols: 10,
        rows: 10,
        label: '10 × 10',
        ladders: [
          { from: 3, to: 22, level: 'medium' },
          { from: 8, to: 30, level: 'hard' },
          { from: 15, to: 37, level: 'medium' },
          { from: 28, to: 51, level: 'hard' },
          { from: 41, to: 63, level: 'medium' },
          { from: 55, to: 76, level: 'hard' },
          { from: 71, to: 92, level: 'medium' }
        ],
        snakes: [
          { from: 16, to: 6, level: 'medium' },
          { from: 33, to: 12, level: 'medium' },
          { from: 47, to: 26, level: 'hard' },
          { from: 62, to: 19, level: 'hard' },
          { from: 66, to: 45, level: 'medium' },
          { from: 79, to: 58, level: 'hard' },
          { from: 88, to: 67, level: 'medium' },
          { from: 94, to: 73, level: 'hard' },
          { from: 98, to: 80, level: 'hard' }
        ]
      }
    }
  };
})();
