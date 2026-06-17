import Badge from "./ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import EmptyState from "./ui/EmptyState";
import GuestStatusBadge from "./GuestStatusBadge";
import { formatCurrency } from "../lib/format";
import type { Guest } from "../api/types";

interface OrderOverviewCardProps {
  guests: Guest[];
  submittedCount: number;
  guestCount: number;
}

/**
 * Admin overview: each guest's selections grouped by person with a status
 * badge, plus a "X of N submitted" summary so the admin can judge when to close.
 */
export default function OrderOverviewCard({
  guests,
  submittedCount,
  guestCount,
}: OrderOverviewCardProps) {
  return (
    <Card data-testid="order-overview-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Live order overview</CardTitle>
        <Badge
          variant="secondary"
          data-testid="overview-summary-badge"
          style={{ color: "#1f4854" }}
        >
          {submittedCount} of {guestCount} submitted
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-3">
        {guests.length === 0 ? (
          <EmptyState text="No guests have joined yet." />
        ) : (
          guests.map((guest) => (
            <div
              key={guest.id}
              data-testid={`guest-overview-item-${guest.id}`}
              className="rounded-md border p-3"
              style={{ borderColor: "rgba(0,0,0,0.08)", background: "#fff" }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{guest.name}</span>
                  <GuestStatusBadge
                    status={guest.status}
                    testId={`guest-status-badge-${guest.id}`}
                  />
                </div>
                <span
                  data-testid={`guest-overview-subtotal-${guest.id}`}
                  className="text-sm"
                  style={{ color: "var(--taupe)" }}
                >
                  {formatCurrency(guest.subtotal)}
                </span>
              </div>
              {guest.selections.length === 0 ? (
                <p className="mt-2 text-sm" style={{ color: "var(--taupe)" }}>
                  No items added.
                </p>
              ) : (
                <ul className="mt-2 grid gap-1 text-sm">
                  {guest.selections.map((selection) => (
                    <li
                      key={selection.id}
                      className="flex justify-between gap-2"
                    >
                      <span>
                        {selection.quantity}x {selection.item_name}
                        {selection.note && (
                          <span style={{ color: "var(--taupe)" }}>
                            {" "}
                            — {selection.note}
                          </span>
                        )}
                      </span>
                      <span style={{ color: "var(--taupe)" }}>
                        {formatCurrency(selection.line_total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
