import { z } from 'npm:zod@3'

/** Isi permintaan untuk menambah properti ke daftar favorit. */
export const addFavoriteSchema = z.object({
  propertyId: z.string().uuid('ID properti tidak valid'),
})

/** ID properti pada alamat, dipakai saat menghapus favorit. */
export const propertyIdParam = (nilai: string): string =>
  z.string().uuid('ID properti tidak valid').parse(nilai)

export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>
