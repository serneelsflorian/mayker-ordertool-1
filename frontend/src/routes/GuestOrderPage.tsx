import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getOrder } from "../api/orders";
import type { Order } from "../api/types";
import GuestMenuCard from "../components/GuestMenuCard";

export default function GuestOrderPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div
        className="py-10 text-center text-sm"
        style={{ color: "var(--coral)" }}
        data-testid="guest-error"
      >
        Invalid order link.
      </div>
    );
  }

  return <GuestOrderPageInner orderId={id} />;
}

function GuestOrderPageInner({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      const data = await getOrder(orderId);
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

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
        data-testid="guest-error"
      >
        {error ?? "Order not found."}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <GuestMenuCard
        restaurantName={order.restaurant_name}
        menuItems={order.menu_items}
      />
    </div>
  );
}
