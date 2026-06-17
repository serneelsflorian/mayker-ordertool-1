import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  addSelection,
  getOrder,
  joinGuest,
  removeSelection,
  reopenGuestOrder,
  submitGuestOrder,
  updateSelection,
} from "../api/orders";
import type { Guest, Order } from "../api/types";
import ClosedOrderBanner from "../components/ClosedOrderBanner";
import GuestMenuCard from "../components/GuestMenuCard";
import GuestNameForm from "../components/GuestNameForm";
import GuestOrderPanel from "../components/GuestOrderPanel";

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
  // The guest identity lives in component state only (never localStorage),
  // so order state stays server-persisted and shareable across sessions.
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

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

  const handleJoin = useCallback(
    async (name: string) => {
      setActionError(null);
      setIsJoining(true);
      try {
        setGuest(await joinGuest(orderId, name));
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to join order",
        );
      } finally {
        setIsJoining(false);
      }
    },
    [orderId],
  );

  // The server returns the updated guest (with a recomputed subtotal) on every
  // mutation, so it stays the single source of truth and money is never
  // recomputed on the client.
  const runMutation = useCallback(async (action: () => Promise<Guest>) => {
    setActionError(null);
    setIsMutating(true);
    try {
      setGuest(await action());
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not update your order",
      );
    } finally {
      setIsMutating(false);
    }
  }, []);

  const handleAddItem = useCallback(
    (menuItemId: string) => {
      if (!guest) return;
      void runMutation(() =>
        addSelection(orderId, guest.id, { menu_item_id: menuItemId }),
      );
    },
    [guest, orderId, runMutation],
  );

  const handleQuantityChange = useCallback(
    (selectionId: string, quantity: number) => {
      if (!guest) return;
      void runMutation(() =>
        updateSelection(orderId, guest.id, selectionId, { quantity }),
      );
    },
    [guest, orderId, runMutation],
  );

  const handleNoteChange = useCallback(
    (selectionId: string, note: string) => {
      if (!guest) return;
      void runMutation(() =>
        updateSelection(orderId, guest.id, selectionId, { note }),
      );
    },
    [guest, orderId, runMutation],
  );

  const handleRemove = useCallback(
    (selectionId: string) => {
      if (!guest) return;
      void runMutation(() => removeSelection(orderId, guest.id, selectionId));
    },
    [guest, orderId, runMutation],
  );

  const handleSubmit = useCallback(() => {
    if (!guest) return;
    void runMutation(() => submitGuestOrder(orderId, guest.id));
  }, [guest, orderId, runMutation]);

  const handleReopen = useCallback(() => {
    if (!guest) return;
    void runMutation(() => reopenGuestOrder(orderId, guest.id));
  }, [guest, orderId, runMutation]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        data-testid="guest-loading"
      >
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

  const isClosed = order.state === "closed";

  return (
    <div className="grid gap-4">
      {isClosed && <ClosedOrderBanner />}

      {actionError && (
        <p
          data-testid="guest-action-error"
          className="rounded-md px-4 py-2 text-sm"
          style={{ color: "var(--coral)", backgroundColor: "#fff0ee" }}
          role="alert"
          aria-live="polite"
        >
          {actionError}
        </p>
      )}

      <GuestMenuCard
        restaurantName={order.restaurant_name}
        menuItems={order.menu_items}
        onAddItem={!isClosed && guest ? handleAddItem : undefined}
        addDisabled={isMutating}
      />

      {!isClosed && !guest && (
        <GuestNameForm onJoin={handleJoin} isJoining={isJoining} />
      )}

      {!isClosed && guest && (
        <GuestOrderPanel
          guest={guest}
          onQuantityChange={handleQuantityChange}
          onNoteChange={handleNoteChange}
          onRemove={handleRemove}
          onSubmit={handleSubmit}
          onReopen={handleReopen}
          disabled={isMutating}
        />
      )}
    </div>
  );
}
