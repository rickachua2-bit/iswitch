import { useState } from "react";
import { ArrowLeftRight, Calendar, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { AirportAutocomplete } from "@/components/AirportAutocomplete";
import { TravelersPopover, travelersDisplay, type TravelersValue } from "@/components/TravelersPopover";

export type TripType = "one-way" | "round-trip" | "multi-city";

export interface FlightSegment {
  origin: string;
  destination: string;
  departure: string;
}

export interface FlightSearchPayload {
  trip: TripType;
  origin: string;
  destination: string;
  departure: string;
  returnDate: string;
  travelers: string;
  cabin: TravelersValue["cabin"];
  adults: string;
  children: string;
  infants: string;
  /** JSON-encoded segments when trip === "multi-city" */
  segments?: string;
}

interface Props {
  onSearch: (q: Record<string, string>) => void;
  pending?: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export function FlightForm({ onSearch, pending = false }: Props) {
  const [trip, setTrip] = useState<TripType>("round-trip");
  const [origin, setOrigin] = useState("Lagos (LOS)");
  const [destination, setDestination] = useState("London (LHR)");
  const [departure, setDeparture] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [travelers, setTravelers] = useState<TravelersValue>({
    adults: 1, children: 0, infants: 0, cabin: "economy",
  });

  // multi-city
  const [segments, setSegments] = useState<FlightSegment[]>([
    { origin: "Lagos (LOS)", destination: "London (LHR)", departure: "" },
    { origin: "London (LHR)", destination: "New York (JFK)", departure: "" },
  ]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: FlightSearchPayload = {
      trip,
      origin: trip === "multi-city" ? segments[0].origin : origin,
      destination: trip === "multi-city" ? segments[segments.length - 1].destination : destination,
      departure: trip === "multi-city" ? segments[0].departure : departure,
      returnDate: trip === "round-trip" ? returnDate : "",
      travelers: travelersDisplay(travelers),
      cabin: travelers.cabin,
      adults: String(travelers.adults),
      children: String(travelers.children),
      infants: String(travelers.infants),
      segments: trip === "multi-city" ? JSON.stringify(segments) : "",
    };
    onSearch(payload as unknown as Record<string, string>);
  }

  function updateSegment(i: number, patch: Partial<FlightSegment>) {
    setSegments((arr) => arr.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addSegment() {
    if (segments.length >= 5) return;
    const last = segments[segments.length - 1];
    setSegments((arr) => [...arr, { origin: last.destination, destination: "", departure: "" }]);
  }
  function removeSegment(i: number) {
    if (segments.length <= 2) return;
    setSegments((arr) => arr.filter((_, idx) => idx !== i));
  }

  return (
    <form onSubmit={submit}>
      {/* Trip type pills */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full bg-secondary p-1">
          {(["round-trip", "one-way", "multi-city"] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTrip(t)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition ${
                trip === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {trip !== "multi-city" ? (
        <SimpleGrid
          trip={trip}
          origin={origin} setOrigin={setOrigin}
          destination={destination} setDestination={setDestination}
          departure={departure} setDeparture={setDeparture}
          returnDate={returnDate} setReturnDate={setReturnDate}
          travelers={travelers} setTravelers={setTravelers}
          pending={pending}
        />
      ) : (
        <MultiCity
          segments={segments}
          updateSegment={updateSegment}
          addSegment={addSegment}
          removeSegment={removeSegment}
          travelers={travelers}
          setTravelers={setTravelers}
          pending={pending}
        />
      )}
    </form>
  );
}

/* ----- Simple (one-way / round-trip) ----- */
function SimpleGrid(props: {
  trip: TripType;
  origin: string; setOrigin: (s: string) => void;
  destination: string; setDestination: (s: string) => void;
  departure: string; setDeparture: (s: string) => void;
  returnDate: string; setReturnDate: (s: string) => void;
  travelers: TravelersValue; setTravelers: (v: TravelersValue) => void;
  pending?: boolean;
}) {
  const { trip, origin, setOrigin, destination, setDestination,
    departure, setDeparture, returnDate, setReturnDate, travelers, setTravelers, pending } = props;
  const isRound = trip === "round-trip";
  const cols = isRound
    ? "md:grid-cols-[1fr_1fr_1fr_1fr_1.1fr_auto]"
    : "md:grid-cols-[1fr_1fr_1fr_1.1fr_auto]";

  return (
    <div className={`grid grid-cols-1 gap-3 ${cols}`}>
      <div className="relative md:col-span-2">
        <div className="grid grid-cols-2 gap-3">
          <AirportAutocomplete label="From" value={origin} onChange={(d) => setOrigin(d)} />
          <AirportAutocomplete label="To" value={destination} onChange={(d) => setDestination(d)} />
        </div>
        <button
          type="button"
          onClick={() => { const o = origin; setOrigin(destination); setDestination(o); }}
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-card p-1.5 shadow-card hover:bg-secondary"
          aria-label="Swap"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
        </button>
      </div>

      <DateField label="Departure" value={departure} min={today()} onChange={setDeparture} />

      {isRound && (
        <DateField
          label="Return"
          value={returnDate}
          min={departure || today()}
          onChange={setReturnDate}
        />
      )}

      <TravelersPopover value={travelers} onChange={setTravelers} />
      <SubmitBtn />
    </div>
  );
}

/* ----- Multi-city ----- */
function MultiCity(props: {
  segments: FlightSegment[];
  updateSegment: (i: number, patch: Partial<FlightSegment>) => void;
  addSegment: () => void;
  removeSegment: (i: number) => void;
  travelers: TravelersValue;
  setTravelers: (v: TravelersValue) => void;
}) {
  const { segments, updateSegment, addSegment, removeSegment, travelers, setTravelers } = props;
  return (
    <div className="space-y-3">
      {segments.map((seg, i) => (
        <div key={i} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <AirportAutocomplete
            label={`Flight ${i + 1} • From`}
            value={seg.origin}
            onChange={(d) => updateSegment(i, { origin: d })}
          />
          <AirportAutocomplete
            label="To"
            value={seg.destination}
            onChange={(d) => updateSegment(i, { destination: d })}
          />
          <DateField
            label="Departure"
            value={seg.departure}
            min={i === 0 ? today() : (segments[i - 1].departure || today())}
            onChange={(v) => updateSegment(i, { departure: v })}
          />
          <button
            type="button"
            onClick={() => removeSegment(i)}
            disabled={segments.length <= 2}
            className="flex items-center justify-center rounded-xl border border-border bg-background px-3 text-muted-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Remove flight"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addSegment}
          disabled={segments.length >= 5}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> Add another flight
        </button>
        <span className="text-[11px] text-muted-foreground">Up to 5 flights</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.1fr_auto]">
        <TravelersPopover value={travelers} onChange={setTravelers} />
        <SubmitBtn />
      </div>
    </div>
  );
}

/* ----- Field primitives ----- */
function DateField({
  label, value, min, onChange,
}: { label: string; value: string; min?: string; onChange: (v: string) => void }) {
  return (
    <label className="group flex flex-col gap-1 rounded-xl border border-border bg-background px-3.5 py-2.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Calendar className="h-3 w-3" /> {label}
      </div>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </label>
  );
}

function SubmitBtn() {
  return (
    <button
      type="submit"
      className="flex h-full min-h-[58px] items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 text-sm font-bold text-primary-foreground shadow-glow transition hover:opacity-95"
    >
      <Search className="h-4 w-4" strokeWidth={2.6} /> Search
    </button>
  );
}
