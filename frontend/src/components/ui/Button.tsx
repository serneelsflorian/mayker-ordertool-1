import { forwardRef, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'icon'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

    const variants: Record<string, string> = {
      primary: 'bg-teal text-white hover:bg-teal-600 focus-visible:ring-teal',
      outline: 'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
      ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
    }

    const sizes: Record<string, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      icon: 'size-8 p-1.5',
    }

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'

export default Button
