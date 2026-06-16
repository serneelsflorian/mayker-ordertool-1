import { Link } from 'lucide-react'
import Button from './ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import Separator from './ui/Separator'
import MenuItemForm from './MenuItemForm'
import MenuItemList from './MenuItemList'
import { RESTAURANT_NAME } from '../constants'
import type { CreateMenuItemPayload, MenuItem } from '../api/types'

interface MenuSetupCardProps {
  menuItems: MenuItem[]
  onAddItem: (payload: CreateMenuItemPayload) => Promise<void>
  onRemoveItem: (id: string) => Promise<void>
  isAddingItem?: boolean
}

export default function MenuSetupCard({
  menuItems,
  onAddItem,
  onRemoveItem,
  isAddingItem = false,
}: MenuSetupCardProps) {
  const hasItems = menuItems.length > 0

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Menu setup</CardTitle>
          <p className="text-sm" style={{ color: 'var(--taupe)' }}>
            Restaurant: <span className="text-gray-900">{RESTAURANT_NAME}</span>
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <MenuItemForm onAdd={onAddItem} isSubmitting={isAddingItem} />
          <Separator />
          <MenuItemList items={menuItems} onRemove={onRemoveItem} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              data-testid="generate-link-button"
              disabled={!hasItems}
              aria-label="Generate share link"
              aria-disabled={!hasItems}
            >
              <Link className="size-4" />
              Generate share link
            </Button>
            {!hasItems && (
              <span className="text-xs" style={{ color: 'var(--taupe)' }}>
                Add at least one menu item first.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
