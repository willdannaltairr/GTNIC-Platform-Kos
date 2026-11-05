import type { FC, ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
type ButtonVariant = 'primary' | 'glass' | 'outline' | 'dark' | 'onDark'
type ButtonSize = 'sm' | 'md' | 'lg'
interface ButtonClassOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}
interface ButtonLinkProps extends ButtonClassOptions {
  href: string
  children: ReactNode
  onClick?: () => void
}
const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgba(30,133,56,0.7)] hover:bg-primary-strong',
  glass: 'bg-white/80 text-foreground ring-1 ring-black/5 backdrop-blur-md hover:bg-white',
  outline: 'border border-border bg-white/60 text-foreground hover:bg-white',
  dark: 'bg-foreground text-white hover:bg-forest',
  onDark: 'bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-md hover:bg-white/15',
}
const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-[15px]',
}
export const buttonClasses = ({ variant = 'primary', size = 'md', className }: ButtonClassOptions = {}): string => {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[color,background-color,transform] duration-300 active:scale-[0.97]',
    '[&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg:last-child]:translate-x-1',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-60',
    variants[variant],
    sizes[size],
    className,
  )
}
export const ButtonLink: FC<ButtonLinkProps> = ({ href, children, onClick, variant, size, className }): ReactNode => {
  return (
    <Link href={href} onClick={onClick} className={buttonClasses({ variant, size, className })}>
      {' '}
      {children}{' '}
    </Link>
  )
}
