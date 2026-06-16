import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrder } from '../api/orders'

export default function HomePage() {
  const navigate = useNavigate()
  const hasFired = useRef(false)

  useEffect(() => {
    if (hasFired.current) return
    hasFired.current = true

    createOrder()
      .then((order) => {
        navigate(`/order/${order.id}`, { replace: true })
      })
      .catch(() => {
        // Order creation failed; stay on page so user sees the loading message
      })
  }, [navigate])

  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm" style={{ color: 'var(--taupe)' }}>
        Setting up your group order...
      </p>
    </div>
  )
}
