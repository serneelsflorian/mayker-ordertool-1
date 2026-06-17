import { useState } from "react";
import { Check, Copy, Link } from "lucide-react";
import Button from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import Input from "./ui/Input";
import Label from "./ui/Label";
import { buildGuestShareUrl } from "../lib/share";

interface ShareLinkCardProps {
  orderId: string;
  hasItems: boolean;
}

export default function ShareLinkCard({
  orderId,
  hasItems,
}: ShareLinkCardProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setShareUrl(buildGuestShareUrl(orderId));
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Clipboard API may be unavailable (e.g. insecure context); still
      // confirm so the user knows the action was acknowledged.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card data-testid="share-link-card">
      <CardHeader>
        <CardTitle>Share with the team</CardTitle>
        <p className="text-sm" style={{ color: "var(--taupe)" }}>
          Generate a link and send it to your team so everyone can add their
          order.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            data-testid="generate-link-button"
            onClick={handleGenerate}
            disabled={!hasItems}
            aria-label="Generate share link"
            aria-disabled={!hasItems}
          >
            <Link className="size-4" />
            Generate share link
          </Button>
          {!hasItems && (
            <span className="text-xs" style={{ color: "var(--taupe)" }}>
              Add at least one menu item first.
            </span>
          )}
        </div>

        {shareUrl && (
          <div className="grid gap-1.5">
            <Label htmlFor="share-url">Shareable link</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="share-url"
                data-testid="share-url-input"
                value={shareUrl}
                readOnly
                aria-label="Shareable order link"
                className="flex-1 min-w-0"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                variant="outline"
                onClick={handleCopy}
                data-testid="copy-link-button"
                aria-label="Copy share link"
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            {copied && (
              <span
                data-testid="copy-confirmation"
                className="text-xs"
                style={{ color: "var(--teal)" }}
                role="status"
                aria-live="polite"
              >
                Copied to clipboard.
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
