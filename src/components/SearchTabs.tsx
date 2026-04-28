import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plane, Hotel, FileCheck, Shield, Map, Car, GraduationCap,
  MapPin, Calendar, Users, Search, Globe,
} from "lucide-react";
import { FlightForm } from "@/components/FlightForm";
import {
  GuestsRoomsPopover,
  guestsRoomsDisplay,
  parseGuestsRooms,
} from "@/components/GuestsRoomsPopover";

type TabId = "flights" | "stays" | "visas" | "insurance" | "tours" | "pickups";

const TABS: { id: TabId; label: string; icon: typeof Plane; route: string }[] = [
  { id: "flights", label: "Flights", icon: Plane, route: "/flights" },
  { id: "stays", label: "Hotels", icon: Hotel, route: "/stays" },
  { id: "visas", label: "Visas", icon: FileCheck, route: "/visas" },
  { id: "insurance", label: "Insurance", icon: Shield, route: "/insurance" },
  { id: "tours", label: "Tours", icon: Map, route: "/tours" },
  { id: "pickups", label: "Car Transfers", icon: Car, route: "/pickups" },
];

function tabFromPath(pathname: string): TabId {
  if (pathname.startsWith("/stays")) return "stays";
  if (pathname.startsWith("/visas")) return "visas";
  if (pathname.startsWith("/insurance")) return "insurance";
  if (pathname.startsWith("/tours")) return "tours";
  if (pathname.startsWith("/pickups")) return "pickups";
  return "flights";
}

export function SearchTabs({ defaultTab }: { defaultTab?: TabId } = {}) {
  const location = useLocation();
  const routeTab = defaultTab ?? tabFromPath(location.pathname);
  const [active, setActive] = useState<TabId>(routeTab);
  const navigate = useNavigate();

  useEffect(() => {
    setActive(routeTab);
  }, [routeTab]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      {/* Tab strip — all 7 services, evenly distributed on desktop, scrollable on mobile */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide md:grid md:grid-cols-6 md:gap-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex min-w-fit items-center justify-center gap-2 rounded-t-xl px-3 py-3 text-xs font-bold transition md:text-sm ${
                isActive
                  ? "bg-card text-primary shadow-card"
                  : "bg-white/15 text-primary-foreground hover:bg-white/25"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2.4} />
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div className="rounded-b-2xl rounded-tr-2xl bg-card p-4 shadow-elevated md:p-6">
        {active === "flights" && <FlightForm onSearch={(q) => navigate({ to: "/flights", search: q as never })} />}
        {active === "stays" && <StayForm onSearch={(q) => navigate({ to: "/stays", search: q as never })} />}
        {active === "visas" && <VisaForm onSearch={(q) => navigate({ to: "/visas", search: q as never })} />}
        {active === "insurance" && <InsuranceForm onSearch={(q) => navigate({ to: "/insurance", search: q as never })} />}
        {active === "tours" && <ToursForm onSearch={(q) => navigate({ to: "/tours", search: q as never })} />}
        {active === "pickups" && <PickupForm onSearch={(q) => navigate({ to: "/pickups", search: q as never })} />}
      </div>
    </div>
  );
}

/* ----- Field primitives ----- */
function Field({
  icon: Icon, label, children,
}: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <label className="group flex flex-col gap-1 rounded-xl border border-border bg-background px-3.5 py-2.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
    />
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

/* ----- Stays ----- */
function StayForm({ onSearch }: { onSearch: (q: Record<string, string>) => void }) {
  const [destination, setDestination] = useState("Dubai");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestsRooms, setGuestsRooms] = useState(() => parseGuestsRooms("2 Guests, 1 Room"));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch({ destination, checkIn, checkOut, guests: guestsRoomsDisplay(guestsRooms) });
      }}
      className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr_1.1fr_auto]"
    >
      <Field icon={MapPin} label="Destination">
        <TextInput value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="City, hotel or area" />
      </Field>
      <Field icon={Calendar} label="Check-in">
        <TextInput type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
      </Field>
      <Field icon={Calendar} label="Check-out">
        <TextInput type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
      </Field>
      <GuestsRoomsPopover value={guestsRooms} onChange={setGuestsRooms} />
      <SubmitBtn />
    </form>
  );
}

/* ----- Visas ----- */
function VisaForm({ onSearch }: { onSearch: (q: Record<string, string>) => void }) {
  const [nationality, setNationality] = useState("Nigeria");
  const [destination, setDestination] = useState("United Kingdom");
  const [visaType, setVisaType] = useState("Tourist");

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSearch({ nationality, destination, visaType }); }}
      className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
    >
      <Field icon={Globe} label="Nationality">
        <TextInput value={nationality} onChange={(e) => setNationality(e.target.value)} />
      </Field>
      <Field icon={MapPin} label="Destination">
        <TextInput value={destination} onChange={(e) => setDestination(e.target.value)} />
      </Field>
      <Field icon={FileCheck} label="Visa type">
        <select
          value={visaType}
          onChange={(e) => setVisaType(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold text-foreground focus:outline-none"
        >
          {["Tourist", "Business", "Student", "Work", "Transit"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </Field>
      <SubmitBtn />
    </form>
  );
}



/* ----- Insurance ----- */
function InsuranceForm({ onSearch }: { onSearch: (q: Record<string, string>) => void }) {
  const [destination, setDestination] = useState("Schengen Area");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [travelers, setTravelers] = useState("1");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSearch({ destination, start, end, travelers }); }}
      className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]"
    >
      <Field icon={MapPin} label="Destination">
        <TextInput value={destination} onChange={(e) => setDestination(e.target.value)} />
      </Field>
      <Field icon={Calendar} label="Start">
        <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </Field>
      <Field icon={Calendar} label="End">
        <TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </Field>
      <Field icon={Users} label="Travelers">
        <TextInput type="number" min={1} value={travelers} onChange={(e) => setTravelers(e.target.value)} />
      </Field>
      <SubmitBtn />
    </form>
  );
}

/* ----- Tours ----- */
function ToursForm({ onSearch }: { onSearch: (q: Record<string, string>) => void }) {
  const [destination, setDestination] = useState("Paris");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("2");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSearch({ destination, date, guests }); }}
      className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_0.8fr_auto]"
    >
      <Field icon={MapPin} label="Where">
        <TextInput value={destination} onChange={(e) => setDestination(e.target.value)} />
      </Field>
      <Field icon={Calendar} label="Date">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field icon={Users} label="Guests">
        <TextInput type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} />
      </Field>
      <SubmitBtn />
    </form>
  );
}

/* ----- Pickups ----- */
function PickupForm({ onSearch }: { onSearch: (q: Record<string, string>) => void }) {
  const [pickup, setPickup] = useState("Murtala Muhammed Airport (LOS)");
  const [drop, setDrop] = useState("Eko Hotel, Victoria Island");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSearch({ pickup, drop, date, time }); }}
      className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1.4fr_1fr_0.8fr_auto]"
    >
      <Field icon={MapPin} label="Pick-up">
        <TextInput value={pickup} onChange={(e) => setPickup(e.target.value)} />
      </Field>
      <Field icon={MapPin} label="Drop-off">
        <TextInput value={drop} onChange={(e) => setDrop(e.target.value)} />
      </Field>
      <Field icon={Calendar} label="Date">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field icon={Calendar} label="Time">
        <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <SubmitBtn />
    </form>
  );
}

/* ----- Consultations ----- */
function ConsultForm({ onSearch }: { onSearch: (q: Record<string, string>) => void }) {
  const [service, setService] = useState("Study Abroad");
  const [country, setCountry] = useState("Canada");
  const [date, setDate] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSearch({ service, country, date }); }}
      className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]"
    >
      <Field icon={GraduationCap} label="Service">
        <select
          value={service}
          onChange={(e) => setService(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold text-foreground focus:outline-none"
        >
          {["Study Abroad", "Immigration", "Work Abroad", "Business Registration"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field icon={MapPin} label="Destination country">
        <TextInput value={country} onChange={(e) => setCountry(e.target.value)} />
      </Field>
      <Field icon={Calendar} label="Preferred date">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <SubmitBtn />
    </form>
  );
}
