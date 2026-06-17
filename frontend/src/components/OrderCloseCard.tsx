import { useState } from "react";
import { Lock } from "lucide-react";
import Button from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import ConfirmDialog from "./ui/ConfirmDialog";
import type { Order } from "../api/types";

interface OrderCloseCardProps {
  state: Order["state"];
  onClose: () => void;
  isClosing: boolean;
}

/**
 * Close-order action. While open: a confirm-gated "Close order" button.
 * Once closed: a final, non-reopenable closed indicator (closing is one-way).
 */
export default function OrderCloseCard({
  state,
  onClose,
  isClosing,
}: OrderCloseCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const closed = state === "closed";

  const handleConfirm = () => {
    setConfirmOpen(false);
    onClose();
  };

  return (
    <Card data-testid="order-close-card">
      <CardHeader>
        <CardTitle>Order actions</CardTitle>
      </CardHeader>
      <CardContent>
        {closed ? (
          <div
            data-testid="order-closed-indicator"
            role="status"
            className="flex items-center gap-2 rounded-md border px-4 py-3 text-sm"
            style={{
              color: "var(--coral)",
              borderColor: "var(--coral)",
              background: "#fff0ee",
            }}
          >
            <Lock className="size-4" aria-hidden="true" />
            <span>This order is closed. It can no longer be changed.</span>
          </div>
        ) : (
          <Button
            data-testid="close-order-button"
            onClick={() => setConfirmOpen(true)}
            disabled={isClosing}
            aria-label="Close order"
          >
            <Lock className="size-4" aria-hidden="true" />
            {isClosing ? "Closing…" : "Close order"}
          </Button>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        title="Close order?"
        description="Members can no longer make changes. This is final."
        confirmLabel="Close order"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
