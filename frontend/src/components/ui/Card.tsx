import { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-black/[0.06] bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`flex flex-col gap-1.5 p-5 pb-3 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className = '', children, ...props }: CardProps) {
  return (
    <h2 className={`text-base font-semibold leading-none ${className}`} {...props}>
      {children}
    </h2>
  )
}

export function CardContent({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`p-5 pt-0 ${className}`} {...props}>
      {children}
    </div>
  )
}
