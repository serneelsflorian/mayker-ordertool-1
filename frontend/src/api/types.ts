export interface MenuItem {
  id: string
  name: string
  price: string | null
  category: string | null
}

export interface Order {
  id: string
  restaurant_name: string
  state: 'open' | 'closed'
  menu_items: MenuItem[]
}

export interface CreateMenuItemPayload {
  name: string
  price?: string | null
  category?: string | null
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}
