# GeoLadder — Ular Tangga Barisan & Deret Geometri

Buka `index.html` di browser (tanpa build). Tanpa konfigurasi cloud, game berjalan penuh dengan soal bawaan
dan perubahan guru tersimpan di perangkat itu saja.

## Akses Mode Guru (rahasia)
`Ctrl + Shift + G`, atau klik logo/judul **GeoLadder** 3x berturut-turut. PIN: `teacherPin` di `config.js` (bawaan 1234).

## Mengaktifkan Cloud (pilih salah satu) — edit `CONFIG.cloud` di `config.js`

### A. Firebase Realtime Database (real-time sungguhan, disarankan)
1. Firebase Console → Build → Realtime Database → Create database.
2. Rules (siswa hanya boleh membaca; hanya pemegang token yang boleh menulis):
   ```json
   { "rules": { "geoladder": { "questionBank": { ".read": true, ".write": "auth != null" } } } }
   ```
3. Isi `provider: 'firebase'` dan `firebase.databaseURL` (mis. `https://NAMA-default-rtdb.firebaseio.com`).
4. (Opsional) Impor `bank-soal-default.json` ke simpul `geoladder/questionBank` sebagai data awal.
5. Di Panel Guru → "Kunci tulis cloud", tempel token tulis (tersimpan hanya di perangkat guru).
   Untuk uji coba cepat, rules bisa dibuat `".write": true` (TIDAK aman untuk produksi).

### B. JSONBin.io (sederhana, sinkron lewat polling `pollMs`)
1. Buat bin berisi isi `bank-soal-default.json`. Buat *Access Key* **read-only** untuk siswa.
2. Isi `provider: 'jsonbin'`, `jsonbin.binId`, `jsonbin.accessKey` (kunci baca).
3. Di Panel Guru, isi "Kunci tulis cloud" dengan Master Key milik guru (tidak pernah ditulis di kode).

## Format data cloud
`{ "rev": 1730000000000, "updatedAt": "ISO-8601", "questions": [ { "id", "level": "easy|medium|hard", "text", "options": [4 string], "answer": 0-3, "explanation" } ] }`
`rev` terbesar menang (last-write-wins). Teks soal boleh memakai tag `b, i, sub, sup, br`.

## Perilaku
- Saat dibuka: layar loading → unduh soal dari cloud (batas waktu `timeoutMs`).
- Gagal/offline → memakai salinan terakhir di perangkat, atau `DEFAULT_QUESTIONS` (`default_questions.js`, dibekukan) bila belum ada.
- Edit guru: tersimpan lokal lalu otomatis dikirim ke cloud; perangkat lain menerima pembaruan otomatis.
- "Reset ke Soal Default" menimpa cloud dan perangkat dengan `DEFAULT_QUESTIONS`.
