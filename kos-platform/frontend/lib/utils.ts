import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Gabungan clsx + tailwind-merge.
 *
 * Dipakai komponen landing yang menggabungkan kelas bawaan dengan kelas dari
 * pemanggil: tanpa twMerge, dua nilai untuk properti yang sama (mis. `p-4` dan
 * `p-8`) sama-sama terkirim dan pemenangnya ditentukan urutan di stylesheet,
 * bukan urutan penulisan.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))
