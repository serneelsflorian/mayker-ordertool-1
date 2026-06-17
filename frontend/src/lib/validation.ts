export interface MenuItemInput {
  name: string;
  price: string;
  category: string;
}

export interface MenuItemValidationErrors {
  name?: string;
  price?: string;
}

export function parseMenuItemInput(
  input: MenuItemInput,
): MenuItemValidationErrors {
  const errors: MenuItemValidationErrors = {};

  if (!input.name.trim()) {
    errors.name = "Name is required";
  }

  const trimmedPrice = input.price.trim();
  if (trimmedPrice !== "") {
    const priceRegex = /^\d+(\.\d{1,2})?$/;
    if (!priceRegex.test(trimmedPrice)) {
      errors.price = "Enter a positive number (up to 2 decimals)";
    } else {
      const num = parseFloat(trimmedPrice);
      if (num <= 0) {
        errors.price = "Enter a positive number (up to 2 decimals)";
      }
    }
  }

  return errors;
}

// Mirrors the backend's pragmatic email shape check; the server (Pydantic
// EmailStr) remains the source of truth, this just enables inline feedback.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export interface EmailRecipientsInput {
  to: string;
  cc: string;
  bcc: string;
}

export interface EmailRecipientsErrors {
  to?: string;
  cc?: string;
  bcc?: string;
}

/**
 * Validate the email recipient fields: `to` is required and must be a valid
 * address; `cc`/`bcc` are optional but, when non-empty, must also be valid.
 */
export function validateEmailRecipients(
  input: EmailRecipientsInput,
): EmailRecipientsErrors {
  const errors: EmailRecipientsErrors = {};

  if (!input.to.trim()) {
    errors.to = "Recipient email is required";
  } else if (!isValidEmail(input.to)) {
    errors.to = "Enter a valid email address";
  }

  if (input.cc.trim() && !isValidEmail(input.cc)) {
    errors.cc = "Enter a valid email address";
  }

  if (input.bcc.trim() && !isValidEmail(input.bcc)) {
    errors.bcc = "Enter a valid email address";
  }

  return errors;
}
