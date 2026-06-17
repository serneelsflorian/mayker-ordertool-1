import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import MenuItemList from "./MenuItemList";
import type { MenuItem } from "../api/types";

interface GuestMenuCardProps {
  restaurantName: string;
  menuItems: MenuItem[];
  onAddItem?: (id: string) => void;
  addDisabled?: boolean;
}

export default function GuestMenuCard({
  restaurantName,
  menuItems,
  onAddItem,
  addDisabled = false,
}: GuestMenuCardProps) {
  return (
    <Card data-testid="guest-menu-card">
      <CardHeader>
        <CardTitle>Menu</CardTitle>
        <p className="text-sm" style={{ color: "var(--taupe)" }}>
          Restaurant: <span className="text-gray-900">{restaurantName}</span>
        </p>
        <p className="text-sm" style={{ color: "var(--taupe)" }}>
          {onAddItem
            ? "Tap Add to put an item on your order."
            : "Browse the menu below."}
        </p>
      </CardHeader>
      <CardContent>
        <MenuItemList
          items={menuItems}
          onAdd={onAddItem}
          addDisabled={addDisabled}
          emptyText="No menu items available yet."
        />
      </CardContent>
    </Card>
  );
}
