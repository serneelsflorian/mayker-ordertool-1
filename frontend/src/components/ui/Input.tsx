import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError = false, className = '', ...props }, ref) => {
    const errorClass = hasError
      ? 'border-coral focus-visible:ring-coral'
      : 'border-gray-200 focus-visible:ring-teal'
    return (
      <input
        ref={ref}
        className={`flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${errorClass} ${className}`}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export default Input
