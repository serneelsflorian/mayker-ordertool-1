import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary'
}

export default function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-teal text-white',
    secondary: 'bg-[rgba(154,191,203,0.25)] text-[#1f4854]',
  }
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
