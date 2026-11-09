import { query, queryOne, withTransaction } from './_shared/db.ts'
import { HttpError } from './_shared/http.ts'
import {
  deleteDocumentObject,
  documentSignedUrl,
  extensionFor,
  sniffImageType,
  uploadDocumentObject,
  type BerkasUnggahan,
} from './_shared/storage.ts'
import type { AuthUser } from './_shared/auth.ts'
import {
  LABEL_DOKUMEN,
  type ListOwnersQuery,
  type UploadDocumentInput,
  type VerifyOwnerInput,
} from './owner-verification.validator.ts'

/**
 * Verifikasi pemilik kos.
 *
 * Akun pemilik bisa dipakai sejak awal, tetapi kosnya hanya boleh terbit
 * setelah pemiliknya terverifikasi. Verifikasi itu jawaban atas satu
 * pertanyaan: orang ini benar pemilik kos yang dia daftarkan, atau bukan.
 * Karena itu buktinya dokumen identitas, bukan sekadar formulir.
 *
 * Alur lengkapnya: pemilik mengunggah dokumen satu per satu, menekan kirim,
 * admin memutuskan, dan keputusannya terlihat pemilik beserta alasannya bila
 * ditolak. Setelah ditolak, pemilik boleh mengganti dokumennya dan mengirim
 * ulang, jadi penolakan bukan jalan buntu.
 */

/** Status keseluruhan pengajuan verifikasi pemilik. */
export type StatusVerifikasiPemilik = 'NOT_SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'

/**
 * Dokumen yang wajib ada sebelum pengajuan bisa dikirim.
 *
 * KTP membuktikan identitasnya, swafoto dengan KTP membuktikan orang yang
 * mengunggah memang memegang KTP itu. Dua-duanya yang menutup celah pemakaian
 * identitas orang lain; sisanya hanya menambah keyakinan.
 */
const WAJIB = ['KTP', 'SELFIE_KTP'] as const

/** Lama berlaku URL bertanda tangan dokumen, dalam detik. */
const MASA_TAUTAN_DOKUMEN = 300

interface DokumenRow {
  id: string
  document_type: string
  verification_status: string
  rejection_reason: string | null
  created_at: Date
  storage_path: string
}

const tanggal = (nilai: Date | null): string | null =>
  nilai === null
    ? null
    : nilai instanceof Date
      ? nilai.toISOString()
      : new Date(String(nilai)).toISOString()

/**
 * Hanya akun pemilik yang punya urusan di sini.
 *
 * Admin punya endpoint sendiri di panel admin: alurnya berbeda (admin meninjau
 * pengajuan orang lain, pemilik mengurus miliknya), dan menyatukan keduanya di
 * satu endpoint berarti setiap pemeriksaan kepemilikan harus bercabang.
 */
const pastikanPemilik = (user: AuthUser): void => {
  if (user.role !== 'OWNER') {
    throw new HttpError(403, 'Verifikasi pemilik hanya untuk akun pemilik kos')
  }
}

const TAHAP_DOKUMEN_BERUBAH: Record<string, string> = {
  UNDER_REVIEW: 'Pengajuan Anda sedang ditinjau admin. Tunggu keputusannya sebelum mengganti dokumen.',
  VERIFIED: 'Verifikasi Anda sudah selesai, dokumennya tidak perlu diganti lagi.',
}

const tolakBilaDiputuskan = (status: string): void => {
  const pesan = TAHAP_DOKUMEN_BERUBAH[status]
  if (pesan) throw new HttpError(400, pesan)
}

/** Dokumen beserta tautan bertanda tangan yang berlaku beberapa menit. */
const toDokumen = async (row: DokumenRow) => ({
  id: row.id,
  documentType: row.document_type,
  label: LABEL_DOKUMEN[row.document_type] ?? row.document_type,
  verificationStatus: row.verification_status,
  rejectionReason: row.rejection_reason,
  createdAt: tanggal(row.created_at),
  signedUrl: await documentSignedUrl(row.storage_path, MASA_TAUTAN_DOKUMEN),
})

const dokumenMilik = (ownerId: string): Promise<DokumenRow[]> =>
  query<DokumenRow>(
    `SELECT id, document_type, verification_status, rejection_reason, created_at, storage_path
     FROM owner_verification_documents
     WHERE owner_id = $1
     ORDER BY created_at`,
    [ownerId],
  )

export const ownerVerificationService = {
  /** Keadaan verifikasi pemilik yang sedang masuk, beserta dokumennya. */
  async getMine(user: AuthUser) {
    pastikanPemilik(user)

    const profil = await queryOne<{
      identity_verification_status: string
      identity_document_status: string
      business_name: string | null
      verified_at: Date | null
    }>(
      `SELECT identity_verification_status, identity_document_status, business_name, verified_at
       FROM owner_profiles
       WHERE user_id = $1`,
      [user.userId],
    )

    const rows = await dokumenMilik(user.userId)

    return {
      status: profil?.identity_verification_status ?? 'NOT_SUBMITTED',
      documentStatus: profil?.identity_document_status ?? 'NOT_SUBMITTED',
      businessName: profil?.business_name ?? null,
      verifiedAt: tanggal(profil?.verified_at ?? null),
      /**
       * Alasan penolakan dibaca dari dokumen yang ditolak, bukan dari kolom
       * tersendiri di profil. Keputusannya memang per pengajuan, tetapi tempat
       * menyimpannya per dokumen, dan yang perlu dibaca pemilik cukup satu
       * kalimat yang sama untuk semuanya.
       */
      rejectionReason: rows.find((row) => row.rejection_reason)?.rejection_reason ?? null,
      requiredDocuments: [...WAJIB],
      documents: await Promise.all(rows.map(toDokumen)),
    }
  },

  /**
   * Unggah satu dokumen, atau ganti dokumen jenis itu yang sudah ada.
   *
   * Mengganti, bukan menambah baris baru: yang berlaku hanya dokumen terakhir,
   * dan dokumen lama langsung dihapus dari penyimpanan supaya tidak ada
   * identitas basi yang masih bisa dibuka admin.
   */
  async uploadDocument(user: AuthUser, input: UploadDocumentInput, berkas: BerkasUnggahan) {
    pastikanPemilik(user)

    const profil = await queryOne<{ identity_verification_status: string }>(
      `SELECT identity_verification_status FROM owner_profiles WHERE user_id = $1`,
      [user.userId],
    )

    tolakBilaDiputuskan(profil?.identity_verification_status ?? 'NOT_SUBMITTED')

    // Jenis berkas ditentukan dari isinya, bukan dari Content-Type yang dikirim
    // klien: yang terakhir itu bisa ditulis apa saja.
    const mime = sniffImageType(berkas.bytes)
    if (!mime) {
      throw new HttpError(400, 'Berkas yang dikirim bukan gambar JPEG, PNG, atau WebP')
    }

    // Nama objek selalu dibuat server dan selalu di dalam folder pemiliknya,
    // sehingga nama berkas dari klien tidak pernah menentukan lokasinya.
    const objectPath = `${user.userId}/${crypto.randomUUID()}.${extensionFor(mime)}`
    await uploadDocumentObject(objectPath, berkas.bytes, mime)

    let lama: string | null = null

    try {
      const hasil = await withTransaction(async (client) => {
        // Baris profil dibuat di sini kalau belum ada. Tabelnya yang menyimpan
        // status, dan pemilik yang baru pertama kali mengunggah belum punya
        // barisnya sama sekali.
        await client.query(
          `INSERT INTO owner_profiles (user_id) VALUES ($1)
           ON CONFLICT (user_id) DO NOTHING`,
          [user.userId],
        )

        const sebelumnya = await client.query<{ storage_path: string }>(
          `SELECT storage_path FROM owner_verification_documents
           WHERE owner_id = $1 AND document_type = $2`,
          [user.userId, input.documentType],
        )
        lama = sebelumnya[0]?.storage_path ?? null

        const rows = await client.query<DokumenRow>(
          `INSERT INTO owner_verification_documents (owner_id, document_type, storage_path)
           VALUES ($1, $2, $3)
           ON CONFLICT (owner_id, document_type) DO UPDATE
           SET storage_path = EXCLUDED.storage_path,
               verification_status = 'PENDING',
               rejection_reason = NULL,
               reviewed_by = NULL,
               reviewed_at = NULL,
               created_at = now()
           RETURNING id, document_type, verification_status, rejection_reason, created_at, storage_path`,
          [user.userId, input.documentType, objectPath],
        )

        return rows[0]
      })

      if (lama && lama !== objectPath) await deleteDocumentObject(lama)

      return await toDokumen(hasil)
    } catch (error) {
      // Berkas baru sudah terunggah tetapi barisnya gagal: tanpa pembersihan
      // ini berkas itu tidak akan pernah bisa dijangkau lagi dari mana pun.
      await deleteDocumentObject(objectPath)
      throw error
    }
  },

  /** Hapus satu dokumen yang belum dikirim, atau yang pengajuannya ditolak. */
  async removeDocument(user: AuthUser, documentId: string) {
    pastikanPemilik(user)

    const profil = await queryOne<{ identity_verification_status: string }>(
      `SELECT identity_verification_status FROM owner_profiles WHERE user_id = $1`,
      [user.userId],
    )

    tolakBilaDiputuskan(profil?.identity_verification_status ?? 'NOT_SUBMITTED')

    const storagePath = await withTransaction(async (client) => {
      // `owner_id` ikut jadi syarat: tanpa itu, id dokumen milik pemilik lain
      // bisa dihapus lewat akun ini.
      const rows = await client.query<{ storage_path: string }>(
        `DELETE FROM owner_verification_documents
         WHERE id = $1 AND owner_id = $2
         RETURNING storage_path`,
        [documentId, user.userId],
      )

      const row = rows[0]
      if (!row) {
        throw new HttpError(404, 'Dokumen tidak ditemukan pada akun Anda')
      }

      return row.storage_path
    })

    await deleteDocumentObject(storagePath)

    return { id: documentId }
  },

  /**
   * Kirim pengajuan verifikasi.
   *
   * Kelengkapannya diperiksa di sini, bukan hanya di layar. Layar bisa dilewati
   * (permintaan langsung ke API), sedangkan pengajuan setengah lengkap memaksa
   * admin membuka berkas yang tidak ada gunanya dan menolak pengajuan yang
   * sebenarnya bisa diselesaikan pemiliknya sendiri dalam satu menit.
   */
  async submit(user: AuthUser) {
    pastikanPemilik(user)

    const rows = await dokumenMilik(user.userId)
    const ada = new Set(rows.map((row) => row.document_type))
    const kurang = WAJIB.filter((jenis) => !ada.has(jenis))

    if (kurang.length > 0) {
      const nama = kurang.map((jenis) => LABEL_DOKUMEN[jenis] ?? jenis).join(', ')
      throw new HttpError(400, `Lengkapi dulu dokumen berikut: ${nama}`)
    }

    const hasil = await withTransaction(async (client) => {
      const current = await client.query<{ identity_verification_status: string }>(
        `SELECT identity_verification_status FROM owner_profiles WHERE user_id = $1 FOR UPDATE`,
        [user.userId],
      )

      const status = current[0]?.identity_verification_status ?? 'NOT_SUBMITTED'

      if (status === 'UNDER_REVIEW') {
        throw new HttpError(400, 'Pengajuan Anda sudah dikirim dan sedang ditinjau admin')
      }
      if (status === 'VERIFIED') {
        throw new HttpError(400, 'Akun Anda sudah terverifikasi')
      }

      const updated = await client.query<{ identity_verification_status: string }>(
        `UPDATE owner_profiles
         SET identity_verification_status = 'UNDER_REVIEW', updated_at = now()
         WHERE user_id = $1
         RETURNING identity_verification_status`,
        [user.userId],
      )

      return updated[0]
    })

    return { status: hasil.identity_verification_status }
  },

  /**
   * Daftar pemilik untuk admin.
   *
   * Yang menunggu keputusan tampil lebih dulu, lalu yang ditolak, lalu yang
   * belum mengajukan. Urutan itu mengikuti pekerjaan admin: keputusan yang
   * menunggu adalah yang paling perlu dikerjakan.
   */
  async listOwners(params: ListOwnersQuery) {
    const conditions: string[] = ['u.deleted_at IS NULL', "u.role = 'OWNER'"]
    const values: unknown[] = []

    if (params.status) {
      values.push(params.status)
      conditions.push(`COALESCE(op.identity_verification_status, 'NOT_SUBMITTED') = $${values.length}`)
    }

    if (params.q) {
      values.push(`%${params.q}%`)
      conditions.push(`(u.full_name ILIKE $${values.length} OR u.email ILIKE $${values.length})`)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const countRow = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM users u
       LEFT JOIN owner_profiles op ON op.user_id = u.id
       ${where}`,
      values,
    )

    const offset = (params.page - 1) * params.limit

    const rows = await query<Record<string, unknown>>(
      `SELECT u.id, u.full_name, u.email, u.phone_number, u.created_at,
              COALESCE(op.identity_verification_status, 'NOT_SUBMITTED') AS status,
              op.business_name, op.verified_at, op.updated_at,
              COALESCE(d.total_dokumen, 0)::int AS total_dokumen
       FROM users u
       LEFT JOIN owner_profiles op ON op.user_id = u.id
       LEFT JOIN (
         SELECT owner_id, count(*) AS total_dokumen
         FROM owner_verification_documents
         GROUP BY owner_id
       ) d ON d.owner_id = u.id
       ${where}
       ORDER BY
         CASE COALESCE(op.identity_verification_status, 'NOT_SUBMITTED')
           WHEN 'UNDER_REVIEW' THEN 0 WHEN 'REJECTED' THEN 1 WHEN 'NOT_SUBMITTED' THEN 2 ELSE 3
         END,
         u.created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, params.limit, offset],
    )

    const total = countRow?.total ?? 0

    return {
      items: rows.map((row) => ({
        id: row.id as string,
        fullName: row.full_name as string,
        email: row.email as string,
        phoneNumber: (row.phone_number as string | null) ?? null,
        status: row.status as string,
        businessName: (row.business_name as string | null) ?? null,
        totalDocuments: Number(row.total_dokumen ?? 0),
        verifiedAt: tanggal((row.verified_at as Date | null) ?? null),
        updatedAt: tanggal((row.updated_at as Date | null) ?? null),
        createdAt: tanggal((row.created_at as Date | null) ?? null),
      })),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    }
  },

  /**
   * Satu pemilik beserta dokumennya, untuk ditinjau admin.
   *
   * URL dokumennya dibuat bertanda tangan dan berlaku lima menit. Cukup lama
   * untuk membuka dan memeriksa berkasnya, cukup pendek sehingga tautannya
   * tidak berguna lagi setelah itu.
   */
  async ownerDetail(ownerId: string) {
    const profil = await queryOne<Record<string, unknown>>(
      `SELECT u.id, u.full_name, u.email, u.phone_number, u.account_status, u.created_at,
              COALESCE(op.identity_verification_status, 'NOT_SUBMITTED') AS status,
              COALESCE(op.identity_document_status, 'NOT_SUBMITTED') AS document_status,
              op.business_name, op.description, op.verified_at, op.updated_at
       FROM users u
       LEFT JOIN owner_profiles op ON op.user_id = u.id
       WHERE u.id = $1 AND u.deleted_at IS NULL AND u.role = 'OWNER'`,
      [ownerId],
    )

    if (!profil) {
      throw new HttpError(404, 'Pemilik tidak ditemukan')
    }

    const rows = await dokumenMilik(ownerId)

    return {
      id: profil.id as string,
      fullName: profil.full_name as string,
      email: profil.email as string,
      phoneNumber: (profil.phone_number as string | null) ?? null,
      accountStatus: profil.account_status as string,
      status: profil.status as string,
      documentStatus: profil.document_status as string,
      businessName: (profil.business_name as string | null) ?? null,
      description: (profil.description as string | null) ?? null,
      verifiedAt: tanggal((profil.verified_at as Date | null) ?? null),
      updatedAt: tanggal((profil.updated_at as Date | null) ?? null),
      createdAt: tanggal((profil.created_at as Date | null) ?? null),
      requiredDocuments: [...WAJIB],
      documents: await Promise.all(rows.map(toDokumen)),
    }
  },

  /**
   * Keputusan admin atas pengajuan verifikasi pemilik.
   *
   * Hanya pengajuan yang sedang ditinjau yang bisa diputuskan. Tanpa batas itu,
   * admin bisa menandai terverifikasi pemilik yang belum pernah mengirim
   * dokumen apa pun, dan status terverifikasi kehilangan artinya.
   *
   * Statusnya berubah bersama seluruh dokumennya, dan keputusannya dicatat di
   * `audit_logs`. Yang dicatat hanya status beserta alasannya, tidak ada isi
   * dokumen maupun data identitas: log audit dibaca banyak orang dan disimpan
   * lama.
   */
  async verifyOwner(admin: AuthUser, ownerId: string, input: VerifyOwnerInput) {
    return withTransaction(async (client) => {
      const pemilik = await client.query<{ id: string }>(
        `SELECT id FROM users
         WHERE id = $1 AND deleted_at IS NULL AND role = 'OWNER'
         FOR UPDATE`,
        [ownerId],
      )

      if (!pemilik[0]) {
        throw new HttpError(404, 'Pemilik tidak ditemukan')
      }

      const profil = await client.query<{ identity_verification_status: string }>(
        `SELECT identity_verification_status FROM owner_profiles WHERE user_id = $1 FOR UPDATE`,
        [ownerId],
      )

      const sebelum = profil[0]?.identity_verification_status ?? 'NOT_SUBMITTED'

      if (sebelum !== 'UNDER_REVIEW') {
        throw new HttpError(
          400,
          sebelum === 'VERIFIED'
            ? 'Pemilik ini sudah terverifikasi'
            : 'Pemilik ini belum mengajukan verifikasi, jadi belum ada yang bisa diputuskan',
        )
      }

      const dokumen = await client.query<{ document_type: string }>(
        `SELECT document_type FROM owner_verification_documents WHERE owner_id = $1`,
        [ownerId],
      )

      const ada = new Set(dokumen.map((row) => row.document_type))
      const kurang = WAJIB.filter((jenis) => !ada.has(jenis))

      if (kurang.length > 0) {
        const nama = kurang.map((jenis) => LABEL_DOKUMEN[jenis] ?? jenis).join(', ')
        throw new HttpError(400, `Pengajuan ini belum lengkap, yang kurang: ${nama}`)
      }

      await client.query(
        `UPDATE owner_profiles
         SET identity_verification_status = $2,
             identity_document_status = $2,
             verified_at = CASE WHEN $2 = 'VERIFIED' THEN now() ELSE NULL END,
             updated_at = now()
         WHERE user_id = $1`,
        [ownerId, input.status],
      )

      await client.query(
        `UPDATE owner_verification_documents
         SET verification_status = $2,
             reviewed_by = $3,
             reviewed_at = now(),
             rejection_reason = CASE WHEN $2 = 'REJECTED' THEN $4 ELSE NULL END
         WHERE owner_id = $1`,
        [ownerId, input.status, admin.userId, input.notes ?? null],
      )

      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values)
         VALUES ($1, 'VERIFIKASI_PEMILIK', 'OWNER_PROFILE', $2, $3::jsonb, $4::jsonb)`,
        [
          admin.userId,
          ownerId,
          JSON.stringify({ identityVerificationStatus: sebelum }),
          JSON.stringify({
            identityVerificationStatus: input.status,
            reason: input.notes ?? null,
          }),
        ],
      )

      return { id: ownerId, status: input.status, previousStatus: sebelum }
    })
  },
}
