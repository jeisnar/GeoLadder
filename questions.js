(function () {
  'use strict';

  var GG = (window.GG = window.GG || {});
  var shuffle = GG.utils.shuffle;
  var pick = GG.utils.pick;

  var RAW = [
    /* ===================== MUDAH ===================== */
    {
      id: 'E01',
      level: 'easy',
      text: 'Perhatikan barisan <b>2, 6, 18, 54, …</b> Rasio (<i>r</i>) barisan geometri tersebut adalah …',
      options: ['2', '3', '4', '6'],
      answer: 1,
      explanation:
        'Rasio = U<sub>2</sub> ÷ U<sub>1</sub> = 6 ÷ 2 = 3. Pengecekan: 18 ÷ 6 = 3 dan 54 ÷ 18 = 3, sehingga rasionya konstan.'
    },
    {
      id: 'E02',
      level: 'easy',
      text: 'Suku ke-5 dari barisan geometri <b>3, 6, 12, …</b> adalah …',
      options: ['24', '36', '48', '96'],
      answer: 2,
      explanation:
        '<i>a</i> = 3 dan <i>r</i> = 6 ÷ 3 = 2. U<sub>n</sub> = a·r<sup>n−1</sup>, sehingga U<sub>5</sub> = 3·2<sup>4</sup> = 3·16 = 48.'
    },
    {
      id: 'E03',
      level: 'easy',
      text: 'Suatu barisan geometri memiliki suku pertama <i>a</i> = 5 dan rasio <i>r</i> = 2. Suku ke-4 barisan tersebut adalah …',
      options: ['20', '30', '40', '80'],
      answer: 2,
      explanation: 'U<sub>4</sub> = a·r<sup>3</sup> = 5·2<sup>3</sup> = 5·8 = 40.'
    },
    {
      id: 'E04',
      level: 'easy',
      text: 'Manakah di antara barisan berikut yang merupakan <b>barisan geometri</b>?',
      options: ['2, 4, 6, 8, …', '1, 3, 9, 27, …', '5, 10, 15, 20, …', '1, 4, 9, 16, …'],
      answer: 1,
      explanation:
        'Barisan geometri memiliki rasio tetap. Pada 1, 3, 9, 27 rasionya selalu 3. Barisan 2, 4, 6, 8 dan 5, 10, 15, 20 memiliki beda tetap (aritmetika), sedangkan 1, 4, 9, 16 adalah bilangan kuadrat.'
    },
    {
      id: 'E05',
      level: 'easy',
      text: 'Suku ke-6 dari barisan <b>1, 2, 4, 8, …</b> adalah …',
      options: ['16', '32', '48', '64'],
      answer: 1,
      explanation: '<i>a</i> = 1 dan <i>r</i> = 2. U<sub>6</sub> = 1·2<sup>5</sup> = 32.'
    },
    {
      id: 'E06',
      level: 'easy',
      text: 'Barisan geometri <b>81, 27, 9, …</b> memiliki rasio …',
      options: ['3', '−3', '1/3', '1/9'],
      answer: 2,
      explanation:
        'r = 27 ÷ 81 = 1/3. Barisan bergerak turun karena 0 &lt; r &lt; 1.'
    },
    {
      id: 'E07',
      level: 'easy',
      text: 'Pada suatu barisan geometri diketahui U<sub>1</sub> = 4 dan U<sub>2</sub> = 12. Nilai U<sub>4</sub> adalah …',
      options: ['48', '72', '108', '144'],
      answer: 2,
      explanation:
        'r = 12 ÷ 4 = 3. U<sub>4</sub> = a·r<sup>3</sup> = 4·3<sup>3</sup> = 4·27 = 108.'
    },
    {
      id: 'E08',
      level: 'easy',
      text: 'Rumus suku ke-<i>n</i> barisan geometri <b>5, 10, 20, 40, …</b> adalah …',
      options: [
        'U<sub>n</sub> = 5·2<sup>n</sup>',
        'U<sub>n</sub> = 5·2<sup>n−1</sup>',
        'U<sub>n</sub> = 2·5<sup>n−1</sup>',
        'U<sub>n</sub> = 5 + 5(n − 1)'
      ],
      answer: 1,
      explanation:
        'a = 5 dan r = 2, sehingga U<sub>n</sub> = a·r<sup>n−1</sup> = 5·2<sup>n−1</sup>. Untuk n = 1 diperoleh 5 dan n = 2 diperoleh 10 (sesuai). Pilihan terakhir adalah rumus barisan aritmetika.'
    },
    {
      id: 'E09',
      level: 'easy',
      text: 'Rasio dari barisan geometri <b>2, −4, 8, −16, …</b> adalah …',
      options: ['−2', '2', '−4', '1/2'],
      answer: 0,
      explanation:
        'r = −4 ÷ 2 = −2. Tanda suku yang berganti-ganti (positif, negatif) menandakan rasio negatif.'
    },

    /* ===================== SEDANG ===================== */
    {
      id: 'M01',
      level: 'medium',
      text: 'Jumlah 5 suku pertama deret geometri <b>2 + 6 + 18 + …</b> adalah …',
      options: ['162', '242', '364', '486'],
      answer: 1,
      explanation:
        'a = 2, r = 3, n = 5. S<sub>n</sub> = a(r<sup>n</sup> − 1)/(r − 1) = 2(3<sup>5</sup> − 1)/(3 − 1) = 2·242/2 = 242. Cek: 2 + 6 + 18 + 54 + 162 = 242.'
    },
    {
      id: 'M02',
      level: 'medium',
      text: 'Jumlah 6 suku pertama deret <b>3 + 6 + 12 + …</b> adalah …',
      options: ['93', '189', '192', '378'],
      answer: 1,
      explanation:
        'a = 3, r = 2. S<sub>6</sub> = 3(2<sup>6</sup> − 1)/(2 − 1) = 3·63 = 189.'
    },
    {
      id: 'M03',
      level: 'medium',
      text: 'Diketahui barisan geometri dengan U<sub>2</sub> = 6 dan U<sub>5</sub> = 162. Suku ke-4 barisan tersebut adalah …',
      options: ['18', '36', '54', '81'],
      answer: 2,
      explanation:
        'U<sub>5</sub> ÷ U<sub>2</sub> = r<sup>3</sup> → 162 ÷ 6 = 27 → r = 3. Maka U<sub>4</sub> = U<sub>2</sub>·r<sup>2</sup> = 6·9 = 54. (Barisannya: 2, 6, 18, 54, 162.)'
    },
    {
      id: 'M04',
      level: 'medium',
      text: 'Pada barisan geometri diketahui U<sub>3</sub> = 12 dan U<sub>6</sub> = 96. Suku pertama (<i>a</i>) barisan tersebut adalah …',
      options: ['2', '3', '4', '6'],
      answer: 1,
      explanation:
        'U<sub>6</sub> ÷ U<sub>3</sub> = r<sup>3</sup> → 96 ÷ 12 = 8 → r = 2. Dari U<sub>3</sub> = a·r<sup>2</sup>: 12 = a·4 → a = 3.'
    },
    {
      id: 'M05',
      level: 'medium',
      text: 'Jumlah 4 suku pertama deret <b>81 + 27 + 9 + …</b> adalah …',
      options: ['117', '120', '121', '130'],
      answer: 1,
      explanation:
        'a = 81, r = 1/3. Karena r &lt; 1: S<sub>n</sub> = a(1 − r<sup>n</sup>)/(1 − r) = 81(1 − 1/81)/(2/3) = 80·(3/2) = 120. Cek: 81 + 27 + 9 + 3 = 120.'
    },
    {
      id: 'M06',
      level: 'medium',
      text: 'Jumlah <i>n</i> suku pertama suatu deret geometri dirumuskan S<sub>n</sub> = 3<sup>n</sup> − 1. Suku ke-4 deret tersebut adalah …',
      options: ['27', '54', '80', '81'],
      answer: 1,
      explanation:
        'U<sub>4</sub> = S<sub>4</sub> − S<sub>3</sub> = (3<sup>4</sup> − 1) − (3<sup>3</sup> − 1) = 80 − 26 = 54.'
    },
    {
      id: 'M07',
      level: 'medium',
      text: 'Tiga bilangan positif <b>4, x, 36</b> membentuk barisan geometri. Nilai <i>x</i> adalah …',
      options: ['10', '12', '16', '20'],
      answer: 1,
      explanation:
        'Pada barisan geometri, suku tengah memenuhi x<sup>2</sup> = 4·36 = 144, sehingga x = 12 (positif). Rasio: 12 ÷ 4 = 3 dan 36 ÷ 12 = 3.'
    },
    {
      id: 'M08',
      level: 'medium',
      text: 'Jika 1 + 2 + 4 + … + 2<sup>n−1</sup> = 1.023, maka nilai <i>n</i> adalah …',
      options: ['9', '10', '11', '12'],
      answer: 1,
      explanation:
        'S<sub>n</sub> = (2<sup>n</sup> − 1)/(2 − 1) = 2<sup>n</sup> − 1 = 1.023 → 2<sup>n</sup> = 1.024 = 2<sup>10</sup> → n = 10.'
    },
    {
      id: 'M09',
      level: 'medium',
      text: 'Jumlah 7 suku pertama deret <b>1 − 2 + 4 − 8 + …</b> adalah …',
      options: ['43', '127', '129', '−43'],
      answer: 0,
      explanation:
        'a = 1, r = −2. S<sub>7</sub> = a(1 − r<sup>7</sup>)/(1 − r) = (1 − (−2)<sup>7</sup>)/(1 + 2) = (1 + 128)/3 = 43.'
    },

    /* ===================== SULIT ===================== */
    {
      id: 'H01',
      level: 'hard',
      text: 'Nilai deret geometri tak hingga <b>8 + 4 + 2 + 1 + …</b> adalah …',
      options: ['12', '15', '16', '32'],
      answer: 2,
      explanation:
        'a = 8 dan r = 1/2. Karena |r| &lt; 1, deret konvergen: S<sub>∞</sub> = a/(1 − r) = 8/(1/2) = 16.'
    },
    {
      id: 'H02',
      level: 'hard',
      text: 'Jumlah deret geometri tak hingga <b>18 + 6 + 2 + …</b> adalah …',
      options: ['24', '27', '30', '36'],
      answer: 1,
      explanation:
        'a = 18 dan r = 6 ÷ 18 = 1/3. S<sub>∞</sub> = 18/(1 − 1/3) = 18/(2/3) = 27.'
    },
    {
      id: 'H03',
      level: 'hard',
      text: 'Suatu deret geometri tak hingga memiliki suku pertama 3 dan jumlah 12. Rasio deret tersebut adalah …',
      options: ['1/4', '1/3', '3/4', '4/3'],
      answer: 2,
      explanation:
        'S<sub>∞</sub> = a/(1 − r) → 12 = 3/(1 − r) → 1 − r = 1/4 → r = 3/4 (memenuhi |r| &lt; 1).'
    },
    {
      id: 'H04',
      level: 'hard',
      text: 'Sebuah bola dijatuhkan dari ketinggian 10 m dan memantul setinggi 3/5 dari tinggi sebelumnya, begitu seterusnya hingga berhenti. Panjang seluruh lintasan bola adalah …',
      options: ['25 m', '30 m', '40 m', '50 m'],
      answer: 2,
      explanation:
        'Lintasan = jatuh pertama + 2 × (jumlah semua tinggi pantulan). Tinggi pantulan: 6; 3,6; … (a = 6, r = 3/5), jumlahnya 6/(1 − 3/5) = 15. Total = 10 + 2·15 = 40 m.'
    },
    {
      id: 'H05',
      level: 'hard',
      text: 'Populasi bakteri mula-mula 500 dan menjadi dua kali lipat setiap 3 jam. Banyak bakteri setelah 12 jam adalah …',
      options: ['4.000', '6.000', '8.000', '16.000'],
      answer: 2,
      explanation:
        '12 jam = 4 kali penggandaan. Banyak bakteri = 500·2<sup>4</sup> = 500·16 = 8.000. (Sebagai barisan geometri: a = 500, r = 2, dan 12 jam merupakan suku ke-5.)'
    },
    {
      id: 'H06',
      level: 'hard',
      text: 'Massa suatu zat radioaktif 160 gram dengan waktu paruh 2 hari. Massa yang tersisa setelah 8 hari adalah …',
      options: ['5 gram', '10 gram', '20 gram', '40 gram'],
      answer: 1,
      explanation:
        '8 hari = 4 kali waktu paruh, dengan r = 1/2. Sisa = 160·(1/2)<sup>4</sup> = 160/16 = 10 gram.'
    },
    {
      id: 'H07',
      level: 'hard',
      text: 'Modal Rp1.000.000 dibungakan secara majemuk 10% per tahun. Nilai modal setelah 3 tahun adalah …',
      options: ['Rp1.300.000', 'Rp1.310.000', 'Rp1.331.000', 'Rp1.350.000'],
      answer: 2,
      explanation:
        'Nilai modal tiap tahun membentuk barisan geometri dengan r = 1,1. M<sub>3</sub> = 1.000.000·(1,1)<sup>3</sup> = 1.000.000·1,331 = Rp1.331.000. (Bunga tunggal hanya menghasilkan Rp1.300.000.)'
    },
    {
      id: 'H08',
      level: 'hard',
      text: 'Nilai deret tak hingga <b>1 − 1/2 + 1/4 − 1/8 + …</b> adalah …',
      options: ['1/2', '2/3', '3/4', '2'],
      answer: 1,
      explanation:
        'a = 1 dan r = −1/2 (|r| &lt; 1). S<sub>∞</sub> = 1/(1 − (−1/2)) = 1/(3/2) = 2/3.'
    },
    {
      id: 'H09',
      level: 'hard',
      text: 'Suku pertama suatu deret geometri tak hingga adalah 6 dan jumlahnya 9. Suku kedua deret tersebut adalah …',
      options: ['1', '2', '3', '4'],
      answer: 1,
      explanation:
        '9 = 6/(1 − r) → 1 − r = 2/3 → r = 1/3. Maka U<sub>2</sub> = a·r = 6·(1/3) = 2.'
    }
  ];

  var used = { easy: {}, medium: {}, hard: {} };

  function pool(level) {
    return RAW.filter(function (q) {
      return q.level === level;
    });
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

  GG.QuestionBank = {
    all: RAW,

    count: function (level) {
      return level ? pool(level).length : RAW.length;
    },

    reset: function () {
      used = { easy: {}, medium: {}, hard: {} };
    },

    next: function (level) {
      var all = pool(level);
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
