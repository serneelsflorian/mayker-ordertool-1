import { useMemo, useState } from "react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Textarea } from "./components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/ui/alert-dialog";
import {
  Copy,
  Plus,
  Minus,
  Trash2,
  Mail,
  RotateCcw,
  Link as LinkIcon,
  Check,
  Lock,
  ShoppingBag,
  UserCog,
  Users,
} from "lucide-react";

// ---------- Types & seed data ----------

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
};

type GuestItem = {
  id: string;
  menuItemId: string;
  qty: number;
  note: string;
};

type GuestStatus = "Editing" | "Submitted";

type Guest = {
  id: string;
  name: string;
  status: GuestStatus;
  items: GuestItem[];
};

type OrderState = "open" | "closed";

const RESTAURANT = "Trattoria Demo";

const uid = () => Math.random().toString(36).slice(2, 9);

const SEED_MENU: MenuItem[] = [
  { id: "m1", name: "Margherita", price: 9.5, category: "Pizza" },
  { id: "m2", name: "Diavola", price: 12.0, category: "Pizza" },
  { id: "m3", name: "Carbonara", price: 13.5, category: "Pasta" },
  { id: "m4", name: "Caesar Salad", price: 8.0, category: "Salad" },
  { id: "m5", name: "Tiramisu", price: 6.5, category: "Dessert" },
  { id: "m6", name: "Garlic Bread", price: 4.0, category: "Sides" },
  { id: "m7", name: "Sparkling Water", price: 3.0, category: "Drinks" },
  { id: "m8", name: "House Red", price: 5.5, category: "Drinks" },
];

const SEED_GUESTS: Guest[] = [
  {
    id: "g1",
    name: "Sara",
    status: "Submitted",
    items: [
      { id: uid(), menuItemId: "m1", qty: 2, note: "" },
      { id: uid(), menuItemId: "m5", qty: 1, note: "" },
    ],
  },
  {
    id: "g2",
    name: "Tom",
    status: "Editing",
    items: [
      { id: uid(), menuItemId: "m2", qty: 1, note: "extra spicy" },
      { id: uid(), menuItemId: "m6", qty: 1, note: "" },
    ],
  },
  {
    id: "g3",
    name: "Mira",
    status: "Submitted",
    items: [
      { id: uid(), menuItemId: "m4", qty: 1, note: "no croutons" },
      { id: uid(), menuItemId: "m7", qty: 1, note: "" },
    ],
  },
];

const seed = () => ({
  menu: SEED_MENU.map((m) => ({ ...m })),
  guests: SEED_GUESTS.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i })) })),
  orderState: "open" as OrderState,
  shareUrl: "app.example/order/abc123",
  shareGenerated: true,
});

const fmt = (n: number) => `€${n.toFixed(2)}`;

// ---------- Main App ----------

export default function App() {
  const [menu, setMenu] = useState<MenuItem[]>(seed().menu);
  const [guests, setGuests] = useState<Guest[]>(seed().guests);
  const [orderState, setOrderState] = useState<OrderState>("open");
  const [shareUrl, setShareUrl] = useState<string>("app.example/order/abc123");
  const [shareGenerated, setShareGenerated] = useState(true);
  const [role, setRole] = useState<"admin" | "guest">("admin");
  const [activeGuestId, setActiveGuestId] = useState<string>("g2");

  const findItem = (id: string) => menu.find((m) => m.id === id);

  const guestSubtotal = (g: Guest) =>
    g.items.reduce((s, it) => {
      const m = findItem(it.menuItemId);
      return s + (m ? m.price * it.qty : 0);
    }, 0);

  const grandTotal = guests.reduce((s, g) => s + guestSubtotal(g), 0);
  const submittedCount = guests.filter((g) => g.status === "Submitted").length;

  const closed = orderState === "closed";

  const resetDemo = () => {
    const s = seed();
    setMenu(s.menu);
    setGuests(s.guests);
    setOrderState(s.orderState);
    setShareUrl(s.shareUrl);
    setShareGenerated(s.shareGenerated);
    setActiveGuestId("g2");
    toast.success("Demo reset to seeded state");
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "var(--bg-soft)" }}
    >
      <BrandStyles />
      <TopBar
        role={role}
        setRole={setRole}
        onReset={resetDemo}
        orderState={orderState}
      />
      <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        {role === "admin" ? (
          <AdminView
            menu={menu}
            setMenu={setMenu}
            guests={guests}
            setGuests={setGuests}
            orderState={orderState}
            setOrderState={setOrderState}
            shareUrl={shareUrl}
            setShareUrl={setShareUrl}
            shareGenerated={shareGenerated}
            setShareGenerated={setShareGenerated}
            grandTotal={grandTotal}
            submittedCount={submittedCount}
            findItem={findItem}
            guestSubtotal={guestSubtotal}
          />
        ) : (
          <GuestView
            menu={menu}
            guests={guests}
            setGuests={setGuests}
            orderState={orderState}
            activeGuestId={activeGuestId}
            setActiveGuestId={setActiveGuestId}
            findItem={findItem}
            guestSubtotal={guestSubtotal}
          />
        )}
      </main>
      <Toaster position="top-center" richColors />
    </div>
  );
}

function BrandStyles() {
  return (
    <style>{`
      :root {
        --teal: #269A91;
        --teal-600: #1f857d;
        --coral: #D44858;
        --coral-600: #b93b48;
        --bluegrey: #9ABFCB;
        --taupe: #A39286;
        --bg-soft: #F6F4F1;
      }
      .btn-primary { background: var(--teal) !important; color: #fff !important; }
      .btn-primary:hover { background: var(--teal-600) !important; }
      .btn-coral { background: var(--coral) !important; color: #fff !important; }
      .btn-coral:hover { background: var(--coral-600) !important; }
      .text-coral { color: var(--coral); }
      .border-coral { border-color: var(--coral); }
      .bg-teal-soft { background: rgba(38,154,145,0.1); }
      .bg-coral-soft { background: rgba(212,72,88,0.1); }
      .bg-bluegrey-soft { background: rgba(154,191,203,0.25); }
      .bg-taupe-soft { background: rgba(163,146,134,0.18); }
    `}</style>
  );
}

// ---------- Top Bar ----------

function TopBar({
  role,
  setRole,
  onReset,
  orderState,
}: {
  role: "admin" | "guest";
  setRole: (r: "admin" | "guest") => void;
  onReset: () => void;
  orderState: OrderState;
}) {
  return (
    <header
      className="sticky top-0 z-40 w-full border-b"
      style={{ background: "#fff", borderColor: "rgba(0,0,0,0.06)" }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <div
            className="flex size-8 items-center justify-center rounded-md"
            style={{ background: "var(--teal)" }}
          >
            <ShoppingBag className="size-4 text-white" />
          </div>
          <div className="leading-tight">
            <div>{RESTAURANT}</div>
            <div className="text-xs" style={{ color: "var(--taupe)" }}>
              Group order ·{" "}
              <span style={{ color: orderState === "open" ? "var(--teal)" : "var(--coral)" }}>
                {orderState === "open" ? "Open" : "Closed"}
              </span>
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div
            className="flex items-center rounded-md p-0.5"
            style={{ background: "var(--bg-soft)" }}
          >
            <button
              onClick={() => setRole("admin")}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition"
              style={{
                background: role === "admin" ? "var(--teal)" : "transparent",
                color: role === "admin" ? "#fff" : "var(--taupe)",
              }}
            >
              <UserCog className="size-4" /> Admin
            </button>
            <button
              onClick={() => setRole("guest")}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition"
              style={{
                background: role === "guest" ? "var(--teal)" : "transparent",
                color: role === "guest" ? "#fff" : "var(--taupe)",
              }}
            >
              <Users className="size-4" /> Guest
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" /> Reset demo
          </Button>
        </div>
      </div>
    </header>
  );
}

// ---------- Admin View ----------

function AdminView(props: {
  menu: MenuItem[];
  setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  guests: Guest[];
  setGuests: React.Dispatch<React.SetStateAction<Guest[]>>;
  orderState: OrderState;
  setOrderState: (s: OrderState) => void;
  shareUrl: string;
  setShareUrl: (s: string) => void;
  shareGenerated: boolean;
  setShareGenerated: (b: boolean) => void;
  grandTotal: number;
  submittedCount: number;
  findItem: (id: string) => MenuItem | undefined;
  guestSubtotal: (g: Guest) => number;
}) {
  const {
    menu,
    setMenu,
    guests,
    orderState,
    setOrderState,
    shareUrl,
    setShareUrl,
    shareGenerated,
    setShareGenerated,
    grandTotal,
    submittedCount,
    findItem,
    guestSubtotal,
  } = props;

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});
  const [confirmClose, setConfirmClose] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const closed = orderState === "closed";

  const addMenuItem = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Name is required";
    const p = Number(price);
    if (!price.trim() || isNaN(p) || p <= 0) e.price = "Enter a positive number";
    setErrors(e);
    if (Object.keys(e).length) return;
    setMenu((prev) => [
      ...prev,
      { id: uid(), name: name.trim(), price: Number(p.toFixed(2)), category: category.trim() || undefined },
    ]);
    setName("");
    setPrice("");
    setCategory("");
    toast.success("Item added");
  };

  const removeMenuItem = (id: string) => {
    setMenu((prev) => prev.filter((m) => m.id !== id));
  };

  const generateLink = () => {
    const url = `app.example/order/${Math.random().toString(36).slice(2, 8)}`;
    setShareUrl(url);
    setShareGenerated(true);
    toast.success("Share link generated");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {}
    toast.success("Copied");
  };

  const exportText = useMemo(() => {
    const lines: string[] = [RESTAURANT, ""];
    type Key = string;
    const groups = new Map<Key, { name: string; note: string; qty: number; price: number }>();
    for (const g of guests) {
      for (const it of g.items) {
        const m = findItem(it.menuItemId);
        if (!m) continue;
        const key = `${m.id}::${it.note.trim()}`;
        const ex = groups.get(key);
        if (ex) ex.qty += it.qty;
        else groups.set(key, { name: m.name, note: it.note.trim(), qty: it.qty, price: m.price });
      }
    }
    for (const v of groups.values()) {
      if (v.note) lines.push(`${v.qty}x ${v.name} - ${v.note}`);
      else lines.push(`${v.qty}x ${v.name}`);
    }
    lines.push("");
    lines.push(`Total: ${fmt(grandTotal)}`);
    return lines.join("\n");
  }, [guests, findItem, grandTotal]);

  return (
    <div className="grid gap-6">
      {/* Menu setup */}
      <Card>
        <CardHeader>
          <CardTitle>Menu setup</CardTitle>
          <p className="text-sm" style={{ color: "var(--taupe)" }}>
            Restaurant: <span style={{ color: "#000" }}>{RESTAURANT}</span>
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Item name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lasagne"
                className={errors.name ? "border-coral" : ""}
              />
              {errors.name && <span className="text-xs text-coral">{errors.name}</span>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className={errors.price ? "border-coral" : ""}
              />
              {errors.price && <span className="text-xs text-coral">{errors.price}</span>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cat">Category (optional)</Label>
              <Input
                id="cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Pasta"
              />
            </div>
            <Button onClick={addMenuItem} className="btn-primary gap-1.5">
              <Plus className="size-4" /> Add
            </Button>
          </div>

          <Separator />

          {menu.length === 0 ? (
            <EmptyState text="No menu items yet. Add your first item above." />
          ) : (
            <ul className="grid gap-2">
              {menu.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-md border p-3"
                  style={{ borderColor: "rgba(0,0,0,0.08)", background: "#fff" }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{m.name}</span>
                    {m.category && (
                      <Badge variant="secondary" className="bg-bluegrey-soft">
                        {m.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ color: "var(--taupe)" }}>{fmt(m.price)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMenuItem(m.id)}
                      aria-label={`Remove ${m.name}`}
                    >
                      <Trash2 className="size-4 text-coral" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Share link */}
      <Card>
        <CardHeader>
          <CardTitle>Share with the team</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <Button
              onClick={generateLink}
              disabled={menu.length === 0}
              className="btn-primary gap-1.5"
            >
              <LinkIcon className="size-4" /> Generate share link
            </Button>
            {menu.length === 0 && (
              <span className="text-xs" style={{ color: "var(--taupe)" }}>
                Add at least one menu item first.
              </span>
            )}
          </div>
          {shareGenerated && (
            <div className="flex items-center gap-2">
              <Input value={shareUrl} readOnly className="bg-bluegrey-soft" />
              <Button variant="outline" onClick={copyLink} className="gap-1.5">
                <Copy className="size-4" /> Copy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live order overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Live order overview</CardTitle>
          <Badge
            className="bg-bluegrey-soft"
            style={{ color: "#1f4854" }}
            variant="secondary"
          >
            {submittedCount} of {guests.length} submitted
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-3">
          {guests.length === 0 ? (
            <EmptyState text="No guests have joined yet." />
          ) : (
            guests.map((g) => {
              const subtotal = guestSubtotal(g);
              return (
                <div
                  key={g.id}
                  className="rounded-md border p-3"
                  style={{ borderColor: "rgba(0,0,0,0.08)", background: "#fff" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span>{g.name}</span>
                      <StatusBadge status={g.status} />
                    </div>
                    <span style={{ color: "var(--taupe)" }}>{fmt(subtotal)}</span>
                  </div>
                  {g.items.length === 0 ? (
                    <p className="mt-2 text-sm" style={{ color: "var(--taupe)" }}>
                      No items added.
                    </p>
                  ) : (
                    <ul className="mt-2 grid gap-1 text-sm">
                      {g.items.map((it) => {
                        const m = findItem(it.menuItemId);
                        if (!m) return null;
                        return (
                          <li key={it.id} className="flex justify-between gap-2">
                            <span>
                              {it.qty}x {m.name}
                              {it.note && (
                                <span style={{ color: "var(--taupe)" }}>
                                  {" "}— {it.note}
                                </span>
                              )}
                            </span>
                            <span style={{ color: "var(--taupe)" }}>
                              {fmt(m.price * it.qty)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <span>Grand total</span>
            <span>{fmt(grandTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Close / Export */}
      <Card>
        <CardHeader>
          <CardTitle>Order actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {!closed && (
              <Button onClick={() => setConfirmClose(true)} className="btn-coral gap-1.5">
                <Lock className="size-4" /> Close order
              </Button>
            )}
            {closed && (
              <Badge className="bg-coral-soft text-coral" variant="secondary">
                Order closed
              </Badge>
            )}
          </div>

          {closed && (
            <>
              <Separator />
              <div className="grid gap-2">
                <Label>Consolidated export</Label>
                <Textarea readOnly value={exportText} rows={Math.min(14, exportText.split("\n").length + 1)} />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(exportText);
                      } catch {}
                      toast.success("Copied all");
                    }}
                  >
                    <Copy className="size-4" /> Copy all
                  </Button>
                  <Button onClick={() => setEmailOpen(true)} className="btn-primary gap-1.5">
                    <Mail className="size-4" /> Email overview
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close order?</AlertDialogTitle>
            <AlertDialogDescription>
              Members can no longer make changes. This is final.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="btn-coral"
              onClick={() => {
                setOrderState("closed");
                toast.success("Order closed");
              }}
            >
              Close order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EmailModal
        open={emailOpen}
        onOpenChange={setEmailOpen}
        body={exportText}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: GuestStatus }) {
  if (status === "Submitted") {
    return (
      <Badge
        variant="secondary"
        className="bg-teal-soft gap-1"
        style={{ color: "var(--teal-600)" }}
      >
        <Check className="size-3" /> Submitted
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-taupe-soft" style={{ color: "#5c4f44" }}>
      Editing
    </Badge>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      className="rounded-md border border-dashed p-6 text-center text-sm"
      style={{ color: "var(--taupe)", borderColor: "rgba(0,0,0,0.12)" }}
    >
      {text}
    </div>
  );
}

// ---------- Email Modal ----------

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

function EmailModal({
  open,
  onOpenChange,
  body,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  body: string;
}) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [errs, setErrs] = useState<{ to?: string; cc?: string; bcc?: string }>({});

  const send = () => {
    const e: typeof errs = {};
    if (!to.trim() || !isEmail(to)) e.to = "Enter a valid email";
    if (cc.trim() && !isEmail(cc)) e.cc = "Invalid email";
    if (bcc.trim() && !isEmail(bcc)) e.bcc = "Invalid email";
    setErrs(e);
    if (Object.keys(e).length) return;
    toast.success("Sent");
    onOpenChange(false);
    setTo("");
    setCc("");
    setBcc("");
    setErrs({});
  };

  const prank =
    "Thank you for ordering! The bill will be sent to your email shortly, so keep an eye on your inbox 😉";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Email overview</DialogTitle>
          <DialogDescription>
            Send the consolidated order to your team.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="name@team.com"
              className={errs.to ? "border-coral" : ""}
            />
            {errs.to && <span className="text-xs text-coral">{errs.to}</span>}
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cc">CC (optional)</Label>
              <Input
                id="cc"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className={errs.cc ? "border-coral" : ""}
              />
              {errs.cc && <span className="text-xs text-coral">{errs.cc}</span>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bcc">BCC (optional)</Label>
              <Input
                id="bcc"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                className={errs.bcc ? "border-coral" : ""}
              />
              {errs.bcc && <span className="text-xs text-coral">{errs.bcc}</span>}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Preview</Label>
            <div
              className="rounded-md border p-3 text-sm"
              style={{ background: "#fff", borderColor: "rgba(0,0,0,0.08)" }}
            >
              <pre className="whitespace-pre-wrap font-sans">{body}</pre>
              <p className="mt-3" style={{ color: "var(--coral)" }}>
                {prank}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="btn-primary" onClick={send}>
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Guest View ----------

function GuestView(props: {
  menu: MenuItem[];
  guests: Guest[];
  setGuests: React.Dispatch<React.SetStateAction<Guest[]>>;
  orderState: OrderState;
  activeGuestId: string;
  setActiveGuestId: (id: string) => void;
  findItem: (id: string) => MenuItem | undefined;
  guestSubtotal: (g: Guest) => number;
}) {
  const {
    menu,
    guests,
    setGuests,
    orderState,
    activeGuestId,
    setActiveGuestId,
    findItem,
    guestSubtotal,
  } = props;

  const closed = orderState === "closed";
  const guest = guests.find((g) => g.id === activeGuestId);
  const [nameDraft, setNameDraft] = useState(guest?.name ?? "");

  // keep name field in sync when switching demo guest
  const switchGuest = (id: string) => {
    setActiveGuestId(id);
    const g = guests.find((x) => x.id === id);
    setNameDraft(g?.name ?? "");
  };

  const newGuest = () => {
    const id = uid();
    const g: Guest = { id, name: "", status: "Editing", items: [] };
    setGuests((prev) => [...prev, g]);
    setActiveGuestId(id);
    setNameDraft("");
  };

  if (!guest) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState text="No guest selected." />
          <div className="mt-3">
            <Button className="btn-primary" onClick={newGuest}>
              Join as new guest
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const updateGuest = (updater: (g: Guest) => Guest) => {
    setGuests((prev) => prev.map((g) => (g.id === guest.id ? updater(g) : g)));
  };

  const flipToEditingIfSubmitted = (g: Guest): Guest =>
    g.status === "Submitted" ? { ...g, status: "Editing" } : g;

  const setName = (v: string) => {
    setNameDraft(v);
    updateGuest((g) => ({ ...g, name: v }));
  };

  const addItem = (m: MenuItem) => {
    if (closed) return;
    if (!guest.name.trim()) return;
    updateGuest((g) => {
      const next = flipToEditingIfSubmitted(g);
      return {
        ...next,
        items: [...next.items, { id: uid(), menuItemId: m.id, qty: 1, note: "" }],
      };
    });
    toast.success(`Added ${m.name}`);
  };

  const setQty = (itemId: string, qty: number) => {
    if (closed) return;
    if (qty < 1) qty = 1;
    updateGuest((g) => {
      const next = flipToEditingIfSubmitted(g);
      return {
        ...next,
        items: next.items.map((it) => (it.id === itemId ? { ...it, qty } : it)),
      };
    });
  };

  const setNote = (itemId: string, note: string) => {
    if (closed) return;
    updateGuest((g) => {
      const next = flipToEditingIfSubmitted(g);
      return {
        ...next,
        items: next.items.map((it) => (it.id === itemId ? { ...it, note } : it)),
      };
    });
  };

  const removeItem = (itemId: string) => {
    if (closed) return;
    updateGuest((g) => {
      const next = flipToEditingIfSubmitted(g);
      return { ...next, items: next.items.filter((it) => it.id !== itemId) };
    });
  };

  const submit = () => {
    if (!guest.items.length) return;
    updateGuest((g) => ({ ...g, status: "Submitted" }));
    toast.success("Order submitted");
  };

  const reopen = () => {
    updateGuest((g) => ({ ...g, status: "Editing" }));
    toast.success("Reopened for editing");
  };

  const subtotal = guestSubtotal(guest);
  const submitted = guest.status === "Submitted";
  const canAct = !!guest.name.trim() && !closed;

  // group menu by category
  const groups = useMemo(() => {
    const g = new Map<string, MenuItem[]>();
    for (const m of menu) {
      const k = m.category ?? "Other";
      const arr = g.get(k) ?? [];
      arr.push(m);
      g.set(k, arr);
    }
    return Array.from(g.entries());
  }, [menu]);

  return (
    <div className="grid gap-6">
      {/* demo guest switcher */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <span className="text-sm" style={{ color: "var(--taupe)" }}>
            Demo: viewing as
          </span>
          {guests.map((g) => (
            <Button
              key={g.id}
              size="sm"
              variant={g.id === activeGuestId ? "default" : "outline"}
              className={g.id === activeGuestId ? "btn-primary" : ""}
              onClick={() => switchGuest(g.id)}
            >
              {g.name || "(unnamed)"}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={newGuest} className="gap-1">
            <Plus className="size-3.5" /> New guest
          </Button>
        </CardContent>
      </Card>

      {closed && (
        <div className="rounded-md border p-3 text-sm border-coral bg-coral-soft text-coral">
          This order is closed — no more changes can be made.
        </div>
      )}

      {submitted && !closed && (
        <div
          className="rounded-md border p-3 text-sm bg-teal-soft"
          style={{ borderColor: "var(--teal)", color: "var(--teal-600)" }}
        >
          Your order is submitted — the organizer can see it. You can still{" "}
          <button onClick={reopen} className="underline">
            reopen to make changes
          </button>
          .
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{RESTAURANT}</CardTitle>
          <p className="text-sm" style={{ color: "var(--taupe)" }}>
            Add your meals and submit when you're done.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="gname">Your name</Label>
            <Input
              id="gname"
              value={nameDraft}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              disabled={closed}
            />
            {!guest.name.trim() && !closed && (
              <span className="text-xs" style={{ color: "var(--taupe)" }}>
                Enter your name to start adding items.
              </span>
            )}
          </div>

          <Separator />

          {menu.length === 0 ? (
            <EmptyState text="The organizer hasn't added any menu items yet." />
          ) : (
            <div className="grid gap-4">
              {groups.map(([cat, items]) => (
                <div key={cat} className="grid gap-2">
                  <div className="text-sm" style={{ color: "var(--taupe)" }}>
                    {cat}
                  </div>
                  <ul className="grid gap-2">
                    {items.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between rounded-md border p-3"
                        style={{ borderColor: "rgba(0,0,0,0.08)", background: "#fff" }}
                      >
                        <div>
                          <div>{m.name}</div>
                          <div className="text-sm" style={{ color: "var(--taupe)" }}>
                            {fmt(m.price)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="btn-primary gap-1"
                          disabled={!canAct}
                          onClick={() => addItem(m)}
                        >
                          <Plus className="size-4" /> Add
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your items</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {guest.items.length === 0 ? (
            <EmptyState text="You haven't added anything yet." />
          ) : (
            guest.items.map((it) => {
              const m = findItem(it.menuItemId);
              if (!m) return null;
              return (
                <div
                  key={it.id}
                  className="grid gap-2 rounded-md border p-3"
                  style={{ borderColor: "rgba(0,0,0,0.08)", background: "#fff" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div>{m.name}</div>
                      <div className="text-sm" style={{ color: "var(--taupe)" }}>
                        {fmt(m.price)} each · {fmt(m.price * it.qty)} subtotal
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={closed || it.qty <= 1}
                        onClick={() => setQty(it.id, it.qty - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span className="w-8 text-center">{it.qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={closed}
                        onClick={() => setQty(it.id, it.qty + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={closed}
                        onClick={() => removeItem(it.id)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="size-4 text-coral" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    value={it.note}
                    placeholder="Add a note (optional) — e.g. no onions"
                    disabled={closed}
                    onChange={(e) => setNote(it.id, e.target.value)}
                  />
                </div>
              );
            })
          )}

          <Separator />
          <div className="flex items-center justify-between">
            <span>Your subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {!submitted ? (
              <Button
                className="btn-primary gap-1.5"
                disabled={closed || guest.items.length === 0 || !guest.name.trim()}
                onClick={submit}
              >
                <Check className="size-4" /> Submit my order
              </Button>
            ) : (
              <Button variant="outline" disabled={closed} onClick={reopen} className="gap-1.5">
                <RotateCcw className="size-4" /> Reopen / edit my order
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
