import type { APIRequestContext } from "@playwright/test";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000/api";

export interface OrderData {
  id: string;
  restaurant_name: string;
  state: string;
  menu_items: MenuItemData[];
}

export interface MenuItemData {
  id: string;
  name: string;
  price: string | null;
  category: string | null;
}

export async function createTestOrder(
  request: APIRequestContext,
): Promise<OrderData> {
  const resp = await request.post(`${API_BASE}/orders`);
  const data = (await resp.json()) as OrderData;
  return data;
}

export async function addTestMenuItem(
  request: APIRequestContext,
  orderId: string,
  payload: { name: string; price?: string | null; category?: string | null },
): Promise<MenuItemData> {
  const resp = await request.post(`${API_BASE}/orders/${orderId}/menu-items`, {
    data: payload,
  });
  return resp.json() as Promise<MenuItemData>;
}

export interface GuestSelectionData {
  id: string;
  menu_item_id: string;
  item_name: string;
  item_price: string | null;
  item_category: string | null;
  note: string | null;
  quantity: number;
  line_total: string;
}

export interface GuestData {
  id: string;
  order_id: string;
  name: string;
  status: string;
  selections: GuestSelectionData[];
  subtotal: string;
}

export async function joinGuest(
  request: APIRequestContext,
  orderId: string,
  name: string,
): Promise<GuestData> {
  const resp = await request.post(`${API_BASE}/orders/${orderId}/guests`, {
    data: { name },
  });
  return resp.json() as Promise<GuestData>;
}

export async function addSelection(
  request: APIRequestContext,
  orderId: string,
  guestId: string,
  payload: { menu_item_id: string; note?: string | null; quantity?: number },
): Promise<GuestData> {
  const resp = await request.post(
    `${API_BASE}/orders/${orderId}/guests/${guestId}/selections`,
    { data: payload },
  );
  return resp.json() as Promise<GuestData>;
}

export async function closeTestOrder(
  request: APIRequestContext,
  orderId: string,
): Promise<OrderData> {
  const resp = await request.post(`${API_BASE}/orders/${orderId}/close`);
  return resp.json() as Promise<OrderData>;
}

export interface OrderOverviewData {
  id: string;
  restaurant_name: string;
  state: string;
  guests: GuestData[];
  submitted_count: number;
  guest_count: number;
}

export async function getOrderOverview(
  request: APIRequestContext,
  orderId: string,
): Promise<OrderOverviewData> {
  const resp = await request.get(`${API_BASE}/orders/${orderId}/overview`);
  return resp.json() as Promise<OrderOverviewData>;
}

export interface OrderExportLineData {
  quantity: number;
  item_name: string;
  note: string | null;
}

export interface OrderExportData {
  id: string;
  restaurant_name: string;
  lines: OrderExportLineData[];
  total: string;
  text: string;
}

export async function getOrderExport(
  request: APIRequestContext,
  orderId: string,
): Promise<OrderExportData> {
  const resp = await request.get(`${API_BASE}/orders/${orderId}/export`);
  return resp.json() as Promise<OrderExportData>;
}
