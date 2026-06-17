/**
 * Build the shareable guest URL for an order.
 *
 * The guest order view lives at a distinct route from the admin view so that a
 * link-holder lands on the read-only guest experience, never the admin
 * menu-setup screen (there is no auth; admin vs guest is distinguished by path).
 */
export function buildGuestShareUrl(orderId: string): string {
  return `${window.location.origin}/order/${orderId}/guest`;
}
