import Badge from "./ui/Badge";
import EmptyState from "./ui/EmptyState";
import GuestSelectionRow from "./GuestSelectionRow";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { formatCurrency } from "../lib/format";
import type { Guest } from "../api/types";

interface GuestOrderPanelProps {
  guest: Guest;
  onQuantityChange: (selectionId: string, quantity: number) => void;
  onNoteChange: (selectionId: string, note: string) => void;
  onRemove: (selectionId: string) => void;
  disabled?: boolean;
}

const STATUS_LABELS: Record<Guest["status"], string> = {
  editing: "Editing",
  submitted: "Submitted",
};

/** "My order" panel: status, the guest's own selections, and a running subtotal. */
export default function GuestOrderPanel({
  guest,
  onQuantityChange,
  onNoteChange,
  onRemove,
  disabled = false,
}: GuestOrderPanelProps) {
  return (
    <Card data-testid="guest-order-panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>My order</CardTitle>
          <Badge
            data-testid="guest-status-badge"
            variant={guest.status === "submitted" ? "default" : "secondary"}
          >
            {STATUS_LABELS[guest.status]}
          </Badge>
        </div>
        <p className="text-sm" style={{ color: "var(--taupe)" }}>
          Ordering as <span className="text-gray-900">{guest.name}</span>
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {guest.selections.length === 0 ? (
          <EmptyState text="No items yet. Add items from the menu to build your order." />
        ) : (
          <ul data-testid="guest-selection-list" className="grid gap-2">
            {guest.selections.map((selection) => (
              <GuestSelectionRow
                key={selection.id}
                selection={selection}
                onQuantityChange={onQuantityChange}
                onNoteChange={onNoteChange}
                onRemove={onRemove}
                disabled={disabled}
              />
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm font-medium">Subtotal</span>
          <span
            data-testid="guest-subtotal"
            className="text-base font-semibold"
            style={{ color: "var(--teal)" }}
          >
            {formatCurrency(guest.subtotal)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
