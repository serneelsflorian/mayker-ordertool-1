import { Lock } from "lucide-react";

/** Banner shown when the order is closed (AC9). */
export default function ClosedOrderBanner() {
  return (
    <div
      data-testid="closed-order-banner"
      role="status"
      className="flex items-center gap-2 rounded-md border px-4 py-3 text-sm"
      style={{
        color: "var(--coral)",
        borderColor: "var(--coral)",
        background: "#fff0ee",
      }}
    >
      <Lock className="size-4" aria-hidden="true" />
      <span>
        This order is closed. You can view the menu, but it can no longer be
        changed.
      </span>
    </div>
  );
}
