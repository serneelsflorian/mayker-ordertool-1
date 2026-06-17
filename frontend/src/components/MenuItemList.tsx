import EmptyState from "./ui/EmptyState";
import MenuItemRow from "./MenuItemRow";
import type { MenuItem } from "../api/types";

interface MenuItemListProps {
  items: MenuItem[];
  onRemove?: (id: string) => Promise<void>;
  emptyText?: string;
}

export default function MenuItemList({
  items,
  onRemove,
  emptyText = "No menu items yet. Add your first item above.",
}: MenuItemListProps) {
  if (items.length === 0) {
    return <EmptyState text={emptyText} />;
  }

  return (
    <ul data-testid="menu-item-list" className="grid gap-2">
      {items.map((item) => (
        <MenuItemRow key={item.id} item={item} onRemove={onRemove} />
      ))}
    </ul>
  );
}
