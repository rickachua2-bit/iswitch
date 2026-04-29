import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { verifyPayment } from "@/server/payments.functions";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

const search = z.object({
  booking: z.string().optional().default(""),
  ref: z.string().optional().default(""),
});

export const Route = createFileRoute("/checkout/return")({
  head: () => ({ meta: [{ title: "Payment status — iSwitchUb" }] }),
  validateSearch: (s) => search.parse(s),
  component: ReturnPage,
});

function ReturnPage() {
  const { ref } = Route.useSearch();
  const [state, setState] = useState<"loading" | "success" | "failed" | "pending">("loading");
  const [info, setInfo] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ref) {
      setState("failed");
      setErr("Missing payment reference");
      return;
    }
    (async () => {
      try {
        const res = await verifyPayment({ data: { reference: ref } });
        if (!res.ok) {
          setState("failed");
          setErr(res.error);
          return;
        }
        setInfo(res);
        const ps = res.booking?.payment_status;
        if (ps === "paid") setState("success");
        else if (ps === "failed") setState("failed");
        else setState("pending");
      } catch (e: any) {
        setState("failed");
        setErr(e?.message ?? "Verification failed");
      }
    })();
  }, [ref]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-16">
      {state === "loading" && (
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h1 className="mt-4 text-2xl font-extrabold">Verifying your payment…</h1>
          <p className="mt-1 text-sm text-muted-foreground">This may take a few seconds.</p>
        </div>
      )}
      {state === "success" && (
        <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="mt-3 text-2xl font-extrabold text-foreground">Payment successful!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your booking is being confirmed.
          </p>
          {info?.booking?.external_reference && (
            <div className="mt-4 inline-block rounded-lg bg-card px-4 py-2 text-sm">
              <span className="text-muted-foreground">Reference:</span>{" "}
              <span className="font-bold">{info.booking.external_reference}</span>
            </div>
          )}
          {info?.booking?.fulfillment_status === "manual_pending" && (
            <p className="mt-3 flex items-center justify-center gap-2 text-sm text-foreground">
              <Mail className="h-4 w-4" /> We'll email your confirmation shortly.
            </p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/dashboard/bookings" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
              View my bookings
            </Link>
            <Link to="/" className="rounded-lg border border-border px-5 py-2.5 text-sm font-bold">Home</Link>
          </div>
        </div>
      )}
      {state === "pending" && (
        <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-amber-600" />
          <h1 className="mt-3 text-2xl font-extrabold">Payment processing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We'll email you as soon as it's confirmed.
          </p>
          <Link to="/dashboard/bookings" className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            View my bookings
          </Link>
        </div>
      )}
      {state === "failed" && (
        <div className="w-full rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <XCircle className="mx-auto h-14 w-14 text-destructive" />
          <h1 className="mt-3 text-2xl font-extrabold">Payment failed</h1>
          <p className="mt-1 text-sm text-muted-foreground">{err ?? "We couldn't process your payment."}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
              Try again
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
