interface LogoIconProps {
  className?: string
}

export default function LogoIcon({ className = 'size-4' }: LogoIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 2a1 1 0 0 0-1 1v1H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1V3a1 1 0 1 0-2 0v1H7V3a1 1 0 0 0-1-1zM4 8h16v12H4V8zm2 3a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H6zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H6z" />
    </svg>
  )
}
