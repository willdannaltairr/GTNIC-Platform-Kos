-- ════════════════════════════════════════════════════════════════════════════
-- KosPlatform, data demo (seed)
--
-- Prasyarat: migration 20261107120000_init.sql sudah dijalankan.
--
-- Sifat:
--   * Idempoten, aman dijalankan berulang. Akun dan properti dikenali lewat
--     email/slug, anak-anak properti (foto, aturan, komponen biaya) ditulis
--     ulang supaya isinya selalu sama seperti definisi di bawah.
--   * Semua data fiktif, hanya untuk demo dan pengembangan.
--   * Password seluruh akun demo: KosDemo123!
--   * Nilai password_hash di bawah adalah hash bcrypt (biaya 10) dari password
--     itu, ditulis tetap supaya berkas ini tidak bergantung pada extension
--     apa pun. Aplikasi memverifikasinya dengan bcryptjs seperti biasa.
--
-- Waktu disimpan relatif terhadap saat seed dijalankan (now() - interval),
-- bukan tanggal tetap, supaya penanda "ketersediaan perlu dikonfirmasi ulang"
-- (ambang 14 hari) tetap punya contoh yang segar maupun yang sudah basi.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Properti yang dikelola seed ini. Dipakai untuk menyapu isi anak-anaknya
-- sebelum ditulis ulang, sehingga tidak ada sisa dari versi seed sebelumnya.
CREATE TEMP TABLE _seed_properties (slug text PRIMARY KEY) ON COMMIT DROP;

INSERT INTO _seed_properties (slug)
VALUES
  ('kos-melati-putri-kebayoran'),
  ('kos-anggrek-campur-dago'),
  ('kos-cendana-putra-jogja'),
  ('kos-bougenville-putri-surabaya'),
  ('kos-flamboyan-campur-malang'),
  ('kos-kenanga-putri-depok');

DELETE FROM property_images
WHERE property_id IN (SELECT id FROM properties WHERE slug IN (SELECT slug FROM _seed_properties));

DELETE FROM property_rules
WHERE property_id IN (SELECT id FROM properties WHERE slug IN (SELECT slug FROM _seed_properties));

DELETE FROM cost_components
WHERE property_id IN (SELECT id FROM properties WHERE slug IN (SELECT slug FROM _seed_properties));

-- Fasilitas kamar ikut disapu: tanpa ini, perubahan daftar fasilitas di seed
-- hanya menambah dan tidak pernah mengurangi.
DELETE FROM room_facilities
WHERE room_id IN (
  SELECT r.id
  FROM rooms r
  JOIN properties p ON p.id = r.property_id
  WHERE p.slug IN (SELECT slug FROM _seed_properties)
);

-- ─── Akun demo ─────────────────────────────────────────────────────────────
-- password_hash: hash bcrypt dari 'KosDemo123!' (biaya 10). Satu password untuk
-- semua akun demo supaya mudah didemokan.

INSERT INTO users (full_name, email, phone_number, password_hash, role, account_status, email_verified_at)
VALUES
  ('Admin KosPlatform', 'admin@kosplatform.test',    '081200000001', '$2a$10$pSFkQlUHGP9rICJi73IxheH5N/i7JPMoPV8Nz8F5prurcAdUwke/6', 'ADMIN',  'ACTIVE', now()),
  ('Hendra Wijaya',     'owner1@kosplatform.test',   '081200000002', '$2a$10$pSFkQlUHGP9rICJi73IxheH5N/i7JPMoPV8Nz8F5prurcAdUwke/6', 'OWNER',  'ACTIVE', now()),
  ('Sari Lestari',      'owner2@kosplatform.test',   '081200000003', '$2a$10$pSFkQlUHGP9rICJi73IxheH5N/i7JPMoPV8Nz8F5prurcAdUwke/6', 'OWNER',  'ACTIVE', now()),
  ('Budi Santoso',      'tenant1@kosplatform.test',  '081200000004', '$2a$10$pSFkQlUHGP9rICJi73IxheH5N/i7JPMoPV8Nz8F5prurcAdUwke/6', 'TENANT', 'ACTIVE', now()),
  ('Nadia Putri',       'tenant2@kosplatform.test',  '081200000005', '$2a$10$pSFkQlUHGP9rICJi73IxheH5N/i7JPMoPV8Nz8F5prurcAdUwke/6', 'TENANT', 'ACTIVE', now()),
  ('Rizky Ramadhan',    'tenant3@kosplatform.test',  '081200000006', '$2a$10$pSFkQlUHGP9rICJi73IxheH5N/i7JPMoPV8Nz8F5prurcAdUwke/6', 'TENANT', 'ACTIVE', now()),
  ('Dewi Anggraini',    'tenant4@kosplatform.test',  '081200000007', '$2a$10$pSFkQlUHGP9rICJi73IxheH5N/i7JPMoPV8Nz8F5prurcAdUwke/6', 'TENANT', 'ACTIVE', now()),
  ('Fajar Nugroho',     'tenant5@kosplatform.test',  '081200000008', '$2a$10$pSFkQlUHGP9rICJi73IxheH5N/i7JPMoPV8Nz8F5prurcAdUwke/6', 'TENANT', 'ACTIVE', now())
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone_number = EXCLUDED.phone_number,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  account_status = EXCLUDED.account_status,
  deleted_at = NULL;

-- Profil pemilik. Hanya pemilik yang sudah diverifikasi, karena halaman publik
-- menampilkan status verifikasi pemilik apa adanya.
INSERT INTO owner_profiles (user_id, business_name, description, identity_verification_status, identity_document_status, verified_at)
SELECT
  u.id,
  'Kos ' || split_part(u.full_name, ' ', 1),
  'Pemilik kos demo untuk pengembangan platform.',
  'VERIFIED',
  'VERIFIED',
  now() - interval '30 days'
FROM users u
WHERE u.email IN ('owner1@kosplatform.test', 'owner2@kosplatform.test')
ON CONFLICT (user_id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  description = EXCLUDED.description,
  identity_verification_status = EXCLUDED.identity_verification_status,
  identity_document_status = EXCLUDED.identity_document_status,
  verified_at = EXCLUDED.verified_at;

-- Profil penghuni.
INSERT INTO tenant_profiles (user_id, occupation, institution_name, emergency_contact_name, emergency_contact_phone)
SELECT
  u.id,
  'Mahasiswa',
  'Universitas Demo',
  'Kontak Darurat ' || split_part(u.full_name, ' ', 1),
  '081299990000'
FROM users u
WHERE u.email IN (
  'tenant1@kosplatform.test',
  'tenant2@kosplatform.test',
  'tenant3@kosplatform.test',
  'tenant4@kosplatform.test',
  'tenant5@kosplatform.test'
)
ON CONFLICT (user_id) DO UPDATE SET
  occupation = EXCLUDED.occupation,
  institution_name = EXCLUDED.institution_name,
  emergency_contact_name = EXCLUDED.emergency_contact_name,
  emergency_contact_phone = EXCLUDED.emergency_contact_phone;

-- ─── Fasilitas master ──────────────────────────────────────────────────────
-- Slug di sini sama persis dengan slug yang dipakai filter pencarian di
-- frontend (FACILITY_FILTERS), jadi penyaringan fasilitas selalu menemukan data.

INSERT INTO facilities (name, slug, category, icon)
VALUES
  ('Wi-Fi',            'wifi',              'PROPERTY', 'wifi'),
  ('Parkir Motor',     'parkir-motor',      'PROPERTY', 'bike'),
  ('Parkir Mobil',     'parkir-mobil',      'PROPERTY', 'car'),
  ('Dapur Bersama',    'dapur',             'PROPERTY', 'cooking-pot'),
  ('Laundry',          'laundry',           'PROPERTY', 'shirt'),
  ('CCTV',             'cctv',              'PROPERTY', 'camera'),
  ('Penjaga Kos',      'penjaga-kos',       'PROPERTY', 'shield'),
  ('Air Termasuk',     'air-termasuk',      'PROPERTY', 'droplets'),
  ('Listrik Termasuk', 'listrik-termasuk',  'PROPERTY', 'zap'),
  ('AC',               'ac',                'ROOM',     'air-vent'),
  ('Kamar Mandi Dalam','kamar-mandi-dalam', 'ROOM',     'shower-head'),
  ('Kasur',            'kasur',             'ROOM',     'bed-double'),
  ('Lemari',           'lemari',            'ROOM',     'archive'),
  ('Meja Belajar',     'meja-belajar',      'ROOM',     'book-open')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Kos Melati Putri, Jakarta Selatan, kos putri
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO properties (
  owner_id, name, slug, description, address, province, city, district, postal_code,
  latitude, longitude, property_type, gender_policy, total_rooms,
  verification_status, publication_status, published_at,
  last_availability_confirmation_at, cost_confidence
)
SELECT
  u.id,
  'Kos Melati Putri',
  'kos-melati-putri-kebayoran',
  'Kos putri nyaman di kawasan Kebayoran Baru, 5 menit jalan kaki ke halte TransJakarta dan dekat minimarket serta rumah makan. Lingkungan tenang, cocok untuk mahasiswa dan pekerja.',
  'Jl. Melati No. 12, RT 04/RW 02',
  'DKI Jakarta',
  'Jakarta Selatan',
  'Kebayoran Baru',
  '12130',
  -6.2435, 106.7992,
  'KOS_PUTRI', 'putri', 6,
  'VERIFIED', 'PUBLISHED', now() - interval '10 days',
  now() - interval '2 days', 'COMPLETE'
FROM users u WHERE u.email = 'owner1@kosplatform.test'
ON CONFLICT (slug) DO UPDATE SET
  owner_id = EXCLUDED.owner_id, name = EXCLUDED.name, description = EXCLUDED.description,
  address = EXCLUDED.address, province = EXCLUDED.province, city = EXCLUDED.city,
  district = EXCLUDED.district, postal_code = EXCLUDED.postal_code,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  property_type = EXCLUDED.property_type, gender_policy = EXCLUDED.gender_policy,
  total_rooms = EXCLUDED.total_rooms, verification_status = EXCLUDED.verification_status,
  publication_status = EXCLUDED.publication_status, published_at = EXCLUDED.published_at,
  last_availability_confirmation_at = EXCLUDED.last_availability_confirmation_at,
  cost_confidence = EXCLUDED.cost_confidence, deleted_at = NULL;

INSERT INTO property_images (property_id, storage_path, image_url, alt_text, display_order, is_primary)
SELECT p.id, v.url, v.url, v.alt, v.ord, v.ord = 0
FROM properties p
CROSS JOIN (VALUES
  (0, '/images/kos-1.jpg', 'Kamar Kos Melati Putri dengan pencahayaan hangat dan tanaman'),
  (1, '/images/kos-2.jpg', 'Sudut kamar dengan lampu meja di Kos Melati Putri')
) AS v(ord, url, alt)
WHERE p.slug = 'kos-melati-putri-kebayoran';

INSERT INTO property_facilities (property_id, facility_id)
SELECT p.id, f.id
FROM properties p
CROSS JOIN facilities f
WHERE p.slug = 'kos-melati-putri-kebayoran'
  AND f.slug = ANY(ARRAY['wifi', 'parkir-motor', 'cctv', 'penjaga-kos', 'air-termasuk', 'dapur', 'laundry'])
ON CONFLICT (property_id, facility_id) DO NOTHING;

INSERT INTO property_rules (property_id, rule_title, rule_description, is_mandatory)
SELECT p.id, v.title, v.description, v.mandatory
FROM properties p
CROSS JOIN (VALUES
  ('Jam malam 22.00', 'Gerbang dikunci pukul 22.00; akses malam hanya dengan kartu penghuni.', true),
  ('Tamu hanya di ruang tamu', 'Tamu lawan jenis tidak diizinkan masuk ke area kamar.', true),
  ('Dilarang membawa hewan peliharaan', 'Termasuk hewan kecil seperti ikan dan hamster.', true)
) AS v(title, description, mandatory)
WHERE p.slug = 'kos-melati-putri-kebayoran';

-- Deposit sengaja ditandai is_refundable = true: TrueCost tidak menghitungnya
-- sebagai pengeluaran hilang.
INSERT INTO cost_components (property_id, name, amount, billing_type, is_mandatory, is_refundable, cost_confidence, description)
SELECT p.id, v.name, v.amount, v.billing_type::"BillingType", true, v.refundable, v.confidence::"CostConfidence", v.description
FROM properties p
CROSS JOIN (VALUES
  ('Listrik', 120000::numeric, 'VARIABLE', false, 'PARTIAL', 'Token listrik rata-rata per bulan; pemakaian bisa berbeda.'),
  ('Air & Kebersihan', 60000::numeric, 'MONTHLY', false, 'COMPLETE', NULL),
  ('Internet', 80000::numeric, 'MONTHLY', false, 'COMPLETE', NULL),
  ('Deposit', 1500000::numeric, 'ONE_TIME', true, 'COMPLETE', NULL),
  ('Biaya Administrasi Awal', 100000::numeric, 'ONE_TIME', false, 'COMPLETE', NULL)
) AS v(name, amount, billing_type, refundable, confidence, description)
WHERE p.slug = 'kos-melati-putri-kebayoran';

INSERT INTO rooms (property_id, room_number, room_type, monthly_price, bathroom_type, maximum_occupants, availability_status, area_width, area_length)
SELECT p.id, v.room_number, v.room_type, v.price, v.bathroom, v.occupants, v.status::"RoomAvailabilityStatus", v.width, v.length
FROM properties p
CROSS JOIN (VALUES
  ('A1', 'deluxe',  1850000, 'private', 1, 'AVAILABLE',   3.0, 4.0),
  ('A2', 'deluxe',  1750000, 'private', 1, 'OCCUPIED',    3.0, 4.0),
  ('A3', 'deluxe',  1650000, 'private', 1, 'AVAILABLE',   3.0, 3.5),
  ('A4', 'reguler', 1450000, 'shared',  1, 'AVAILABLE',   2.5, 3.5),
  ('A5', 'reguler', 1450000, 'shared',  1, 'RESERVED',    2.5, 3.5),
  ('A6', 'reguler', 1350000, 'shared',  1, 'MAINTENANCE', 2.5, 3.0)
) AS v(room_number, room_type, price, bathroom, occupants, status, width, length)
WHERE p.slug = 'kos-melati-putri-kebayoran'
ON CONFLICT (property_id, room_number) DO UPDATE SET
  room_type = EXCLUDED.room_type, monthly_price = EXCLUDED.monthly_price,
  bathroom_type = EXCLUDED.bathroom_type, maximum_occupants = EXCLUDED.maximum_occupants,
  availability_status = EXCLUDED.availability_status,
  area_width = EXCLUDED.area_width, area_length = EXCLUDED.area_length;

INSERT INTO room_facilities (room_id, facility_id)
SELECT r.id, f.id
FROM rooms r
JOIN properties p ON p.id = r.property_id
CROSS JOIN facilities f
WHERE p.slug = 'kos-melati-putri-kebayoran'
  AND f.slug = ANY(ARRAY['ac', 'kamar-mandi-dalam', 'kasur', 'lemari', 'meja-belajar'])
ON CONFLICT (room_id, facility_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Kos Anggrek Campur, Bandung, kos campur
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO properties (
  owner_id, name, slug, description, address, province, city, district, postal_code,
  latitude, longitude, property_type, gender_policy, total_rooms,
  verification_status, publication_status, published_at,
  last_availability_confirmation_at, cost_confidence
)
SELECT
  u.id,
  'Kos Anggrek Campur',
  'kos-anggrek-campur-dago',
  'Kos campur di kawasan Dago yang dekat dengan kampus ITB dan Unpad. Banyak warung makan, kafe, dan akses angkutan kota dalam jarak jalan kaki.',
  'Jl. Anggrek No. 8, RT 03/RW 05',
  'Jawa Barat',
  'Bandung',
  'Coblong',
  '40135',
  -6.8856, 107.6139,
  'KOS_CAMPUR', 'campur', 8,
  'VERIFIED', 'PUBLISHED', now() - interval '10 days',
  now() - interval '5 days', 'PARTIAL'
FROM users u WHERE u.email = 'owner2@kosplatform.test'
ON CONFLICT (slug) DO UPDATE SET
  owner_id = EXCLUDED.owner_id, name = EXCLUDED.name, description = EXCLUDED.description,
  address = EXCLUDED.address, province = EXCLUDED.province, city = EXCLUDED.city,
  district = EXCLUDED.district, postal_code = EXCLUDED.postal_code,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  property_type = EXCLUDED.property_type, gender_policy = EXCLUDED.gender_policy,
  total_rooms = EXCLUDED.total_rooms, verification_status = EXCLUDED.verification_status,
  publication_status = EXCLUDED.publication_status, published_at = EXCLUDED.published_at,
  last_availability_confirmation_at = EXCLUDED.last_availability_confirmation_at,
  cost_confidence = EXCLUDED.cost_confidence, deleted_at = NULL;

INSERT INTO property_images (property_id, storage_path, image_url, alt_text, display_order, is_primary)
SELECT p.id, v.url, v.url, v.alt, v.ord, v.ord = 0
FROM properties p
CROSS JOIN (VALUES
  (0, '/images/kos-3.jpg', 'Kamar bernuansa biru di Kos Anggrek Campur'),
  (1, '/images/kos-5.jpg', 'Kamar dengan perabot modern di Kos Anggrek Campur')
) AS v(ord, url, alt)
WHERE p.slug = 'kos-anggrek-campur-dago';

INSERT INTO property_facilities (property_id, facility_id)
SELECT p.id, f.id
FROM properties p
CROSS JOIN facilities f
WHERE p.slug = 'kos-anggrek-campur-dago'
  AND f.slug = ANY(ARRAY['wifi', 'parkir-motor', 'dapur', 'laundry'])
ON CONFLICT (property_id, facility_id) DO NOTHING;

INSERT INTO property_rules (property_id, rule_title, rule_description, is_mandatory)
SELECT p.id, v.title, v.description, v.mandatory
FROM properties p
CROSS JOIN (VALUES
  ('Bebas jam malam', 'Akses pintu utama 24 jam dengan kartu penghuni.', false),
  ('Tamu menginap maksimal 3 hari', 'Wajib lapor penjaga kos dan ada biaya tambahan.', true)
) AS v(title, description, mandatory)
WHERE p.slug = 'kos-anggrek-campur-dago';

INSERT INTO cost_components (property_id, name, amount, billing_type, is_mandatory, is_refundable, cost_confidence, description)
SELECT p.id, v.name, v.amount, v.billing_type::"BillingType", true, v.refundable, v.confidence::"CostConfidence", v.description
FROM properties p
CROSS JOIN (VALUES
  ('Listrik', 100000::numeric, 'VARIABLE', false, 'PARTIAL', 'Rata-rata pemakaian; kamar dengan AC dapat lebih tinggi.'),
  ('Air', 50000::numeric, 'MONTHLY', false, 'COMPLETE', NULL),
  ('Internet', 75000::numeric, 'MONTHLY', false, 'COMPLETE', NULL),
  ('Deposit', 950000::numeric, 'ONE_TIME', true, 'COMPLETE', NULL),
  ('Biaya Administrasi Awal', 50000::numeric, 'ONE_TIME', false, 'COMPLETE', NULL)
) AS v(name, amount, billing_type, refundable, confidence, description)
WHERE p.slug = 'kos-anggrek-campur-dago';

INSERT INTO rooms (property_id, room_number, room_type, monthly_price, bathroom_type, maximum_occupants, availability_status, area_width, area_length)
SELECT p.id, v.room_number, v.room_type, v.price, v.bathroom, v.occupants, v.status::"RoomAvailabilityStatus", v.width, v.length
FROM properties p
CROSS JOIN (VALUES
  ('B1', 'deluxe',  1300000, 'private', 1, 'AVAILABLE', 3.0, 4.0),
  ('B2', 'deluxe',  1250000, 'private', 1, 'OCCUPIED',  3.0, 3.5),
  ('B3', 'reguler', 1100000, 'shared',  1, 'AVAILABLE', 2.5, 3.5),
  ('B4', 'reguler', 1050000, 'shared',  1, 'AVAILABLE', 2.5, 3.5),
  ('B5', 'reguler', 1000000, 'shared',  1, 'OCCUPIED',  2.5, 3.0),
  ('B6', 'reguler',  980000, 'shared',  1, 'AVAILABLE', 2.5, 3.0),
  ('B7', 'reguler',  950000, 'shared',  1, 'AVAILABLE', 2.0, 3.0),
  ('B8', 'reguler',  950000, 'shared',  1, 'RESERVED',  2.0, 3.0)
) AS v(room_number, room_type, price, bathroom, occupants, status, width, length)
WHERE p.slug = 'kos-anggrek-campur-dago'
ON CONFLICT (property_id, room_number) DO UPDATE SET
  room_type = EXCLUDED.room_type, monthly_price = EXCLUDED.monthly_price,
  bathroom_type = EXCLUDED.bathroom_type, maximum_occupants = EXCLUDED.maximum_occupants,
  availability_status = EXCLUDED.availability_status,
  area_width = EXCLUDED.area_width, area_length = EXCLUDED.area_length;

INSERT INTO room_facilities (room_id, facility_id)
SELECT r.id, f.id
FROM rooms r
JOIN properties p ON p.id = r.property_id
CROSS JOIN facilities f
WHERE p.slug = 'kos-anggrek-campur-dago'
  AND f.slug = ANY(ARRAY['kasur', 'lemari', 'meja-belajar'])
ON CONFLICT (room_id, facility_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Kos Cendana Putra, Sleman, kos putra
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO properties (
  owner_id, name, slug, description, address, province, city, district, postal_code,
  latitude, longitude, property_type, gender_policy, total_rooms,
  verification_status, publication_status, published_at,
  last_availability_confirmation_at, cost_confidence
)
SELECT
  u.id,
  'Kos Cendana Putra',
  'kos-cendana-putra-jogja',
  'Kos putra strategis di Jalan Kaliurang KM 5, dekat kampus UGM dan UNY. Listrik dan air sudah termasuk biaya sewa sehingga pengeluaran bulanan mudah diperkirakan.',
  'Jl. Kaliurang KM 5, Ngaglik',
  'DI Yogyakarta',
  'Sleman',
  'Depok',
  '55581',
  -7.7297, 110.3836,
  'KOS_PUTRA', 'putra', 5,
  'VERIFIED', 'PUBLISHED', now() - interval '10 days',
  now() - interval '1 day', 'COMPLETE'
FROM users u WHERE u.email = 'owner1@kosplatform.test'
ON CONFLICT (slug) DO UPDATE SET
  owner_id = EXCLUDED.owner_id, name = EXCLUDED.name, description = EXCLUDED.description,
  address = EXCLUDED.address, province = EXCLUDED.province, city = EXCLUDED.city,
  district = EXCLUDED.district, postal_code = EXCLUDED.postal_code,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  property_type = EXCLUDED.property_type, gender_policy = EXCLUDED.gender_policy,
  total_rooms = EXCLUDED.total_rooms, verification_status = EXCLUDED.verification_status,
  publication_status = EXCLUDED.publication_status, published_at = EXCLUDED.published_at,
  last_availability_confirmation_at = EXCLUDED.last_availability_confirmation_at,
  cost_confidence = EXCLUDED.cost_confidence, deleted_at = NULL;

INSERT INTO property_images (property_id, storage_path, image_url, alt_text, display_order, is_primary)
SELECT p.id, v.url, v.url, v.alt, v.ord, v.ord = 0
FROM properties p
CROSS JOIN (VALUES
  (0, '/images/kos-6.jpg', 'Kamar kayu bernuansa hangat di Kos Cendana Putra'),
  (1, '/images/kos-4.jpg', 'Kamar dengan tempat tidur dan lemari di Kos Cendana Putra')
) AS v(ord, url, alt)
WHERE p.slug = 'kos-cendana-putra-jogja';

INSERT INTO property_facilities (property_id, facility_id)
SELECT p.id, f.id
FROM properties p
CROSS JOIN facilities f
WHERE p.slug = 'kos-cendana-putra-jogja'
  AND f.slug = ANY(ARRAY['wifi', 'parkir-motor', 'air-termasuk', 'listrik-termasuk', 'dapur'])
ON CONFLICT (property_id, facility_id) DO NOTHING;

INSERT INTO property_rules (property_id, rule_title, rule_description, is_mandatory)
SELECT p.id, v.title, v.description, v.mandatory
FROM properties p
CROSS JOIN (VALUES
  ('Kecepatan internet dibatasi', 'Kuota fair-use 100 GB per bulan per kamar.', true)
) AS v(title, description, mandatory)
WHERE p.slug = 'kos-cendana-putra-jogja';

INSERT INTO cost_components (property_id, name, amount, billing_type, is_mandatory, is_refundable, cost_confidence, description)
SELECT p.id, v.name, v.amount, v.billing_type::"BillingType", true, v.refundable, v.confidence::"CostConfidence", v.description
FROM properties p
CROSS JOIN (VALUES
  ('Internet', 60000::numeric, 'MONTHLY', false, 'COMPLETE', NULL),
  ('Deposit', 800000::numeric, 'ONE_TIME', true, 'COMPLETE', NULL)
) AS v(name, amount, billing_type, refundable, confidence, description)
WHERE p.slug = 'kos-cendana-putra-jogja';

INSERT INTO rooms (property_id, room_number, room_type, monthly_price, bathroom_type, maximum_occupants, availability_status, area_width, area_length)
SELECT p.id, v.room_number, v.room_type, v.price, v.bathroom, v.occupants, v.status::"RoomAvailabilityStatus", v.width, v.length
FROM properties p
CROSS JOIN (VALUES
  ('C1', 'reguler', 1100000, 'shared', 1, 'AVAILABLE', 3.0, 3.5),
  ('C2', 'reguler', 1000000, 'shared', 1, 'OCCUPIED',  3.0, 3.0),
  ('C3', 'reguler',  900000, 'shared', 1, 'AVAILABLE', 2.5, 3.0),
  ('C4', 'reguler',  850000, 'shared', 1, 'AVAILABLE', 2.5, 3.0),
  ('C5', 'ekonomi',  800000, 'shared', 1, 'AVAILABLE', 2.5, 2.5)
) AS v(room_number, room_type, price, bathroom, occupants, status, width, length)
WHERE p.slug = 'kos-cendana-putra-jogja'
ON CONFLICT (property_id, room_number) DO UPDATE SET
  room_type = EXCLUDED.room_type, monthly_price = EXCLUDED.monthly_price,
  bathroom_type = EXCLUDED.bathroom_type, maximum_occupants = EXCLUDED.maximum_occupants,
  availability_status = EXCLUDED.availability_status,
  area_width = EXCLUDED.area_width, area_length = EXCLUDED.area_length;

INSERT INTO room_facilities (room_id, facility_id)
SELECT r.id, f.id
FROM rooms r
JOIN properties p ON p.id = r.property_id
CROSS JOIN facilities f
WHERE p.slug = 'kos-cendana-putra-jogja'
  AND f.slug = ANY(ARRAY['kasur', 'lemari', 'meja-belajar'])
ON CONFLICT (room_id, facility_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. Kos Bougenville Putri, Surabaya, kos putri
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO properties (
  owner_id, name, slug, description, address, province, city, district, postal_code,
  latitude, longitude, property_type, gender_policy, total_rooms,
  verification_status, publication_status, published_at,
  last_availability_confirmation_at, cost_confidence
)
SELECT
  u.id,
  'Kos Bougenville Putri',
  'kos-bougenville-putri-surabaya',
  'Kos putri dengan kamar mandi dalam di kawasan Gubeng, dekat Stasiun Gubeng dan perkantoran. Setiap kamar ber-AC dan tersedia laundry mingguan.',
  'Jl. Bougenville No. 21, RT 05/RW 01',
  'Jawa Timur',
  'Surabaya',
  'Gubeng',
  '60281',
  -7.2653, 112.7477,
  'KOS_PUTRI', 'putri', 7,
  'VERIFIED', 'PUBLISHED', now() - interval '10 days',
  now() - interval '3 days', 'PARTIAL'
FROM users u WHERE u.email = 'owner2@kosplatform.test'
ON CONFLICT (slug) DO UPDATE SET
  owner_id = EXCLUDED.owner_id, name = EXCLUDED.name, description = EXCLUDED.description,
  address = EXCLUDED.address, province = EXCLUDED.province, city = EXCLUDED.city,
  district = EXCLUDED.district, postal_code = EXCLUDED.postal_code,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  property_type = EXCLUDED.property_type, gender_policy = EXCLUDED.gender_policy,
  total_rooms = EXCLUDED.total_rooms, verification_status = EXCLUDED.verification_status,
  publication_status = EXCLUDED.publication_status, published_at = EXCLUDED.published_at,
  last_availability_confirmation_at = EXCLUDED.last_availability_confirmation_at,
  cost_confidence = EXCLUDED.cost_confidence, deleted_at = NULL;

INSERT INTO property_images (property_id, storage_path, image_url, alt_text, display_order, is_primary)
SELECT p.id, v.url, v.url, v.alt, v.ord, v.ord = 0
FROM properties p
CROSS JOIN (VALUES
  (0, '/images/kos-2.jpg', 'Kamar dengan lampu meja dan karya seni di Kos Bougenville Putri'),
  (1, '/images/kos-1.jpg', 'Kamar dengan tanaman dan kursi kulit di Kos Bougenville Putri')
) AS v(ord, url, alt)
WHERE p.slug = 'kos-bougenville-putri-surabaya';

INSERT INTO property_facilities (property_id, facility_id)
SELECT p.id, f.id
FROM properties p
CROSS JOIN facilities f
WHERE p.slug = 'kos-bougenville-putri-surabaya'
  AND f.slug = ANY(ARRAY['wifi', 'parkir-motor', 'cctv', 'penjaga-kos', 'laundry'])
ON CONFLICT (property_id, facility_id) DO NOTHING;

INSERT INTO property_rules (property_id, rule_title, rule_description, is_mandatory)
SELECT p.id, v.title, v.description, v.mandatory
FROM properties p
CROSS JOIN (VALUES
  ('Jam malam 23.00', 'Gerbang dikunci, akses menggunakan kartu.', true),
  ('Dilarang memasak di kamar', 'Dapur bersama tersedia di lantai 1.', true)
) AS v(title, description, mandatory)
WHERE p.slug = 'kos-bougenville-putri-surabaya';

INSERT INTO cost_components (property_id, name, amount, billing_type, is_mandatory, is_refundable, cost_confidence, description)
SELECT p.id, v.name, v.amount, v.billing_type::"BillingType", true, v.refundable, v.confidence::"CostConfidence", v.description
FROM properties p
CROSS JOIN (VALUES
  ('Listrik', 130000::numeric, 'VARIABLE', false, 'PARTIAL', 'Perkiraan pemakaian AC harian.'),
  ('Air', 60000::numeric, 'MONTHLY', false, 'COMPLETE', NULL),
  ('Deposit', 1600000::numeric, 'ONE_TIME', true, 'COMPLETE', NULL),
  ('Biaya Administrasi Awal', 100000::numeric, 'ONE_TIME', false, 'COMPLETE', NULL)
) AS v(name, amount, billing_type, refundable, confidence, description)
WHERE p.slug = 'kos-bougenville-putri-surabaya';

INSERT INTO rooms (property_id, room_number, room_type, monthly_price, bathroom_type, maximum_occupants, availability_status, area_width, area_length)
SELECT p.id, v.room_number, v.room_type, v.price, v.bathroom, v.occupants, v.status::"RoomAvailabilityStatus", v.width, v.length
FROM properties p
CROSS JOIN (VALUES
  ('D1', 'deluxe',  1600000, 'private', 1, 'AVAILABLE', 3.0, 4.0),
  ('D2', 'deluxe',  1550000, 'private', 1, 'AVAILABLE', 3.0, 4.0),
  ('D3', 'deluxe',  1500000, 'private', 1, 'OCCUPIED',  3.0, 3.5),
  ('D4', 'reguler', 1300000, 'private', 1, 'AVAILABLE', 3.0, 3.0),
  ('D5', 'reguler', 1250000, 'private', 1, 'RESERVED',  2.5, 3.5),
  ('D6', 'reguler', 1150000, 'shared',  1, 'AVAILABLE', 2.5, 3.0),
  ('D7', 'reguler', 1100000, 'shared',  1, 'AVAILABLE', 2.5, 3.0)
) AS v(room_number, room_type, price, bathroom, occupants, status, width, length)
WHERE p.slug = 'kos-bougenville-putri-surabaya'
ON CONFLICT (property_id, room_number) DO UPDATE SET
  room_type = EXCLUDED.room_type, monthly_price = EXCLUDED.monthly_price,
  bathroom_type = EXCLUDED.bathroom_type, maximum_occupants = EXCLUDED.maximum_occupants,
  availability_status = EXCLUDED.availability_status,
  area_width = EXCLUDED.area_width, area_length = EXCLUDED.area_length;

INSERT INTO room_facilities (room_id, facility_id)
SELECT r.id, f.id
FROM rooms r
JOIN properties p ON p.id = r.property_id
CROSS JOIN facilities f
WHERE p.slug = 'kos-bougenville-putri-surabaya'
  AND f.slug = ANY(ARRAY['ac', 'kamar-mandi-dalam', 'kasur', 'lemari', 'meja-belajar'])
ON CONFLICT (room_id, facility_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. Kos Flamboyan Campur, Malang
--
-- Contoh properti yang biayanya BELUM lengkap: ketersediaan terakhir
-- dikonfirmasi 30 hari lalu (ambang batas 14 hari) dan nominal listrik belum
-- diketahui pemilik. Dua hal ini sengaja ada supaya perilaku jujur platform -
-- menandai data basi dan menampilkan biaya yang belum dikonfirmasi, bisa
-- dilihat langsung di aplikasi.
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO properties (
  owner_id, name, slug, description, address, province, city, district, postal_code,
  latitude, longitude, property_type, gender_policy, total_rooms,
  verification_status, publication_status, published_at,
  last_availability_confirmation_at, cost_confidence
)
SELECT
  u.id,
  'Kos Flamboyan Campur',
  'kos-flamboyan-campur-malang',
  'Kos campur harga pelajar di kawasan Lowokwaru, dekat kampus UB, UM, dan Polinema. Pemilik sedang mengumpulkan data biaya listrik per kamar.',
  'Jl. Flamboyan No. 3, RT 02/RW 07',
  'Jawa Timur',
  'Malang',
  'Lowokwaru',
  '65141',
  -7.9429, 112.6117,
  'KOS_CAMPUR', 'campur', 10,
  'VERIFIED', 'PUBLISHED', now() - interval '10 days',
  now() - interval '30 days', 'NEEDS_CONFIRMATION'
FROM users u WHERE u.email = 'owner1@kosplatform.test'
ON CONFLICT (slug) DO UPDATE SET
  owner_id = EXCLUDED.owner_id, name = EXCLUDED.name, description = EXCLUDED.description,
  address = EXCLUDED.address, province = EXCLUDED.province, city = EXCLUDED.city,
  district = EXCLUDED.district, postal_code = EXCLUDED.postal_code,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  property_type = EXCLUDED.property_type, gender_policy = EXCLUDED.gender_policy,
  total_rooms = EXCLUDED.total_rooms, verification_status = EXCLUDED.verification_status,
  publication_status = EXCLUDED.publication_status, published_at = EXCLUDED.published_at,
  last_availability_confirmation_at = EXCLUDED.last_availability_confirmation_at,
  cost_confidence = EXCLUDED.cost_confidence, deleted_at = NULL;

INSERT INTO property_images (property_id, storage_path, image_url, alt_text, display_order, is_primary)
SELECT p.id, v.url, v.url, v.alt, v.ord, v.ord = 0
FROM properties p
CROSS JOIN (VALUES
  (0, '/images/kos-4.jpg', 'Kamar dengan pencahayaan belakang di Kos Flamboyan Campur'),
  (1, '/images/kos-3.jpg', 'Kamar modern bernuansa biru di Kos Flamboyan Campur')
) AS v(ord, url, alt)
WHERE p.slug = 'kos-flamboyan-campur-malang';

INSERT INTO property_facilities (property_id, facility_id)
SELECT p.id, f.id
FROM properties p
CROSS JOIN facilities f
WHERE p.slug = 'kos-flamboyan-campur-malang'
  AND f.slug = ANY(ARRAY['wifi', 'parkir-motor', 'dapur', 'air-termasuk'])
ON CONFLICT (property_id, facility_id) DO NOTHING;

INSERT INTO property_rules (property_id, rule_title, rule_description, is_mandatory)
SELECT p.id, v.title, v.description, v.mandatory
FROM properties p
CROSS JOIN (VALUES
  ('Bebas jam malam', 'Akses 24 jam, gerbang memakai kunci digital.', false),
  ('Maksimal 1 penghuni per kamar', 'Kamar ekonomi tidak dapat diisi dua orang.', true)
) AS v(title, description, mandatory)
WHERE p.slug = 'kos-flamboyan-campur-malang';

INSERT INTO cost_components (property_id, name, amount, billing_type, is_mandatory, is_refundable, cost_confidence, description)
SELECT p.id, v.name, v.amount, v.billing_type::"BillingType", true, v.refundable, v.confidence::"CostConfidence", v.description
FROM properties p
CROSS JOIN (VALUES
  ('Listrik', 0::numeric, 'VARIABLE', false, 'NEEDS_CONFIRMATION', 'Nominal per kamar belum dikonfirmasi pemilik.'),
  ('Deposit', 750000::numeric, 'ONE_TIME', true, 'COMPLETE', NULL)
) AS v(name, amount, billing_type, refundable, confidence, description)
WHERE p.slug = 'kos-flamboyan-campur-malang';

INSERT INTO rooms (property_id, room_number, room_type, monthly_price, bathroom_type, maximum_occupants, availability_status, area_width, area_length)
SELECT p.id, v.room_number, v.room_type, v.price, v.bathroom, v.occupants, v.status::"RoomAvailabilityStatus", v.width, v.length
FROM properties p
CROSS JOIN (VALUES
  ('E1',  'reguler', 1200000, 'private', 1, 'AVAILABLE', 3.0, 3.5),
  ('E2',  'reguler', 1100000, 'private', 1, 'AVAILABLE', 3.0, 3.0),
  ('E3',  'reguler', 1000000, 'shared',  1, 'OCCUPIED',  3.0, 3.0),
  ('E4',  'reguler',  950000, 'shared',  1, 'AVAILABLE', 2.5, 3.0),
  ('E5',  'reguler',  900000, 'shared',  1, 'AVAILABLE', 2.5, 3.0),
  ('E6',  'reguler',  900000, 'shared',  1, 'RESERVED',  2.5, 3.0),
  ('E7',  'ekonomi',  850000, 'shared',  1, 'AVAILABLE', 2.5, 2.5),
  ('E8',  'ekonomi',  800000, 'shared',  1, 'AVAILABLE', 2.5, 2.5),
  ('E9',  'ekonomi',  750000, 'shared',  1, 'OCCUPIED',  2.0, 2.5),
  ('E10', 'ekonomi',  750000, 'shared',  1, 'AVAILABLE', 2.0, 2.5)
) AS v(room_number, room_type, price, bathroom, occupants, status, width, length)
WHERE p.slug = 'kos-flamboyan-campur-malang'
ON CONFLICT (property_id, room_number) DO UPDATE SET
  room_type = EXCLUDED.room_type, monthly_price = EXCLUDED.monthly_price,
  bathroom_type = EXCLUDED.bathroom_type, maximum_occupants = EXCLUDED.maximum_occupants,
  availability_status = EXCLUDED.availability_status,
  area_width = EXCLUDED.area_width, area_length = EXCLUDED.area_length;

INSERT INTO room_facilities (room_id, facility_id)
SELECT r.id, f.id
FROM rooms r
JOIN properties p ON p.id = r.property_id
CROSS JOIN facilities f
WHERE p.slug = 'kos-flamboyan-campur-malang'
  AND f.slug = ANY(ARRAY['kasur', 'lemari'])
ON CONFLICT (room_id, facility_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. Kos Kenanga Putri, Depok, kos putri
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO properties (
  owner_id, name, slug, description, address, province, city, district, postal_code,
  latitude, longitude, property_type, gender_policy, total_rooms,
  verification_status, publication_status, published_at,
  last_availability_confirmation_at, cost_confidence
)
SELECT
  u.id,
  'Kos Kenanga Putri',
  'kos-kenanga-putri-depok',
  'Kos putri dekat kampus UI Depok dengan akses KRL dan angkot 24 jam. Semua kamar ber-AC, kamar mandi dalam, dan sudah termasuk listrik serta air.',
  'Jl. Kenanga No. 17, RT 01/RW 09',
  'Jawa Barat',
  'Depok',
  'Beji',
  '16424',
  -6.3689, 106.8305,
  'KOS_PUTRI', 'putri', 9,
  'VERIFIED', 'PUBLISHED', now() - interval '10 days',
  now() - interval '1 day', 'COMPLETE'
FROM users u WHERE u.email = 'owner2@kosplatform.test'
ON CONFLICT (slug) DO UPDATE SET
  owner_id = EXCLUDED.owner_id, name = EXCLUDED.name, description = EXCLUDED.description,
  address = EXCLUDED.address, province = EXCLUDED.province, city = EXCLUDED.city,
  district = EXCLUDED.district, postal_code = EXCLUDED.postal_code,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  property_type = EXCLUDED.property_type, gender_policy = EXCLUDED.gender_policy,
  total_rooms = EXCLUDED.total_rooms, verification_status = EXCLUDED.verification_status,
  publication_status = EXCLUDED.publication_status, published_at = EXCLUDED.published_at,
  last_availability_confirmation_at = EXCLUDED.last_availability_confirmation_at,
  cost_confidence = EXCLUDED.cost_confidence, deleted_at = NULL;

INSERT INTO property_images (property_id, storage_path, image_url, alt_text, display_order, is_primary)
SELECT p.id, v.url, v.url, v.alt, v.ord, v.ord = 0
FROM properties p
CROSS JOIN (VALUES
  (0, '/images/kos-5.jpg', 'Kamar dengan perabot modern dan pencahayaan lembut di Kos Kenanga Putri'),
  (1, '/images/kos-6.jpg', 'Kamar kayu bernuansa hangat di Kos Kenanga Putri')
) AS v(ord, url, alt)
WHERE p.slug = 'kos-kenanga-putri-depok';

INSERT INTO property_facilities (property_id, facility_id)
SELECT p.id, f.id
FROM properties p
CROSS JOIN facilities f
WHERE p.slug = 'kos-kenanga-putri-depok'
  AND f.slug = ANY(ARRAY['wifi', 'parkir-motor', 'cctv', 'penjaga-kos', 'air-termasuk', 'listrik-termasuk'])
ON CONFLICT (property_id, facility_id) DO NOTHING;

INSERT INTO property_rules (property_id, rule_title, rule_description, is_mandatory)
SELECT p.id, v.title, v.description, v.mandatory
FROM properties p
CROSS JOIN (VALUES
  ('Jam malam 22.30', 'Gerbang dikunci; kabari penjaga bila pulang terlambat.', true),
  ('Wajib menjaga kebersihan dapur bersama', 'Peralatan makan dicuci setelah dipakai.', true)
) AS v(title, description, mandatory)
WHERE p.slug = 'kos-kenanga-putri-depok';

INSERT INTO cost_components (property_id, name, amount, billing_type, is_mandatory, is_refundable, cost_confidence, description)
SELECT p.id, v.name, v.amount, v.billing_type::"BillingType", true, v.refundable, v.confidence::"CostConfidence", v.description
FROM properties p
CROSS JOIN (VALUES
  ('Kebersihan', 35000::numeric, 'MONTHLY', false, 'COMPLETE', NULL),
  ('Deposit', 1500000::numeric, 'ONE_TIME', true, 'COMPLETE', NULL),
  ('Biaya Administrasi Awal', 75000::numeric, 'ONE_TIME', false, 'COMPLETE', NULL)
) AS v(name, amount, billing_type, refundable, confidence, description)
WHERE p.slug = 'kos-kenanga-putri-depok';

INSERT INTO rooms (property_id, room_number, room_type, monthly_price, bathroom_type, maximum_occupants, availability_status, area_width, area_length)
SELECT p.id, v.room_number, v.room_type, v.price, v.bathroom, v.occupants, v.status::"RoomAvailabilityStatus", v.width, v.length
FROM properties p
CROSS JOIN (VALUES
  ('F1', 'deluxe',  1500000, 'private', 1, 'AVAILABLE', 3.0, 4.0),
  ('F2', 'deluxe',  1450000, 'private', 1, 'OCCUPIED',  3.0, 4.0),
  ('F3', 'deluxe',  1400000, 'private', 1, 'AVAILABLE', 3.0, 3.5),
  ('F4', 'reguler', 1250000, 'private', 1, 'AVAILABLE', 2.5, 3.5),
  ('F5', 'reguler', 1200000, 'private', 1, 'AVAILABLE', 2.5, 3.5),
  ('F6', 'reguler', 1150000, 'shared',  1, 'RESERVED',  2.5, 3.0),
  ('F7', 'reguler', 1100000, 'shared',  1, 'AVAILABLE', 2.5, 3.0),
  ('F8', 'reguler', 1050000, 'shared',  1, 'AVAILABLE', 2.5, 3.0),
  ('F9', 'ekonomi', 1000000, 'shared',  1, 'AVAILABLE', 2.5, 2.5)
) AS v(room_number, room_type, price, bathroom, occupants, status, width, length)
WHERE p.slug = 'kos-kenanga-putri-depok'
ON CONFLICT (property_id, room_number) DO UPDATE SET
  room_type = EXCLUDED.room_type, monthly_price = EXCLUDED.monthly_price,
  bathroom_type = EXCLUDED.bathroom_type, maximum_occupants = EXCLUDED.maximum_occupants,
  availability_status = EXCLUDED.availability_status,
  area_width = EXCLUDED.area_width, area_length = EXCLUDED.area_length;

INSERT INTO room_facilities (room_id, facility_id)
SELECT r.id, f.id
FROM rooms r
JOIN properties p ON p.id = r.property_id
CROSS JOIN facilities f
WHERE p.slug = 'kos-kenanga-putri-depok'
  AND f.slug = ANY(ARRAY['ac', 'kamar-mandi-dalam', 'kasur', 'lemari', 'meja-belajar'])
ON CONFLICT (room_id, facility_id) DO NOTHING;

-- ─── Kampus (acuan peta lokasi) ─────────────────────────────────────────────
-- Dipakai fitur "kos sekitar kampus" di beranda.
--
-- Koordinat di bawah adalah PERKIRAAN yang dibulatkan ke pusat kampus, bukan
-- hasil survei: cukup untuk mengurutkan dan menyaring berdasarkan jarak (galat
-- beberapa ratus meter tidak mengubah peringkat pada radius 5 km), tetapi tidak
-- boleh dipakai untuk navigasi atau klaim jarak yang presisi.
--
-- Isinya sengaja tersebar di banyak kota, bukan hanya pulau Jawa, supaya
-- tampilan "kampus populer" di beranda tetap masuk akal ketika nanti diisi data
-- properti dari kota lain.
--
-- `is_popular` menandai kampus yang paling dikenal. Yang dipilih adalah kampus
-- dengan jumlah properti terdekat terbanyak pada data demo, karena fitur di
-- beranda menampilkan keduanya berdampingan: kampus populer yang tidak punya
-- satu pun kos di sekitarnya hanya akan tampil sebagai kartu kosong.

INSERT INTO campuses (name, slug, abbreviation, city, province, latitude, longitude, is_popular)
VALUES
  ('Universitas Indonesia',            'universitas-indonesia',            'UI',     'Depok',         'Jawa Barat',        -6.3608000, 106.8272000, true),
  ('Institut Teknologi Bandung',       'institut-teknologi-bandung',       'ITB',    'Bandung',       'Jawa Barat',        -6.8915000, 107.6107000, true),
  ('Universitas Gadjah Mada',          'universitas-gadjah-mada',          'UGM',    'Sleman',        'DI Yogyakarta',     -7.7713000, 110.3777000, true),
  ('Universitas Brawijaya',            'universitas-brawijaya',            'UB',     'Malang',        'Jawa Timur',        -7.9526000, 112.6145000, true),
  ('Universitas Airlangga',            'universitas-airlangga',            'Unair',  'Surabaya',      'Jawa Timur',        -7.2682000, 112.7590000, true),
  ('Institut Teknologi Sepuluh Nopember', 'institut-teknologi-sepuluh-nopember', 'ITS', 'Surabaya',    'Jawa Timur',        -7.2819000, 112.7952000, true),
  ('Universitas Diponegoro',           'universitas-diponegoro',           'Undip',  'Semarang',      'Jawa Tengah',       -7.0499000, 110.4381000, true),
  ('Universitas Hasanuddin',           'universitas-hasanuddin',           'Unhas',  'Makassar',      'Sulawesi Selatan',  -5.1344000, 119.4876000, true),
  ('Universitas Sumatera Utara',       'universitas-sumatera-utara',       'USU',    'Medan',         'Sumatera Utara',     3.5624000,  98.6564000, false),
  ('Universitas Udayana',              'universitas-udayana',              'Unud',   'Denpasar',      'Bali',              -8.7973000, 115.1739000, false),
  ('Universitas Sebelas Maret',        'universitas-sebelas-maret',        'UNS',    'Surakarta',     'Jawa Tengah',       -7.5590000, 110.8564000, false),
  ('Universitas Padjadjaran',          'universitas-padjadjaran',          'Unpad',  'Sumedang',      'Jawa Barat',        -6.9266000, 107.7736000, false),
  ('Universitas Negeri Malang',        'universitas-negeri-malang',        'UM',     'Malang',        'Jawa Timur',        -7.9628000, 112.6188000, false),
  ('Universitas Sanata Dharma',        'universitas-sanata-dharma',        'USD',    'Sleman',        'DI Yogyakarta',     -7.7797000, 110.3969000, false),
  ('Universitas Muhammadiyah Malang',  'universitas-muhammadiyah-malang',  'UMM',    'Malang',        'Jawa Timur',        -7.9217000, 112.5954000, false),
  ('Universitas Katolik Parahyangan',  'universitas-katolik-parahyangan',  'Unpar',  'Bandung',       'Jawa Barat',        -6.8740000, 107.6050000, false),
  ('Universitas Negeri Semarang',      'universitas-negeri-semarang',      'Unnes',  'Semarang',      'Jawa Tengah',       -7.0500000, 110.3900000, false),
  ('Universitas Trisakti',             'universitas-trisakti',             'Usakti', 'Jakarta Barat', 'DKI Jakarta',       -6.1674000, 106.7900000, false),
  ('Universitas Bina Nusantara',       'universitas-bina-nusantara',       'BINUS',  'Jakarta Barat', 'DKI Jakarta',       -6.2018000, 106.7817000, false),
  ('Universitas Andalas',              'universitas-andalas',              'Unand',  'Padang',        'Sumatera Barat',    -0.9146000, 100.3434000, false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  abbreviation = EXCLUDED.abbreviation,
  city = EXCLUDED.city,
  province = EXCLUDED.province,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  is_popular = EXCLUDED.is_popular;

-- ─── Daerah (acuan area terpopuler) ─────────────────────────────────────────
-- Dipakai fitur "area kos terpopuler" di beranda.
--
-- Isinya wajib mencakup setiap kota dan kecamatan yang sudah dipakai properti di
-- atas, kalau tidak, area itu tidak akan pernah muncul walau kosnya ada, dan
-- yang tampil justru area kosong. Karena itu daftarnya diturunkan dari data
-- properti di berkas ini, bukan dikarang terpisah.
--
-- `type` menentukan cara pencocokan ke properti: CITY dicocokkan ke kolom
-- `properties.city`, DISTRICT ke `properties.district`. Perhatikan bahwa nama
-- yang sama bisa muncul di kedua jenis, "Depok" adalah kota di Jawa Barat
-- sekaligus kecamatan di Sleman, sehingga slug-nya dibedakan (`depok` dan
-- `depok-sleman`) dan pencocokannya selalu lewat `type`, bukan lewat nama saja.
--
-- Koordinatnya pusat kota/kecamatan dan sama seperti kampus: perkiraan yang
-- dibulatkan, untuk mengurutkan dan menampilkan peta, bukan untuk navigasi.

INSERT INTO regions (name, slug, type, city, province, latitude, longitude, is_popular)
VALUES
  -- Kota
  ('Jakarta Selatan', 'jakarta-selatan', 'CITY', 'Jakarta Selatan', 'DKI Jakarta',      -6.2615000, 106.8106000, true),
  ('Bandung',         'bandung',         'CITY', 'Bandung',         'Jawa Barat',       -6.9175000, 107.6191000, true),
  ('Surabaya',        'surabaya',        'CITY', 'Surabaya',        'Jawa Timur',       -7.2575000, 112.7521000, true),
  ('Depok',           'depok',           'CITY', 'Depok',           'Jawa Barat',       -6.4025000, 106.7942000, true),
  ('Yogyakarta',      'yogyakarta',      'CITY', 'Yogyakarta',      'DI Yogyakarta',    -7.7956000, 110.3695000, true),
  ('Malang',          'malang',          'CITY', 'Malang',          'Jawa Timur',       -7.9666000, 112.6326000, true),
  ('Sleman',          'sleman',          'CITY', 'Sleman',          'DI Yogyakarta',    -7.7163000, 110.3554000, false),
  ('Semarang',        'semarang',        'CITY', 'Semarang',        'Jawa Tengah',      -6.9932000, 110.4203000, false),
  ('Makassar',        'makassar',        'CITY', 'Makassar',        'Sulawesi Selatan', -5.1477000, 119.4327000, false),
  ('Medan',           'medan',           'CITY', 'Medan',           'Sumatera Utara',    3.5952000,  98.6722000, false),
  ('Denpasar',        'denpasar',        'CITY', 'Denpasar',        'Bali',             -8.6705000, 115.2126000, false),
  ('Surakarta',       'surakarta',       'CITY', 'Surakarta',       'Jawa Tengah',      -7.5755000, 110.8243000, false),

  -- Kecamatan
  ('Kebayoran Baru',  'kebayoran-baru',  'DISTRICT', 'Jakarta Selatan', 'DKI Jakarta',  -6.2435000, 106.7992000, true),
  ('Coblong',         'coblong',         'DISTRICT', 'Bandung',         'Jawa Barat',   -6.8856000, 107.6139000, true),
  ('Lowokwaru',       'lowokwaru',       'DISTRICT', 'Malang',          'Jawa Timur',   -7.9429000, 112.6117000, true),
  ('Beji',            'beji',            'DISTRICT', 'Depok',           'Jawa Barat',   -6.3689000, 106.8305000, true),
  ('Depok',           'depok-sleman',    'DISTRICT', 'Sleman',          'DI Yogyakarta',-7.7297000, 110.3836000, false),
  ('Gubeng',          'gubeng',          'DISTRICT', 'Surabaya',        'Jawa Timur',   -7.2653000, 112.7477000, false),
  ('Jatinangor',      'jatinangor',      'DISTRICT', 'Sumedang',        'Jawa Barat',   -6.9266000, 107.7736000, false),
  ('Setiabudi',       'setiabudi',       'DISTRICT', 'Jakarta Selatan', 'DKI Jakarta',  -6.2200000, 106.8300000, false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  city = EXCLUDED.city,
  province = EXCLUDED.province,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  is_popular = EXCLUDED.is_popular;

-- Ringkasan hasil seed, supaya satu kali jalan langsung terlihat apa yang masuk.
-- Diletakkan sebelum COMMIT karena _seed_properties dibuat dengan ON COMMIT DROP.
SELECT
  (SELECT count(*) FROM users WHERE email LIKE '%@kosplatform.test') AS akun_demo,
  (SELECT count(*) FROM facilities)                                  AS fasilitas,
  (SELECT count(*) FROM properties
    WHERE slug IN (SELECT slug FROM _seed_properties))               AS properti,
  (SELECT count(*) FROM rooms)                                       AS kamar,
  (SELECT count(*) FROM cost_components)                             AS komponen_biaya,
  (SELECT count(*) FROM campuses)                                    AS kampus,
  (SELECT count(*) FROM regions)                                     AS daerah;

COMMIT;
