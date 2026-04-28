import { useState } from "react";
import {
  ChevronDown, RefreshCw, Pencil, Luggage, Briefcase, Plane,
  AlertTriangle, ShieldCheck, Globe2, Clock,
} from "lucide-react";

/* ---------------- helpers ---------------- */

function parseDuration(d?: string | number): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  const m = String(d).match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return Number(m[1] || 0) * 60 + Number(m[2] || 0);
}
function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
function codeOf(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v.iata_code ?? v.code ?? v.airport_code ?? "";
}

/** Country lookup for transit visa hints, keyed by airport IATA. */
const AIRPORT_COUNTRY: Record<string, { country: string; code: string }> = {
  DXB: { country: "United Arab Emirates", code: "AE" },
  AUH: { country: "United Arab Emirates", code: "AE" },
  DOH: { country: "Qatar", code: "QA" },
  IST: { country: "Türkiye", code: "TR" },
  CDG: { country: "France", code: "FR" },
  ORY: { country: "France", code: "FR" },
  LHR: { country: "United Kingdom", code: "GB" },
  LGW: { country: "United Kingdom", code: "GB" },
  AMS: { country: "Netherlands", code: "NL" },
  FRA: { country: "Germany", code: "DE" },
  MUC: { country: "Germany", code: "DE" },
  ZRH: { country: "Switzerland", code: "CH" },
  JFK: { country: "United States", code: "US" },
  EWR: { country: "United States", code: "US" },
  ATL: { country: "United States", code: "US" },
  ORD: { country: "United States", code: "US" },
  YYZ: { country: "Canada", code: "CA" },
  HND: { country: "Japan", code: "JP" },
  NRT: { country: "Japan", code: "JP" },
  SIN: { country: "Singapore", code: "SG" },
  HKG: { country: "Hong Kong", code: "HK" },
  ADD: { country: "Ethiopia", code: "ET" },
  CAI: { country: "Egypt", code: "EG" },
  NBO: { country: "Kenya", code: "KE" },
  JNB: { country: "South Africa", code: "ZA" },
};

/** Per-country transit visa guidance — short, factual, conservative. */
const TRANSIT_RULES: Record<
  string,
  { airside: string; landside: string; tip?: string }
> = {
  GB: {
    airside: "Most travellers may transit airside (Direct Airside Transit) without a visa, but many nationalities still need a DATV.",
    landside: "If you need to clear immigration (change terminals or collect bags), a Transit Visit Visa is required for most non-EEA travellers.",
    tip: "Heathrow T2/T3/T5 transfers stay airside; T4 may need landside transfer.",
  },
  US: {
    airside: "The US has no airside transit — every passenger must clear US immigration.",
    landside: "A valid US visa (B1/B2 or C-1) or ESTA (visa-waiver countries) is required even for connections.",
    tip: "Allow at least 3 hours for connections at JFK/EWR/ATL.",
  },
  AE: {
    airside: "Airside transit at DXB / AUH is visa-free for most nationalities.",
    landside: "A 96-hour transit visa is available if you want to leave the airport.",
  },
  QA: {
    airside: "Airside transit at DOH is visa-free for most nationalities.",
    landside: "Stopover programme allows up to 96 hours visa-free for many travellers.",
  },
  TR: {
    airside: "Airside transit at IST is visa-free for most nationalities.",
    landside: "An e-Visa is required to leave the airport for most travellers.",
  },
  FR: {
    airside: "Schengen airside transit may require an Airport Transit Visa (ATV) for some nationalities.",
    landside: "A Schengen visa is required to leave CDG/ORY airside zones.",
  },
  DE: {
    airside: "Schengen airside transit may require an ATV for some nationalities.",
    landside: "A Schengen visa is required to leave the airport.",
  },
  NL: {
    airside: "Schengen airside transit at AMS may require an ATV for some nationalities.",
    landside: "A Schengen visa is required to leave the airport.",
  },
  CH: {
    airside: "Schengen airside transit at ZRH may require an ATV for some nationalities.",
    landside: "A Schengen visa is required to leave the airport.",
  },
  CA: {
    airside: "Canada has no airside transit at most airports — you will be cleared by CBSA.",
    landside: "Most travellers need a Canadian eTA or visa even for connections; check the CTP programme.",
  },
  JP: {
    airside: "Airside transit at NRT/HND is visa-free for most nationalities.",
    landside: "Shore-pass available for short landside stays for many nationalities.",
  },
  SG: {
    airside: "Airside transit at SIN is visa-free for most nationalities.",
    landside: "96-hour Visa-Free Transit Facility available for eligible travellers.",
  },
  HK: {
    airside: "Airside transit at HKG is visa-free for most nationalities.",
    landside: "7-day visa-free entry available for many nationalities.",
  },
  ET: {
    airside: "Airside transit at ADD is visa-free for most nationalities.",
    landside: "Transit visa available on arrival; e-Visa recommended.",
  },
  EG: {
    airside: "Airside transit at CAI is visa-free for most nationalities.",
    landside: "Egypt e-Visa or visa on arrival required to leave the airport.",
  },
  KE: {
    airside: "Airside transit at NBO is visa-free for most nationalities.",
    landside: "Kenyan eTA required to leave the airport.",
  },
  ZA: {
    airside: "Airside transit at JNB is visa-free for many nationalities.",
    landside: "Visa may be required to leave the airport — check by passport.",
  },
};

const DEFAULT_TRANSIT = {
  airside: "Most travellers can stay airside without a visa for short connections.",
  landside: "Leaving the airport usually requires a transit or short-stay visa.",
};

/* ---------------- main component ---------------- */

export function FareAndTransitRules({
  offer,
  fare,
}: {
  offer: any;
  fare: any;
}) {
  const slices: any[] = offer?.slices ?? offer?.itineraries ?? [];

  // Build connection points from all slices.
  const connections: Array<{
    iata: string;
    layoverMin: number;
    country: string;
    countryCode: string;
  }> = [];
  slices.forEach((slice: any) => {
    const segs = slice?.segments ?? [];
    for (let i = 0; i < segs.length - 1; i++) {
      const a = segs[i];
      const b = segs[i + 1];
      const iata =
        codeOf(a?.destination) || codeOf(b?.origin) || "";
      let mins = 0;
      if (a?.arriving_at && b?.departing_at) {
        mins = Math.round(
          (new Date(b.departing_at).getTime() -
            new Date(a.arriving_at).getTime()) / 60000,
        );
      }
      const country = AIRPORT_COUNTRY[iata] ?? {
        country: iata || "Transit airport",
        code: "",
      };
      connections.push({
        iata,
        layoverMin: mins,
        country: country.country,
        countryCode: country.code,
      });
    }
  });

  return (
    <div className="space-y-4">
      <FareRulesCard fare={fare} />
      <TransitRulesCard connections={connections} />
    </div>
  );
}

/* ---------------- fare rules ---------------- */

function FareRulesCard({ fare }: { fare: any }) {
  const [open, setOpen] = useState(true);

  const fareName = fare?.name ?? "Standard";
  const checkedOk = !!fare?.checkedOk;
  const refundableOk = !!fare?.refundableOk;
  const changeableOk = !!fare?.changeableOk;
  const carryOn = fare?.carryOn ?? "Carry-on 7 kg";
  const checked = fare?.checked ?? "Checked baggage policy as per airline";
  const refundable = fare?.refundable ?? "Non-refundable";
  const changeable = fare?.changeable ?? "Change fee may apply";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left md:px-5"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-bold text-foreground">Fare rules</div>
            <div className="text-[11px] text-muted-foreground">
              {fareName} fare · please review before booking
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-4 py-4 md:px-5">
          <RuleRow icon={Luggage} ok title="Cabin baggage" desc={carryOn} />
          <RuleRow
            icon={Briefcase}
            ok={checkedOk}
            title="Checked baggage"
            desc={checked}
          />
          <RuleRow
            icon={Pencil}
            ok={changeableOk}
            title="Date / flight changes"
            desc={
              changeableOk
                ? `${changeable}. Fare difference may apply if rebooking to a higher fare.`
                : `${changeable}. The airline charges a change fee plus any fare difference.`
            }
          />
          <RuleRow
            icon={RefreshCw}
            ok={refundableOk}
            title="Cancellation & refund"
            desc={
              refundableOk
                ? `${refundable}. Refunds are processed back to the original payment method within 7–14 business days.`
                : `${refundable}. Government taxes are usually still refundable on request.`
            }
          />
          <RuleRow
            icon={Plane}
            ok
            title="No-show policy"
            desc="Failure to board the outbound flight will void all subsequent flights on the ticket. Contact us at least 2 hours before departure to rebook."
          />

          <div className="rounded-md border border-border bg-secondary/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
            Fare rules are set by the operating airline. The summary above is a
            simplified guide — the airline's full conditions of carriage apply
            and will be shown on your e-ticket.
          </div>
        </div>
      )}
    </div>
  );
}

function RuleRow({
  icon: Icon,
  ok,
  title,
  desc,
}: {
  icon: any;
  ok: boolean;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
          ok ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <div className="text-sm font-bold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

/* ---------------- transit visa rules ---------------- */

function TransitRulesCard({
  connections,
}: {
  connections: Array<{
    iata: string;
    layoverMin: number;
    country: string;
    countryCode: string;
  }>;
}) {
  const [open, setOpen] = useState(true);

  if (!connections.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left md:px-5"
      >
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-bold text-foreground">Transit visa rules</div>
            <div className="text-[11px] text-muted-foreground">
              {connections.length} connection{connections.length > 1 ? "s" : ""} on this trip
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-4 py-4 md:px-5">
          {connections.map((c, i) => {
            const rule = TRANSIT_RULES[c.countryCode] ?? DEFAULT_TRANSIT;
            const longStop = c.layoverMin >= 6 * 60;
            return (
              <div
                key={i}
                className="rounded-lg border border-border bg-secondary/30 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-extrabold tracking-wider text-primary">
                    {c.iata || "—"}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {c.country}
                  </span>
                  {c.layoverMin > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {fmtDuration(c.layoverMin)} layover
                    </span>
                  )}
                  {longStop && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Long transit
                    </span>
                  )}
                </div>
                <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
                  <div className="rounded-md border border-border bg-card p-2">
                    <div className="font-bold text-foreground">Stay airside</div>
                    <div className="text-muted-foreground">{rule.airside}</div>
                  </div>
                  <div className="rounded-md border border-border bg-card p-2">
                    <div className="font-bold text-foreground">Leave the airport</div>
                    <div className="text-muted-foreground">{rule.landside}</div>
                  </div>
                </div>
                {("tip" in rule && rule.tip) && (
                  <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <span className="font-bold text-primary">Tip:</span> {rule.tip}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              Transit visa rules depend on your <b>passport nationality</b>,
              terminal change, and ticket type. This is general guidance —
              please confirm with the airline or the destination embassy
              before travelling. Need help? Book a paid expert visa
              consultation from the menu.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
