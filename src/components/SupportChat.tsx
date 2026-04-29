import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Headphones } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const WELCOME: Msg = {
  role: "assistant",
  content: "Hi! I'm your iSwitch support assistant. Ask me about bookings, refunds, visas, agent applications — anything. A human agent can also jump in if needed.",
};

export function SupportChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      // Lightweight client-side reply for now; ready to upgrade to AI gateway later.
      await new Promise((r) => setTimeout(r, 600));
      const reply = autoReply(text, !!user);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err: any) {
      toast.error("Support unavailable", { description: err?.message ?? "Try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open support chat"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-2xl shadow-primary/40 ring-4 ring-accent/30 transition hover:scale-110 active:scale-95"
        style={{ background: "var(--gradient-primary)" }}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-extrabold text-accent-foreground ring-2 ring-background">
            1
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border-2 border-primary/20 bg-card shadow-2xl shadow-primary/20 ring-1 ring-accent/20">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground ring-2 ring-accent-glow/50">
              <Headphones className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="font-display text-sm font-extrabold">Support chat</div>
              <div className="flex items-center gap-1.5 text-[11px] opacity-90">
                <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
                Online · replies in minutes
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-secondary/30 px-3 py-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "rounded-br-sm text-primary-foreground"
                      : "rounded-bl-sm border border-border bg-card text-foreground"
                  }`}
                  style={m.role === "user" ? { background: "var(--gradient-primary)" } : undefined}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Agent is typing…
                </div>
              </div>
            )}
          </div>

          {/* Quick chips */}
          <div className="flex flex-wrap gap-1.5 border-t border-border bg-card px-3 py-2">
            {["Where is my booking?", "Cancel / refund", "Visa help", "Talk to a human"].map((q) => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); void send(); }}
            className="flex items-center gap-2 border-t border-border bg-card p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              className="flex-1 rounded-lg border-2 border-primary/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground shadow-md shadow-primary/30 transition hover:scale-105 disabled:opacity-50"
              style={{ background: "var(--gradient-primary)" }}
              aria-label="Send"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function autoReply(text: string, signedIn: boolean): string {
  const t = text.toLowerCase();
  if (t.includes("human") || t.includes("agent")) return "Got it — I've flagged this conversation for a human agent. Someone from our team will reach out by email shortly.";
  if (t.includes("refund") || t.includes("cancel")) return "For cancellations and refunds, head to **My Bookings**, open the booking, and tap *Cancel*. Refund timing depends on the provider's policy. Want me to escalate a specific booking?";
  if (t.includes("visa")) return "For visa applications you can browse offers under **Search & Book → Visas**. Documents are uploaded inside each application. Need help with a specific country?";
  if (t.includes("booking") || t.includes("status") || t.includes("where")) return signedIn
    ? "All your bookings live in the **My Bookings** tab on the left. Each row shows status (pending, confirmed, completed) and a reference number."
    : "Please sign in and open **My Bookings** to view live status and reference numbers.";
  return "Thanks! I've noted that. A support specialist will follow up by email — usually within a few minutes during business hours.";
}
