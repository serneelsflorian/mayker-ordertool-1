export interface MenuItemInput {
  name: string
  price: string
  category: string
}

export interface MenuItemValidationErrors {
  name?: string
  price?: string
}

export function parseMenuItemInput(input: MenuItemInput): MenuItemValidationErrors {
  const errors: MenuItemValidationErrors = {}

  if (!input.name.trim()) {
    errors.name = 'Name is required'
  }

  const trimmedPrice = input.price.trim()
  if (trimmedPrice !== '') {
    const priceRegex = /^\d+(\.\d{1,2})?$/
    if (!priceRegex.test(trimmedPrice)) {
      errors.price = 'Enter a positive number (up to 2 decimals)'
    } else {
      const num = parseFloat(trimmedPrice)
      if (num <= 0) {
        errors.price = 'Enter a positive number (up to 2 decimals)'
      }
    }
  }

  return errors
}
