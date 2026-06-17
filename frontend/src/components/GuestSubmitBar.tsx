import { Check } from "lucide-react";
import Button from "./ui/Button";
import type { Guest } from "../api/types";

interface GuestSubmitBarProps {
  guest: Guest;
  onSubmit: () => void;
  onReopen: () => void;
  disabled?: boolean;
}

/**
 * Submit/reopen control bar rendered inside the guest "My order" panel.
 * Shows a submit button while editing, or a confirmation banner with a
 * reopen button while submitted.
 */
export default function GuestSubmitBar({
  guest,
  onSubmit,
  onReopen,
  disabled = false,
}: GuestSubmitBarProps) {
  if (guest.status === "submitted") {
    return (
      <div
        data-testid="guest-submitted-banner"
        role="status"
        className="flex flex-col gap-3 rounded-md border px-4 py-3 text-sm"
        style={{
          color: "var(--teal)",
          borderColor: "var(--teal)",
          background: "#f0faf8",
        }}
      >
        <div className="flex items-start gap-2">
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Your order is submitted. The organizer can see it. You can still
            reopen to make changes.
          </span>
        </div>
        <Button
          variant="outline"
          data-testid="guest-reopen-button"
          onClick={onReopen}
          disabled={disabled}
          aria-label="Reopen and edit your order"
        >
          Reopen / edit my order
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="primary"
      data-testid="guest-submit-button"
      onClick={onSubmit}
      disabled={guest.selections.length === 0 || disabled}
      aria-label="Submit your order to the organizer"
      className="w-full"
    >
      Submit my order
    </Button>
  );
}
