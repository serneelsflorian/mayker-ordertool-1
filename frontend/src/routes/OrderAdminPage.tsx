import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  addMenuItem,
  closeOrder,
  getOrder,
  getOrderOverview,
  removeMenuItem,
} from "../api/orders";
import type {
  CreateMenuItemPayload,
  MenuItem,
  Order,
  OrderOverview,
} from "../api/types";
import MenuSetupCard from "../components/MenuSetupCard";
import OrderCloseCard from "../components/OrderCloseCard";
import OrderExportCard from "../components/OrderExportCard";
import OrderOverviewCard from "../components/OrderOverviewCard";
import ShareLinkCard from "../components/ShareLinkCard";

function useOrder(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [overview, setOverview] = useState<OrderOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const [data, overviewData] = await Promise.all([
        getOrder(orderId),
        getOrderOverview(orderId),
      ]);
      setOrder(data);
      setMenuItems(data.menu_items);
      setOverview(overviewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleCloseOrder = useCallback(async () => {
    setActionError(null);
    setIsClosing(true);
    try {
      const closed = await closeOrder(orderId);
      setOrder(closed);
      // Refresh the overview so badges/counts reflect the final server state.
      setOverview(await getOrderOverview(orderId));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to close order",
      );
    } finally {
      setIsClosing(false);
    }
  }, [orderId]);

  const handleAddItem = useCallback(
    async (payload: CreateMenuItemPayload) => {
      setActionError(null);
      setIsAddingItem(true);
      try {
        const item = await addMenuItem(orderId, payload);
        setMenuItems((prev) => [...prev, item]);
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to add item",
        );
      } finally {
        setIsAddingItem(false);
      }
    },
    [orderId],
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      setActionError(null);
      try {
        await removeMenuItem(orderId, itemId);
        setMenuItems((prev) => prev.filter((item) => item.id !== itemId));
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to remove item",
        );
      }
    },
    [orderId],
  );

  return {
    order,
    menuItems,
    overview,
    loading,
    error,
    actionError,
    isAddingItem,
    isClosing,
    handleAddItem,
    handleRemoveItem,
    handleCloseOrder,
  };
}

export default function OrderAdminPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div
        className="py-10 text-center text-sm"
        style={{ color: "var(--coral)" }}
      >
        Invalid order link.
      </div>
    );
  }

  return <OrderAdminPageInner orderId={id} />;
}

function OrderAdminPageInner({ orderId }: { orderId: string }) {
  const {
    order,
    menuItems,
    overview,
    loading,
    error,
    actionError,
    isAddingItem,
    isClosing,
    handleAddItem,
    handleRemoveItem,
    handleCloseOrder,
  } = useOrder(orderId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm" style={{ color: "var(--taupe)" }}>
          Loading order...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div
        className="py-10 text-center text-sm"
        style={{ color: "var(--coral)" }}
      >
        {error ?? "Order not found."}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {actionError && (
        <p
          data-testid="order-error"
          className="rounded-md px-4 py-2 text-sm"
          style={{
            color: "var(--coral)",
            backgroundColor: "var(--coral-light, #fff0ee)",
          }}
          role="alert"
          aria-live="polite"
        >
          {actionError}
        </p>
      )}
      <MenuSetupCard
        menuItems={menuItems}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        isAddingItem={isAddingItem}
      />
      <ShareLinkCard orderId={orderId} hasItems={menuItems.length > 0} />
      <OrderOverviewCard
        guests={overview?.guests ?? []}
        submittedCount={overview?.submitted_count ?? 0}
        guestCount={overview?.guest_count ?? 0}
      />
      <OrderCloseCard
        state={order.state}
        onClose={handleCloseOrder}
        isClosing={isClosing}
      />
      {order.state === "closed" && <OrderExportCard orderId={orderId} />}
    </div>
  );
}
