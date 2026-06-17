import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import Separator from "./ui/Separator";
import MenuItemForm from "./MenuItemForm";
import MenuItemList from "./MenuItemList";
import { RESTAURANT_NAME } from "../constants";
import type { CreateMenuItemPayload, MenuItem } from "../api/types";

interface MenuSetupCardProps {
  menuItems: MenuItem[];
  onAddItem: (payload: CreateMenuItemPayload) => Promise<void>;
  onRemoveItem: (id: string) => Promise<void>;
  isAddingItem?: boolean;
}

export default function MenuSetupCard({
  menuItems,
  onAddItem,
  onRemoveItem,
  isAddingItem = false,
}: MenuSetupCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu setup</CardTitle>
        <p className="text-sm" style={{ color: "var(--taupe)" }}>
          Restaurant: <span className="text-gray-900">{RESTAURANT_NAME}</span>
        </p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <MenuItemForm onAdd={onAddItem} isSubmitting={isAddingItem} />
        <Separator />
        <MenuItemList items={menuItems} onRemove={onRemoveItem} />
      </CardContent>
    </Card>
  );
}
