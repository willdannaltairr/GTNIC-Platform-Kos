import crypto from 'node:crypto'

import { query, queryOne, withTransaction } from './_shared/db.ts'
import { HttpError } from './_shared/http.ts'
import {
  buildResetUrl,
  buildVerifyUrl,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from './_shared/mailer.ts'
import { authFetch, authJson, type SesiSupabase } from './_shared/supabase.ts'
import { usersService } from './users.service.ts'
import type { ForgotPasswordInput, LoginInput, RegisterInput } from './auth.validator.ts'

/**
 * Autentikasi.
 *
 * Kata sandi dan sesi sekarang dipegang Supabase Auth, tetapi bentuk jawaban,
 * nama cookie, dan seluruh perilaku yang terlihat pengunjung tidak berubah:
 * halaman masuk, daftar, profil, dan alur lupa sandi memanggil alamat yang sama
 * dan membaca `data.user` yang sama seperti sebelumnya.
 *
 * Yang tetap tinggal di database platform adalah profil dan peran, karena
 * seluruh relasi yang sudah ada (properti, booking, kontrak, tagihan) menunjuk
 * ke `public.users`. Satu akun karena itu punya dua baris dengan id yang sama:
 * satu di `auth.users` yang menyimpan sandi dan sesinya, satu di `public.users`
 * yang menyimpan nama, peran, dan statusnya.
 *
 * Verifikasi email tetap alur platform sendiri, bukan alur bawaan Supabase:
 * yang ditandai terverifikasi adalah `public.users.email_verified_at`, dan
 * tautannya memakai token platform. Alasannya token itu sudah teruji di sini
 * (sekali pakai, berlaku 24 jam, dikirim ulang dari halaman profil), sedangkan
 * memakai dua alur verifikasi sekaligus berarti ada dua tempat yang bisa
 * berbeda pendapat soal email mana yang sudah dipastikan.
 */

/** Sidik jari token: yang disimpan hash-nya, bukan tokennya. */
const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex')

/** Lama berlaku tautan atur ulang sandi, dalam menit. */
const MENIT_TAUTAN_SANDI = 60

interface AkunAuth {
  id: string
  email: string | null
}

/**
 * Buat akun di Supabase Auth.
 *
 * `email_confirm` dinyalakan supaya akun bisa langsung dipakai masuk, apa pun
 * setelan konfirmasi email di proyeknya: yang memutuskan email sudah
 * terverifikasi atau belum adalah kolom platform kita sendiri, bukan setelan
 * penyedia identitas. Tanpa ini, akun baru akan ditolak masuk pada proyek yang
 * mewajibkan konfirmasi, dan penyebabnya tidak terlihat dari layar mana pun.
 */
const buatAkunAuth = async (input: {
  email: string
  password: string
  fullName: string
}): Promise<AkunAuth> => {
  try {
    const response = await authFetch('/admin/users', {
      method: 'POST',
      kunci: 'rahasia',
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { full_name: input.fullName },
      }),
    })

    const isi = await authJson<{ id?: string; user?: AkunAuth } | AkunAuth>(
      response,
      'Pendaftaran ditolak',
    )

    const akun = 'user' in isi && isi.user ? isi.user : (isi as AkunAuth)
    if (!akun?.id) {
      throw new HttpError(502, 'Penyedia identitas tidak mengembalikan id akun')
    }

    return { id: akun.id, email: akun.email ?? input.email }
  } catch (error) {
    // Email yang sudah terdaftar dijawab penyedia sebagai 422 dengan kode
    // `email_exists`. Diteruskan apa adanya, halaman daftar akan menampilkan
    // kalimat bahasa Inggris dari penyedia pada kolom yang seharusnya berbunyi
    // "Email sudah terdaftar", dan statusnya pun bukan 409 seperti sebelumnya.
    if (error instanceof HttpError && error.code === 'email_exists') {
      throw new HttpError(409, 'Email sudah terdaftar')
    }

    throw error
  }
}

/** Hapus akun auth yang barisnya gagal dibuat, supaya tidak ada akun yatim. */
const hapusAkunAuth = async (id: string): Promise<void> => {
  try {
    await authFetch(`/admin/users/${id}`, { method: 'DELETE', kunci: 'rahasia' })
  } catch (error) {
    console.error('[auth] gagal membersihkan akun auth yatim:', (error as Error).message)
  }
}

const sesiDari = (isi: SesiSupabase): { accessToken: string; refreshToken: string } => ({
  accessToken: isi.access_token,
  refreshToken: isi.refresh_token,
})

export const authService = {
  /**
   * Daftar akun baru.
   *
   * Urutannya penting: akun identitas dibuat lebih dulu, baru profilnya. Kalau
   * profilnya gagal, akun identitasnya dihapus kembali, sehingga tidak ada akun
   * yang bisa masuk tetapi tidak punya peran dan profil di platform.
   *
   * Peran dibatasi TENANT dan OWNER oleh validator. ADMIN tidak bisa dipilih
   * dari sini, dan itu bukan pembatasan tampilan: nilai yang tidak ada di daftar
   * peran pendaftaran memang tidak pernah sampai ke database.
   */
  async register(input: RegisterInput) {
    const akun = await buatAkunAuth({
      email: input.email,
      password: input.password,
      fullName: input.fullName,
    })

    try {
      const rows = await query<{
        id: string
        full_name: string
        email: string
        role: string
        account_status: string
        created_at: Date
      }>(
        `INSERT INTO users (id, full_name, email, role, account_status)
         VALUES ($1, $2, $3, $4, 'ACTIVE')
         RETURNING id, full_name, email, role, account_status, created_at`,
        [akun.id, input.fullName, input.email, input.role],
      )

      // Tautan verifikasi dikirim saat mendaftar, bukan menunggu pengunjung
      // mencarinya sendiri: alamat email hanya bisa dipastikan benar saat
      // pendaftarannya masih segar di ingatannya.
      const token = await this.createEmailVerificationToken(rows[0].id)

      await sendEmailVerificationEmail({
        to: rows[0].email,
        fullName: rows[0].full_name,
        verifyUrl: buildVerifyUrl(token),
      })

      return { user: rows[0], verifyToken: token }
    } catch (error) {
      await hapusAkunAuth(akun.id)

      if ((error as { code?: string }).code === '23505') {
        throw new HttpError(409, 'Email sudah terdaftar')
      }

      throw error
    }
  },

  /**
   * Masuk dengan email dan sandi.
   *
   * Sandi diperiksa penyedia identitas, dan kegagalannya diseragamkan menjadi
   * satu kalimat. Membedakan "email tidak terdaftar" dari "sandi salah" akan
   * memberi tahu penebak email mana yang punya akun di platform ini.
   */
  async login(input: LoginInput): Promise<{
    user: { id: string; full_name: string; email: string; role: string }
    token: { accessToken: string; refreshToken: string }
  }> {
    const response = await authFetch('/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email: input.email, password: input.password }),
    })

    if (!response.ok) {
      throw new HttpError(401, 'Email atau password salah')
    }

    const isi = (await response.json()) as SesiSupabase
    const user = await usersService.getProfile(isi.user.id)

    if (user.account_status !== 'ACTIVE') {
      throw new HttpError(403, 'Akun tidak aktif')
    }

    await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id])

    return {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
      token: sesiDari(isi),
    }
  },

  /**
   * Perpanjang sesi memakai cookie refresh.
   *
   * Tanpa langkah ini, pengunjung diminta masuk lagi setiap kali token
   * aksesnya habis, padahal sesi penyegarnya masih berlaku berhari-hari dan
   * tidak ada yang memakainya. Penyedia identitas yang menerbitkan sesi baru,
   * jadi token yang diputar pun tokennya, bukan token buatan sendiri.
   */
  async refresh(refreshToken: string): Promise<{
    user: { id: string; full_name: string; email: string; role: string }
    token: { accessToken: string; refreshToken: string }
  }> {
    const response = await authFetch('/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
      throw new HttpError(401, 'Sesi sudah berakhir, silakan masuk kembali')
    }

    const isi = (await response.json()) as SesiSupabase
    const user = await usersService.getProfile(isi.user.id)

    if (user.account_status !== 'ACTIVE') {
      throw new HttpError(403, 'Akun tidak aktif')
    }

    return {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
      token: sesiDari(isi),
    }
  },

  /**
   * Akhiri sesi di sisi penyedia identitas.
   *
   * Kegagalannya tidak dilempar: pengunjung tetap keluar dari layar, dan
   * cookienya tetap dihapus oleh pemanggil. Menahan orang di halaman "masih
   * masuk" hanya karena penyedia tidak terjangkau tidak ada gunanya.
   */
  async logout(accessToken: string | null): Promise<void> {
    if (!accessToken) return

    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          Authorization: `Bearer ${accessToken}`,
        },
      })
    } catch (error) {
      console.error('[auth] gagal mengakhiri sesi di penyedia:', (error as Error).message)
    }
  },

  findByEmail(email: string) {
    return queryOne<{ id: string; full_name: string; email: string }>(
      `SELECT id, full_name, email FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    )
  },

  /**
   * Terbitkan token atur ulang sandi.
   *
   * Tabelnya hanya menyimpan satu baris per akun, jadi permintaan kedua menimpa
   * baris yang ada. Itu sekaligus memberi perilaku yang diinginkan: hanya tautan
   * terbaru yang berlaku, dan permintaan berulang tidak meninggalkan kunci
   * aktif yang tidak lagi diketahui pemiliknya.
   */
  async createPasswordResetToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('base64url')

    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, now() + interval '${MENIT_TAUTAN_SANDI} minutes')
       ON CONFLICT (user_id) DO UPDATE
       SET token = EXCLUDED.token,
           expires_at = EXCLUDED.expires_at,
           used_at = NULL,
           created_at = now()`,
      [userId, hashToken(token)],
    )

    return token
  },

  /**
   * Ganti sandi memakai token.
   *
   * Tiga hal harus berhasil bersama: sandi diganti di penyedia identitas, token
   * ditandai terpakai, dan seluruh sesi lama diakhiri. Kalau salah satunya
   * tertinggal, penggantian sandi tidak benar-benar mengusir siapa pun, dan
   * itulah satu-satunya alasan orang mengganti sandinya.
   */
  async resetPassword(token: string, password: string): Promise<void> {
    const row = await queryOne<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token = $1 AND used_at IS NULL AND expires_at > now()`,
      [hashToken(token)],
    )

    if (!row) {
      throw new HttpError(400, 'Tautan atur ulang sandi tidak berlaku atau sudah kedaluwarsa')
    }

    const response = await authFetch(`/admin/users/${row.user_id}`, {
      method: 'PUT',
      kunci: 'rahasia',
      body: JSON.stringify({ password }),
    })

    await authJson(response, 'Sandi gagal diperbarui')

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE users SET password_changed_at = now(), updated_at = now() WHERE id = $1`,
        [row.user_id],
      )
      await client.query(`UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`, [row.id])
    })

    // Mengakhiri seluruh sesi yang sedang berjalan. Kalau penyedianya menolak,
    // penggantian sandi tetap sah dan itu dicatat di log alih-alih menjadikan
    // permintaan yang sudah berhasil tampak gagal.
    try {
      await authFetch(`/admin/users/${row.user_id}/logout`, { method: 'POST', kunci: 'rahasia' })
    } catch (error) {
      console.error('[auth] sesi lama tidak bisa diakhiri:', (error as Error).message)
    }
  },

  /**
   * Terbitkan token verifikasi email.
   *
   * Sebentuk dengan token sandi, bedanya hanya masa berlaku: 24 jam, karena
   * tautan verifikasi wajar dibuka beberapa jam setelah emailnya masuk.
   */
  async createEmailVerificationToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('base64url')

    await query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, now() + interval '24 hours')
       ON CONFLICT (user_id) DO UPDATE
       SET token = EXCLUDED.token,
           expires_at = EXCLUDED.expires_at,
           used_at = NULL,
           created_at = now()`,
      [userId, hashToken(token)],
    )

    return token
  },

  /**
   * Tandai email pemilik token sebagai terverifikasi.
   *
   * Tautan yang sudah dipakai tetap dijawab sukses selama emailnya memang sudah
   * terverifikasi: halaman yang dimuat ulang setelah verifikasi berhasil tidak
   * boleh berubah menjadi pesan gagal. Yang dilaporkan adalah keadaan akhirnya,
   * bukan berapa kali tautannya dibuka.
   */
  async verifyEmail(token: string): Promise<void> {
    const row = await queryOne<{
      id: string
      user_id: string
      used_at: Date | null
      kedaluwarsa: boolean
      email_verified_at: Date | null
    }>(
      `SELECT t.id, t.user_id, t.used_at, t.expires_at <= now() AS kedaluwarsa,
              u.email_verified_at
       FROM email_verification_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token = $1`,
      [hashToken(token)],
    )

    if (!row || row.kedaluwarsa) {
      throw new HttpError(400, 'Tautan verifikasi email tidak berlaku atau sudah kedaluwarsa')
    }

    if (row.used_at) {
      if (row.email_verified_at) return
      throw new HttpError(400, 'Tautan verifikasi email tidak berlaku atau sudah kedaluwarsa')
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE users SET email_verified_at = now(), updated_at = now()
         WHERE id = $1 AND email_verified_at IS NULL`,
        [row.user_id],
      )
      await client.query(`UPDATE email_verification_tokens SET used_at = now() WHERE id = $1`, [row.id])
    })
  },

  /** Isi permintaan lupa sandi: token mentah hanya untuk pengembangan. */
  async forgotPassword(input: ForgotPasswordInput): Promise<string | null> {
    const user = await this.findByEmail(input.email)
    if (!user) return null

    const token = await this.createPasswordResetToken(user.id)

    await sendPasswordResetEmail({
      to: user.email,
      fullName: user.full_name,
      resetUrl: buildResetUrl(token),
    })

    return token
  },
}
