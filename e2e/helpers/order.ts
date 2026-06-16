import type { APIRequestContext } from '@playwright/test'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:8000/api'

export interface OrderData {
  id: string
  restaurant_name: string
  state: string
  menu_items: MenuItemData[]
}

export interface MenuItemData {
  id: string
  name: string
  price: string | null
  category: string | null
}

export async function createTestOrder(request: APIRequestContext): Promise<OrderData> {
  const resp = await request.post(`${API_BASE}/orders`)
  const data = await resp.json() as OrderData
  return data
}

export async function addTestMenuItem(
  request: APIRequestContext,
  orderId: string,
  payload: { name: string; price?: string | null; category?: string | null },
): Promise<MenuItemData> {
  const resp = await request.post(`${API_BASE}/orders/${orderId}/menu-items`, { data: payload })
  return resp.json() as Promise<MenuItemData>
}
