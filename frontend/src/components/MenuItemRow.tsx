import { Trash2 } from "lucide-react";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import { formatCurrency } from "../lib/format";
import type { MenuItem } from "../api/types";

interface MenuItemRowProps {
  item: MenuItem;
  onRemove?: (id: string) => Promise<void>;
}

export default function MenuItemRow({ item, onRemove }: MenuItemRowProps) {
  return (
    <li
      data-testid={`menu-item-row-${item.id}`}
      className="flex items-center justify-between rounded-md border p-3"
      style={{ borderColor: "rgba(0,0,0,0.08)", background: "#fff" }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{item.name}</span>
        {item.category && <Badge variant="secondary">{item.category}</Badge>}
      </div>
      <div className="flex items-center gap-3">
        {item.price && (
          <span className="text-sm" style={{ color: "var(--taupe)" }}>
            {formatCurrency(item.price)}
          </span>
        )}
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            data-testid={`menu-item-remove-${item.id}`}
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 className="size-4" style={{ color: "var(--coral)" }} />
          </Button>
        )}
      </div>
    </li>
  );
}
