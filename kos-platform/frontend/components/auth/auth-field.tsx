'use client'

import type { ReactNode } from 'react'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface AuthFieldProps {
  id: string
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'password'
  autoComplete: string
  placeholder?: string
  required?: boolean
  minLength?: number
  children?: ReactNode
}

/**
 * Satu isian pada formulir autentikasi: label kecil di atas, kotak isian
 * berbentuk pil, dan, khusus password, tombol lihat/sembunyikan.
 *
 * Dipakai bersama oleh formulir masuk dan daftar supaya keduanya mustahil
 * berbeda gaya. Isiannya diberi latar kartu tanpa garis tepi: di atas latar
 * halaman yang lembut, kotak bergaris membuat formulir terlihat seperti lembar
 * isian, bukan bagian dari halaman. Garis tepi baru muncul saat isian itu
 * dipakai.
 *
 * Nilainya dikendalikan pemanggil karena formulir daftar perlu membacanya
 * untuk menyalakan penanda syarat password.
 */
export function AuthField({
  id,
  name,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  placeholder,
  required,
  minLength,
  children,
}: AuthFieldProps) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>

      <div className="relative mt-1">
        <input
          id={id}
          name={name}
          type={isPassword && visible ? 'text' : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`w-full rounded-full bg-card px-5 py-2.5 text-sm text-foreground outline-none ring-1 ring-border/70 transition-shadow placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary ${
            isPassword ? 'pr-12' : ''
          }`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        )}
      </div>

      {children}
    </div>
  )
}
