import { Check, Pencil } from "lucide-react";
import Badge from "./ui/Badge";
import type { GuestStatus } from "../api/types";

interface GuestStatusBadgeProps {
  status: GuestStatus;
  testId?: string;
}

/** Purely presentational per-guest status badge ("Submitted" / "Editing"). */
export default function GuestStatusBadge({
  status,
  testId,
}: GuestStatusBadgeProps) {
  const submitted = status === "submitted";
  return (
    <Badge
      variant="secondary"
      data-testid={testId}
      className="gap-1"
      style={{ color: submitted ? "var(--teal-600)" : "var(--taupe)" }}
    >
      {submitted ? (
        <Check className="size-3" aria-hidden="true" />
      ) : (
        <Pencil className="size-3" aria-hidden="true" />
      )}
      {submitted ? "Submitted" : "Editing"}
    </Badge>
  );
}
