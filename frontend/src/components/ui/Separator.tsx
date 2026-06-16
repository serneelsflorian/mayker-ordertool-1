import { HTMLAttributes } from 'react'

export default function Separator({ className = '', ...props }: HTMLAttributes<HTMLHRElement>) {
  return (
    <hr
      className={`border-0 border-t border-black/[0.06] ${className}`}
      {...props}
    />
  )
}
