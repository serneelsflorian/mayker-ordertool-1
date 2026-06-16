import { useState } from 'react'
import { Plus } from 'lucide-react'
import Button from './ui/Button'
import Input from './ui/Input'
import Label from './ui/Label'
import { parseMenuItemInput } from '../lib/validation'
import type { CreateMenuItemPayload } from '../api/types'

interface MenuItemFormProps {
  onAdd: (payload: CreateMenuItemPayload) => Promise<void>
  isSubmitting?: boolean
}

export default function MenuItemForm({ onAdd, isSubmitting = false }: MenuItemFormProps) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({})

  const handleAdd = async () => {
    const validationErrors = parseMenuItemInput({ name, price, category })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const payload: CreateMenuItemPayload = {
      name: name.trim(),
      price: price.trim() !== '' ? price.trim() : null,
      category: category.trim() !== '' ? category.trim() : null,
    }

    await onAdd(payload)
    setName('')
    setPrice('')
    setCategory('')
    setErrors({})
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="menu-item-name">Item name</Label>
        <Input
          id="menu-item-name"
          data-testid="menu-item-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Lasagne"
          hasError={!!errors.name}
          aria-describedby={errors.name ? 'menu-item-name-error' : undefined}
        />
        {errors.name && (
          <span
            id="menu-item-name-error"
            data-testid="menu-item-name-error"
            className="text-xs"
            style={{ color: 'var(--coral)' }}
            role="alert"
          >
            {errors.name}
          </span>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="menu-item-price">Price (optional)</Label>
        <Input
          id="menu-item-price"
          data-testid="menu-item-price-input"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          inputMode="decimal"
          hasError={!!errors.price}
          aria-describedby={errors.price ? 'menu-item-price-error' : undefined}
        />
        {errors.price && (
          <span
            id="menu-item-price-error"
            data-testid="menu-item-price-error"
            className="text-xs"
            style={{ color: 'var(--coral)' }}
            role="alert"
          >
            {errors.price}
          </span>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="menu-item-category">Category (optional)</Label>
        <Input
          id="menu-item-category"
          data-testid="menu-item-category-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Pasta"
        />
      </div>
      <Button
        data-testid="menu-item-add-button"
        onClick={handleAdd}
        disabled={isSubmitting}
        aria-label="Add menu item"
      >
        <Plus className="size-4" />
        Add
      </Button>
    </div>
  )
}
