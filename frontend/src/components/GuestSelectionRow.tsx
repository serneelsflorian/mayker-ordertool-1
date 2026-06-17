import { useState } from "react";
import { Trash2 } from "lucide-react";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Input from "./ui/Input";
import QuantityStepper from "./QuantityStepper";
import { formatCurrency } from "../lib/format";
import type { GuestSelection } from "../api/types";

interface GuestSelectionRowProps {
  selection: GuestSelection;
  onQuantityChange: (selectionId: string, quantity: number) => void;
  onNoteChange: (selectionId: string, note: string) => void;
  onRemove: (selectionId: string) => void;
  disabled?: boolean;
}

/** A single guest selection: item, note (blur-saved), quantity, line total, remove. */
export default function GuestSelectionRow({
  selection,
  onQuantityChange,
  onNoteChange,
  onRemove,
  disabled = false,
}: GuestSelectionRowProps) {
  const [note, setNote] = useState(selection.note ?? "");

  const commitNote = () => {
    if (note !== (selection.note ?? "")) {
      onNoteChange(selection.id, note);
    }
  };

  return (
    <li
      data-testid={`guest-selection-row-${selection.id}`}
      className="grid gap-2 rounded-md border p-3"
      style={{ borderColor: "rgba(0,0,0,0.08)", background: "#fff" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{selection.item_name}</span>
          {selection.item_category && (
            <Badge variant="secondary">{selection.item_category}</Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span
            data-testid={`guest-selection-linetotal-${selection.id}`}
            className="text-sm font-medium"
          >
            {formatCurrency(selection.line_total)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            data-testid={`guest-selection-remove-${selection.id}`}
            aria-label={`Remove ${selection.item_name}`}
            disabled={disabled}
            onClick={() => onRemove(selection.id)}
          >
            <Trash2 className="size-4" style={{ color: "var(--coral)" }} />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={selection.quantity}
          idSuffix={selection.id}
          disabled={disabled}
          onChange={(q) => onQuantityChange(selection.id, q)}
        />
        <Input
          data-testid={`guest-selection-note-${selection.id}`}
          className="flex-1"
          value={note}
          placeholder="Add a note (e.g. no onions)"
          aria-label={`Note for ${selection.item_name}`}
          disabled={disabled}
          onChange={(e) => setNote(e.target.value)}
          onBlur={commitNote}
        />
      </div>
    </li>
  );
}
