export interface MenuItem {
  id: string;
  name: string;
  price: string | null;
  category: string | null;
}

export interface Order {
  id: string;
  restaurant_name: string;
  state: "open" | "closed";
  menu_items: MenuItem[];
}

export interface CreateMenuItemPayload {
  name: string;
  price?: string | null;
  category?: string | null;
}

export interface GuestSelection {
  id: string;
  menu_item_id: string;
  item_name: string;
  item_price: string | null;
  item_category: string | null;
  note: string | null;
  quantity: number;
  line_total: string;
}

export type GuestStatus = "editing" | "submitted";

export interface Guest {
  id: string;
  order_id: string;
  name: string;
  status: GuestStatus;
  selections: GuestSelection[];
  subtotal: string;
}

export interface OrderOverview {
  id: string;
  restaurant_name: string;
  state: "open" | "closed";
  guests: Guest[];
  submitted_count: number;
  guest_count: number;
}

export interface OrderExportLine {
  quantity: number;
  item_name: string;
  note: string | null;
}

export interface OrderExport {
  id: string;
  restaurant_name: string;
  lines: OrderExportLine[];
  total: string;
  text: string;
}

export interface AddSelectionPayload {
  menu_item_id: string;
  note?: string | null;
  quantity?: number;
}

export interface UpdateSelectionPayload {
  quantity?: number;
  note?: string | null;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
