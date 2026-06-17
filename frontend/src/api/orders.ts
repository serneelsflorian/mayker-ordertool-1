import {
  apiDelete,
  apiDeleteWithBody,
  apiGet,
  apiPatch,
  apiPost,
} from "./client";
import type {
  AddSelectionPayload,
  CreateMenuItemPayload,
  Guest,
  MenuItem,
  Order,
  OrderEmailResult,
  OrderExport,
  OrderOverview,
  SendOrderEmailPayload,
  UpdateSelectionPayload,
} from "./types";

export function createOrder(): Promise<Order> {
  return apiPost<Order>("/orders");
}

export function getOrder(id: string): Promise<Order> {
  return apiGet<Order>(`/orders/${id}`);
}

export function closeOrder(id: string): Promise<Order> {
  return apiPost<Order>(`/orders/${id}/close`);
}

export function getOrderOverview(id: string): Promise<OrderOverview> {
  return apiGet<OrderOverview>(`/orders/${id}/overview`);
}

export function getOrderExport(id: string): Promise<OrderExport> {
  return apiGet<OrderExport>(`/orders/${id}/export`);
}

export function sendOrderEmail(
  id: string,
  payload: SendOrderEmailPayload,
): Promise<OrderEmailResult> {
  return apiPost<OrderEmailResult>(`/orders/${id}/email`, payload);
}

export function addMenuItem(
  orderId: string,
  payload: CreateMenuItemPayload,
): Promise<MenuItem> {
  return apiPost<MenuItem>(`/orders/${orderId}/menu-items`, payload);
}

export function removeMenuItem(orderId: string, itemId: string): Promise<void> {
  return apiDelete(`/orders/${orderId}/menu-items/${itemId}`);
}

export function joinGuest(orderId: string, name: string): Promise<Guest> {
  return apiPost<Guest>(`/orders/${orderId}/guests`, { name });
}

export function getGuest(orderId: string, guestId: string): Promise<Guest> {
  return apiGet<Guest>(`/orders/${orderId}/guests/${guestId}`);
}

export function addSelection(
  orderId: string,
  guestId: string,
  payload: AddSelectionPayload,
): Promise<Guest> {
  return apiPost<Guest>(
    `/orders/${orderId}/guests/${guestId}/selections`,
    payload,
  );
}

export function updateSelection(
  orderId: string,
  guestId: string,
  selectionId: string,
  payload: UpdateSelectionPayload,
): Promise<Guest> {
  return apiPatch<Guest>(
    `/orders/${orderId}/guests/${guestId}/selections/${selectionId}`,
    payload,
  );
}

export function removeSelection(
  orderId: string,
  guestId: string,
  selectionId: string,
): Promise<Guest> {
  return apiDeleteWithBody<Guest>(
    `/orders/${orderId}/guests/${guestId}/selections/${selectionId}`,
  );
}

export function submitGuestOrder(
  orderId: string,
  guestId: string,
): Promise<Guest> {
  return apiPost<Guest>(`/orders/${orderId}/guests/${guestId}/submit`);
}

export function reopenGuestOrder(
  orderId: string,
  guestId: string,
): Promise<Guest> {
  return apiPost<Guest>(`/orders/${orderId}/guests/${guestId}/reopen`);
}
