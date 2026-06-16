import LogoIcon from '../icons/LogoIcon'
import { RESTAURANT_NAME } from '../constants'

export default function TopBar() {
  return (
    <header
      className="sticky top-0 z-40 w-full border-b"
      style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.06)' }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <div
            className="flex size-8 items-center justify-center rounded-md"
            style={{ background: 'var(--teal)' }}
          >
            <LogoIcon className="size-4 text-white" />
          </div>
          <div className="leading-tight">
            <div
              className="font-medium text-sm"
              data-testid="topbar-restaurant-name"
            >
              {RESTAURANT_NAME}
            </div>
            <div className="text-xs" style={{ color: 'var(--taupe)' }}>
              Group order &middot;{' '}
              <span style={{ color: 'var(--teal)' }}>Open</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
