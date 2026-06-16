import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { addMenuItem, getOrder, removeMenuItem } from '../api/orders'
import type { CreateMenuItemPayload, MenuItem, Order } from '../api/types'
import MenuSetupCard from '../components/MenuSetupCard'

function useOrder(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddingItem, setIsAddingItem] = useState(false)

  const loadOrder = useCallback(async () => {
    try {
      const data = await getOrder(orderId)
      setOrder(data)
      setMenuItems(data.menu_items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  const handleAddItem = useCallback(
    async (payload: CreateMenuItemPayload) => {
      setIsAddingItem(true)
      try {
        const item = await addMenuItem(orderId, payload)
        setMenuItems((prev) => [...prev, item])
      } finally {
        setIsAddingItem(false)
      }
    },
    [orderId],
  )

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      await removeMenuItem(orderId, itemId)
      setMenuItems((prev) => prev.filter((item) => item.id !== itemId))
    },
    [orderId],
  )

  return { order, menuItems, loading, error, isAddingItem, handleAddItem, handleRemoveItem }
}

export default function OrderAdminPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return (
      <div className="py-10 text-center text-sm" style={{ color: 'var(--coral)' }}>
        Invalid order link.
      </div>
    )
  }

  return <OrderAdminPageInner orderId={id} />
}

function OrderAdminPageInner({ orderId }: { orderId: string }) {
  const { order, menuItems, loading, error, isAddingItem, handleAddItem, handleRemoveItem } =
    useOrder(orderId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm" style={{ color: 'var(--taupe)' }}>
          Loading order...
        </p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="py-10 text-center text-sm" style={{ color: 'var(--coral)' }}>
        {error ?? 'Order not found.'}
      </div>
    )
  }

  return (
    <MenuSetupCard
      menuItems={menuItems}
      onAddItem={handleAddItem}
      onRemoveItem={handleRemoveItem}
      isAddingItem={isAddingItem}
    />
  )
}
