-- ════════════════════════════════════════════════════════════════════════════
-- Biaya operasional properti: indeks dan ringkasan.
--
-- Kenapa perlu:
--
-- Tabel `expenses` sudah ada sejak skema awal, tetapi belum punya satu pun
-- indeks dan belum dipakai modul mana pun. Tanpa catatan pengeluaran, angka
-- "pendapatan bulan ini" di dashboard pemilik hanya menceritakan separuh
-- cerita: kos yang penuh tapi biayanya lebih besar dari sewanya terlihat
-- menguntungkan.
--
-- Yang disimpan di sini pengeluaran PEMILIK, bukan penghuni: perbaikan,
-- listrik dan air, internet, kebersihan, pajak, dan gaji penjaga. Belanja
-- pribadi penghuni bukan urusan platform ini.
--
-- Tidak ada kolom `owner_id`: pemiliknya dibaca dari propertinya, sama seperti
-- seluruh modul lain. Menyimpannya di sini berarti dua tempat yang bisa tidak
-- sepakat, dan yang salah akan membuat pengeluaran muncul di pembukuan orang
-- yang tidak pernah mengeluarkannya.
--
-- AMAN DIJALANKAN BERULANG: seluruh pernyataannya `IF NOT EXISTS`, sehingga
-- aman dijalankan di database yang sudah punya indeksnya.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Daftar pengeluaran selalu dibaca per properti lalu diurutkan dari yang
-- terbaru, dan ringkasan bulanannya menyaring per rentang tanggal. Keduanya
-- terlayani satu indeks gabungan ini.
CREATE INDEX IF NOT EXISTS "expenses_property_date_idx"
  ON "expenses"("property_id", "date" DESC);

-- Ringkasan pemilik menggabungkan seluruh propertinya dalam satu rentang
-- tanggal, tanpa menyebut properti mana pun.
CREATE INDEX IF NOT EXISTS "expenses_date_idx"
  ON "expenses"("date" DESC);

COMMIT;
