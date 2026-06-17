import { FormEvent, useState } from "react";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Label from "./ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

interface GuestNameFormProps {
  onJoin: (name: string) => Promise<void>;
  isJoining?: boolean;
}

/**
 * Required name input that gates ordering (AC2). The add controls are not
 * rendered until the guest joins, and the join button stays disabled until a
 * non-empty name is entered.
 */
export default function GuestNameForm({
  onJoin,
  isJoining = false,
}: GuestNameFormProps) {
  const [name, setName] = useState("");
  const trimmed = name.trim();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || isJoining) return;
    void onJoin(trimmed);
  };

  return (
    <Card data-testid="guest-name-card">
      <CardHeader>
        <CardTitle>Add your name to start ordering</CardTitle>
        <p className="text-sm" style={{ color: "var(--taupe)" }}>
          Enter your name so your selections are attributed to you.
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={handleSubmit}
        >
          <div className="flex-1">
            <Label htmlFor="guest-name">Your name</Label>
            <Input
              id="guest-name"
              data-testid="guest-name-input"
              value={name}
              placeholder="e.g. Sara"
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            data-testid="guest-join-button"
            disabled={!trimmed || isJoining}
          >
            {isJoining ? "Joining..." : "Start ordering"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
