import { apiDelete, apiGet, apiPost } from './client'
import type { CreateMenuItemPayload, MenuItem, Order } from './types'

export function createOrder(): Promise<Order> {
  return apiPost<Order>('/orders')
}

export function getOrder(id: string): Promise<Order> {
  return apiGet<Order>(`/orders/${id}`)
}

export function addMenuItem(orderId: string, payload: CreateMenuItemPayload): Promise<MenuItem> {
  return apiPost<MenuItem>(`/orders/${orderId}/menu-items`, payload)
}

export function removeMenuItem(orderId: string, itemId: string): Promise<void> {
  return apiDelete(`/orders/${orderId}/menu-items/${itemId}`)
}
