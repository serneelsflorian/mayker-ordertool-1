import EmptyState from './ui/EmptyState'
import MenuItemRow from './MenuItemRow'
import type { MenuItem } from '../api/types'

interface MenuItemListProps {
  items: MenuItem[]
  onRemove: (id: string) => Promise<void>
}

export default function MenuItemList({ items, onRemove }: MenuItemListProps) {
  if (items.length === 0) {
    return <EmptyState text="No menu items yet. Add your first item above." />
  }

  return (
    <ul data-testid="menu-item-list" className="grid gap-2">
      {items.map((item) => (
        <MenuItemRow key={item.id} item={item} onRemove={onRemove} />
      ))}
    </ul>
  )
}
