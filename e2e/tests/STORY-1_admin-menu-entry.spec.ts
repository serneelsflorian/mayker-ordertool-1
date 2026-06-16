import { test, expect } from '@playwright/test'
import { createTestOrder, addTestMenuItem } from '../helpers/order'

test.describe('STORY-1: Admin menu entry', () => {
  test('AC1: restaurant name displayed and form empty on load', async ({ page, request }) => {
    const order = await createTestOrder(request)
    await page.goto(`/order/${order.id}`)

    await expect(page.getByTestId('topbar-restaurant-name')).toHaveText('Trattoria Demo')
    await expect(page.getByTestId('menu-item-name-input')).toHaveValue('')
    await expect(page.getByTestId('menu-item-price-input')).toHaveValue('')
    await expect(page.getByTestId('menu-item-category-input')).toHaveValue('')
    // No items in list
    await expect(page.getByText('No menu items yet. Add your first item above.')).toBeVisible()
  })

  test('AC2: admin adds item with name only (price optional)', async ({ page, request }) => {
    const order = await createTestOrder(request)
    await page.goto(`/order/${order.id}`)

    await page.getByTestId('menu-item-name-input').fill('Garlic Bread')
    await page.getByTestId('menu-item-add-button').click()

    // Item appears in list
    await expect(page.getByTestId('menu-item-list')).toBeVisible()
    await expect(page.getByTestId('menu-item-list')).toContainText('Garlic Bread')
  })

  test('AC2: admin adds item with name, price, and category', async ({ page, request }) => {
    const order = await createTestOrder(request)
    await page.goto(`/order/${order.id}`)

    await page.getByTestId('menu-item-name-input').fill('Margherita')
    await page.getByTestId('menu-item-price-input').fill('9.50')
    await page.getByTestId('menu-item-category-input').fill('Pizza')
    await page.getByTestId('menu-item-add-button').click()

    await expect(page.getByTestId('menu-item-list')).toContainText('Margherita')
    await expect(page.getByTestId('menu-item-list')).toContainText('€9.50')
    await expect(page.getByTestId('menu-item-list')).toContainText('Pizza')
  })

  test('AC3: empty name shows inline error and blocks add', async ({ page, request }) => {
    const order = await createTestOrder(request)
    await page.goto(`/order/${order.id}`)

    await page.getByTestId('menu-item-add-button').click()

    await expect(page.getByTestId('menu-item-name-error')).toBeVisible()
    await expect(page.getByText('No menu items yet. Add your first item above.')).toBeVisible()
  })

  test('AC3: negative price shows inline error and blocks add', async ({ page, request }) => {
    const order = await createTestOrder(request)
    await page.goto(`/order/${order.id}`)

    await page.getByTestId('menu-item-name-input').fill('Item')
    await page.getByTestId('menu-item-price-input').fill('-2')
    await page.getByTestId('menu-item-add-button').click()

    await expect(page.getByTestId('menu-item-price-error')).toBeVisible()
    await expect(page.getByText('No menu items yet. Add your first item above.')).toBeVisible()
  })

  test('AC3: non-numeric price shows inline error', async ({ page, request }) => {
    const order = await createTestOrder(request)
    await page.goto(`/order/${order.id}`)

    await page.getByTestId('menu-item-name-input').fill('Item')
    await page.getByTestId('menu-item-price-input').fill('abc')
    await page.getByTestId('menu-item-add-button').click()

    await expect(page.getByTestId('menu-item-price-error')).toBeVisible()
  })

  test('AC3: empty price with valid name succeeds', async ({ page, request }) => {
    const order = await createTestOrder(request)
    await page.goto(`/order/${order.id}`)

    await page.getByTestId('menu-item-name-input').fill('No-price item')
    // Leave price empty
    await page.getByTestId('menu-item-add-button').click()

    await expect(page.getByTestId('menu-item-list')).toContainText('No-price item')
    await expect(page.getByTestId('menu-item-name-error')).not.toBeVisible()
    await expect(page.getByTestId('menu-item-price-error')).not.toBeVisible()
  })

  test('AC4: added item shows name, price formatted, and category badge', async ({ page, request }) => {
    const order = await createTestOrder(request)
    await page.goto(`/order/${order.id}`)

    await page.getByTestId('menu-item-name-input').fill('Carbonara')
    await page.getByTestId('menu-item-price-input').fill('13.50')
    await page.getByTestId('menu-item-category-input').fill('Pasta')
    await page.getByTestId('menu-item-add-button').click()

    // Find the row and check content
    const list = page.getByTestId('menu-item-list')
    await expect(list).toContainText('Carbonara')
    await expect(list).toContainText('€13.50')
    await expect(list).toContainText('Pasta')
  })

  test('AC5: removing an item updates the list immediately', async ({ page, request }) => {
    const order = await createTestOrder(request)
    // Seed two items via API
    const item1 = await addTestMenuItem(request, order.id, { name: 'Pizza' })
    const item2 = await addTestMenuItem(request, order.id, { name: 'Pasta' })

    await page.goto(`/order/${order.id}`)

    // Both items visible
    await expect(page.getByTestId(`menu-item-row-${item1.id}`)).toBeVisible()
    await expect(page.getByTestId(`menu-item-row-${item2.id}`)).toBeVisible()

    // Remove item1
    await page.getByTestId(`menu-item-remove-${item1.id}`).click()

    // item1 gone, item2 remains
    await expect(page.getByTestId(`menu-item-row-${item1.id}`)).not.toBeVisible()
    await expect(page.getByTestId(`menu-item-row-${item2.id}`)).toBeVisible()
  })

  test('AC6: generate-link button disabled with 0 items, enabled with >= 1', async ({ page, request }) => {
    const order = await createTestOrder(request)
    await page.goto(`/order/${order.id}`)

    // With 0 items: button disabled
    const btn = page.getByTestId('generate-link-button')
    await expect(btn).toBeDisabled()

    // Add one item
    await page.getByTestId('menu-item-name-input').fill('Pizza')
    await page.getByTestId('menu-item-add-button').click()

    // Now enabled
    await expect(btn).not.toBeDisabled()
  })

  test('AC6: generate-link button re-disabled after removing last item', async ({ page, request }) => {
    const order = await createTestOrder(request)
    const item = await addTestMenuItem(request, order.id, { name: 'Solo item' })

    await page.goto(`/order/${order.id}`)

    const btn = page.getByTestId('generate-link-button')
    await expect(btn).not.toBeDisabled()

    await page.getByTestId(`menu-item-remove-${item.id}`).click()

    await expect(btn).toBeDisabled()
  })

  test('Edge case: form inputs are cleared after successful add', async ({ page, request }) => {
    const order = await createTestOrder(request)
    await page.goto(`/order/${order.id}`)

    await page.getByTestId('menu-item-name-input').fill('Tiramisu')
    await page.getByTestId('menu-item-price-input').fill('6.50')
    await page.getByTestId('menu-item-category-input').fill('Dessert')
    await page.getByTestId('menu-item-add-button').click()

    // Inputs cleared
    await expect(page.getByTestId('menu-item-name-input')).toHaveValue('')
    await expect(page.getByTestId('menu-item-price-input')).toHaveValue('')
    await expect(page.getByTestId('menu-item-category-input')).toHaveValue('')
  })
})
