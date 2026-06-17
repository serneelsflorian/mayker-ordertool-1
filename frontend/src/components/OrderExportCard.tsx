import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import Button from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { getOrderExport } from "../api/orders";
import { copyText } from "../lib/clipboard";
import type { OrderExport } from "../api/types";

interface OrderExportCardProps {
  orderId: string;
}

/**
 * Consolidated export shown to the admin once the order is closed: a plain,
 * copy-paste-friendly block (restaurant header, items grouped by item + note,
 * final total) with a one-tap copy-all button for manual Deliveroo re-entry.
 */
export default function OrderExportCard({ orderId }: OrderExportCardProps) {
  const [exportData, setExportData] = useState<OrderExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getOrderExport(orderId)
      .then((data) => {
        if (!active) return;
        setExportData(data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load export");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  const handleCopy = useCallback(async () => {
    if (!exportData) return;
    await copyText(exportData.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [exportData]);

  return (
    <Card data-testid="order-export-card">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="grid gap-1.5">
          <CardTitle>Export for Deliveroo</CardTitle>
          <p className="text-sm" style={{ color: "var(--taupe)" }}>
            Copy this consolidated list and re-enter it in Deliveroo.
          </p>
        </div>
        {exportData && (
          <Button
            variant="outline"
            onClick={handleCopy}
            data-testid="export-copy-button"
            aria-label="Copy export to clipboard"
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? "Copied" : "Copy all"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-2">
        {loading ? (
          <p className="text-sm" style={{ color: "var(--taupe)" }}>
            Building export…
          </p>
        ) : error ? (
          <p
            data-testid="export-error"
            className="text-sm"
            style={{ color: "var(--coral)" }}
            role="alert"
          >
            {error}
          </p>
        ) : exportData ? (
          <>
            <pre
              data-testid="export-text"
              className="overflow-x-auto whitespace-pre-wrap rounded-md border p-3 text-sm"
              style={{
                borderColor: "rgba(0,0,0,0.08)",
                background: "#fff",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
              }}
            >
              {exportData.text}
            </pre>
            {copied && (
              <span
                data-testid="export-copied"
                className="text-xs"
                style={{ color: "var(--teal)" }}
                role="status"
                aria-live="polite"
              >
                Copied to clipboard.
              </span>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
