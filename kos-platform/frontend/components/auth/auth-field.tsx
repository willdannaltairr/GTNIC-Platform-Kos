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
 * Satu isian pada formulir autentikasi: label, kotak isian, dan — khusus
 * password — tombol lihat/sembunyikan.
 *
 * Dipakai bersama oleh formulir masuk dan daftar supaya keduanya mustahil
 * berbeda gaya. Isiannya diberi latar sekunder tanpa garis tepi, mengikuti
 * acuan desain: kotak bergaris di dalam kartu putih membuat formulir terlihat
 * seperti lembar isian, bukan satu kesatuan dengan kartunya. Garis tepi baru
 * muncul saat isian itu dipakai.
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
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>

      <div className="relative mt-2">
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
          className={`w-full rounded-xl border border-transparent bg-secondary px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:bg-card ${
            isPassword ? 'pr-12' : ''
          }`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        )}
      </div>

      {children}
    </div>
  )
}
