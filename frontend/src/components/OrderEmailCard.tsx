import { useCallback, useEffect, useState } from "react";
import { Check, Mail } from "lucide-react";
import Button from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import Input from "./ui/Input";
import Label from "./ui/Label";
import { getOrderExport, sendOrderEmail } from "../api/orders";
import {
  validateEmailRecipients,
  type EmailRecipientsErrors,
} from "../lib/validation";
import type { OrderExport } from "../api/types";

interface OrderEmailCardProps {
  orderId: string;
}

// Kept in sync with the backend prank copy (email_builder.PRANK_LINE). The
// joke is intentionally unambiguous so no recipient mistakes it for a real bill.
const PRANK_LINE =
  "Thank you for ordering! The bill will be sent to your email shortly, so keep an eye on your inbox 😉";

/**
 * Admin-only action shown once the order is closed (next to the export):
 * email the consolidated overview to a recipient with optional CC/BCC. The
 * email itself is composed and sent server-side; this card only collects and
 * validates the recipients and shows a preview of what will be sent.
 */
export default function OrderEmailCard({ orderId }: OrderEmailCardProps) {
  const [exportData, setExportData] = useState<OrderExport | null>(null);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [errors, setErrors] = useState<EmailRecipientsErrors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getOrderExport(orderId)
      .then((data) => {
        if (active) setExportData(data);
      })
      .catch(() => {
        // A missing preview must not block sending; the server rebuilds the
        // overview on send regardless of whether the preview loaded.
        if (active) setExportData(null);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  const handleSend = useCallback(async () => {
    const validationErrors = validateEmailRecipients({ to, cc, bcc });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSending(true);
    setSent(false);
    setSendError(null);
    try {
      await sendOrderEmail(orderId, {
        to: to.trim(),
        // Omit empty optional fields so the backend coerces them to null.
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
      });
      setSent(true);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }, [orderId, to, cc, bcc]);

  return (
    <Card data-testid="order-email-card">
      <CardHeader>
        <div className="grid gap-1.5">
          <CardTitle>Email the overview</CardTitle>
          <p className="text-sm" style={{ color: "var(--taupe)" }}>
            Send the consolidated order to a teammate (with optional CC and
            BCC).
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="email-to">To</Label>
          <Input
            id="email-to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="name@team.com"
            hasError={Boolean(errors.to)}
            data-testid="email-to-input"
            aria-label="Recipient email address"
            aria-invalid={Boolean(errors.to)}
          />
          {errors.to && (
            <span
              data-testid="email-to-error"
              className="text-xs"
              style={{ color: "var(--coral)" }}
              role="alert"
            >
              {errors.to}
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="email-cc">CC (optional)</Label>
            <Input
              id="email-cc"
              type="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="optional@team.com"
              hasError={Boolean(errors.cc)}
              data-testid="email-cc-input"
              aria-label="CC email address"
              aria-invalid={Boolean(errors.cc)}
            />
            {errors.cc && (
              <span
                data-testid="email-cc-error"
                className="text-xs"
                style={{ color: "var(--coral)" }}
                role="alert"
              >
                {errors.cc}
              </span>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email-bcc">BCC (optional)</Label>
            <Input
              id="email-bcc"
              type="email"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="optional@team.com"
              hasError={Boolean(errors.bcc)}
              data-testid="email-bcc-input"
              aria-label="BCC email address"
              aria-invalid={Boolean(errors.bcc)}
            />
            {errors.bcc && (
              <span
                data-testid="email-bcc-error"
                className="text-xs"
                style={{ color: "var(--coral)" }}
                role="alert"
              >
                {errors.bcc}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Preview</Label>
          <div
            data-testid="email-preview"
            className="rounded-md border p-3 text-sm"
            style={{ borderColor: "rgba(0,0,0,0.08)", background: "#fff" }}
          >
            <p className="mb-3" style={{ color: "var(--coral)" }}>
              {PRANK_LINE}
            </p>
            {exportData ? (
              <pre
                className="overflow-x-auto whitespace-pre-wrap text-sm"
                style={{
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                }}
              >
                {exportData.text}
              </pre>
            ) : (
              <p style={{ color: "var(--taupe)" }}>Loading overview…</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleSend}
            disabled={sending}
            data-testid="email-send-button"
            aria-label="Send the order overview email"
          >
            <Mail className="size-4" />
            {sending ? "Sending…" : "Send email"}
          </Button>
          {sent && (
            <span
              data-testid="email-sent"
              className="inline-flex items-center gap-1 text-sm"
              style={{ color: "var(--teal)" }}
              role="status"
              aria-live="polite"
            >
              <Check className="size-4" /> Sent
            </span>
          )}
        </div>

        {sendError && (
          <p
            data-testid="email-error"
            className="text-sm"
            style={{ color: "var(--coral)" }}
            role="alert"
            aria-live="polite"
          >
            {sendError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
