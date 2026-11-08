import { query, queryOne } from '../../lib/db'
import { HttpError } from '../../lib/httpError'
import { propertiesService } from '../properties/properties.service'

/**
 * Daftar favorit pengguna.
 *
 * Isinya dikembalikan dalam bentuk kartu properti yang sama dengan halaman
 * pencarian, bukan sekadar daftar id. Pengunjung membuka halaman favorit untuk
 * melihat kosnya, jadi mengirim id saja memaksa frontend memanggil API sekali
 * lagi untuk setiap baris.
 */
export const favoritesService = {
  async list(userId: string) {
    const rows = await query<{ property_id: string }>(
      `SELECT property_id
       FROM favorites
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    )

    // properti yang sudah tidak dipublikasikan tidak ikut tampil: kartunya
    // akan menuju halaman yang tidak ada, dan itu membuat favorit terasa rusak.
    const items = await propertiesService.listPublicByIds(rows.map((row) => row.property_id))

    return {
      items,
      meta: { total: items.length },
    }
  },

  async add(userId: string, propertyId: string) {
    // Properti diperiksa dulu, bukan langsung disisipkan: menyimpan id yang
    // tidak ada hanya menghasilkan baris yatim, dan pengunjung tidak tahu
    // kenapa kosnya tidak pernah muncul.
    const properti = await queryOne<{ id: string }>(
      `SELECT id FROM properties
       WHERE id = $1
         AND deleted_at IS NULL
         AND publication_status = 'PUBLISHED'
         AND verification_status = 'VERIFIED'`,
      [propertyId],
    )

    if (!properti) {
      throw new HttpError(404, 'Properti tidak ditemukan')
    }

    // Menekan tombol favorit dua kali, atau dari dua tab, tidak boleh jadi
    // galat: hasilnya sama, dan yang penting tidak ada baris ganda.
    await query(
      `INSERT INTO favorites (user_id, property_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, property_id) DO NOTHING`,
      [userId, propertyId],
    )

    return { propertyId, favorited: true }
  },

  async remove(userId: string, propertyId: string) {
    const rows = await query<{ id: string }>(
      `DELETE FROM favorites
       WHERE user_id = $1 AND property_id = $2
       RETURNING id`,
      [userId, propertyId],
    )

    if (rows.length === 0) {
      throw new HttpError(404, 'Properti itu tidak ada di daftar favorit')
    }

    return { propertyId, favorited: false }
  },

  /** Kumpulan id properti yang difavoritkan, untuk menandai kartu di daftar. */
  async idsOf(userId: string): Promise<string[]> {
    const rows = await query<{ property_id: string }>(
      `SELECT property_id FROM favorites WHERE user_id = $1`,
      [userId],
    )

    return rows.map((row) => row.property_id)
  },
}
