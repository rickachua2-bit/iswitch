import { useState } from "react";
import {
  MapPin, Calendar, Users, Search, Globe, FileCheck,
} from "lucide-react";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { TourDestinationAutocomplete } from "@/components/TourDestinationAutocomplete";
import { VisaCountryAutocomplete } from "@/components/VisaCountryAutocomplete";
import {
  GuestsRoomsPopover,
  guestsRoomsDisplay,
  parseGuestsRooms,
} from "@/components/GuestsRoomsPopover";

/* ---------- Field primitives ---------- */
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

type OnSearch = (q: Record<string, string>) => void;
type Init = Record<string, any> | undefined;

/* ---------- Stays ---------- */
export function StayInlineForm({ onSearch, initial }: { onSearch: OnSearch; initial?: Init }) {
  const [destination, setDestination] = useState(initial?.destination ?? "Dubai");
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? "");
  const [guestsRooms, setGuestsRooms] = useState(() => parseGuestsRooms(initial?.guests));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch({ destination, checkIn, checkOut, guests: guestsRoomsDisplay(guestsRooms) });
      }}
      className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr_1.1fr_auto]"
    >
      <CityAutocomplete
        label="Destination"
        value={destination}
        onChange={(display) => setDestination(display)}
        placeholder="City, hotel or area"
      />
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

/* ---------- Visas ---------- */
export function VisaInlineForm({ onSearch, initial }: { onSearch: OnSearch; initial?: Init }) {
  const [nationality, setNationality] = useState(initial?.nationality ?? "Nigeria");
  const [destination, setDestination] = useState(initial?.destination ?? "United Kingdom");
  const [visaType, setVisaType] = useState(initial?.visaType ?? "Tourist");

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSearch({ nationality, destination, visaType }); }}
      className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
    >
      <Field icon={Globe} label="Nationality">
        <VisaCountryAutocomplete value={nationality} onChange={setNationality} placeholder="e.g. Nigeria" />
      </Field>
      <Field icon={MapPin} label="Destination">
        <VisaCountryAutocomplete
          value={destination}
          onChange={setDestination}
          placeholder="Where are you going?"
        />
      </Field>
      <Field icon={FileCheck} label="Visa type">
        <select
          value={visaType}
          onChange={(e) => setVisaType(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold text-foreground focus:outline-none"
        >
          {["Tourist", "Business", "Student", "Work", "Transit"].map((v) => (<option key={v}>{v}</option>))}
        </select>
      </Field>
      <SubmitBtn />
    </form>
  );
}

/* ---------- Car Rentals ---------- */
export function CarRentalInlineForm({ onSearch, initial }: { onSearch: OnSearch; initial?: Init }) {
  const [pickup, setPickup] = useState(initial?.pickup_label ?? "Dubai International Airport");
  const [pickupId, setPickupId] = useState(initial?.pickup_location_id ?? "");
  const [pickupDate, setPickupDate] = useState(initial?.pickup_date_time ?? "");
  const [dropoffDate, setDropoffDate] = useState(initial?.dropoff_date_time ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch({
          pickup_label: pickup,
          pickup_location_id: pickupId,
          pickup_date_time: pickupDate,
          dropoff_date_time: dropoffDate,
        });
      }}
      className="grid grid-cols-1 gap-3 md:grid-cols-[1.6fr_1fr_1fr_auto]"
    >
      <Field icon={MapPin} label="Pick-up location">
        <TextInput value={pickup} onChange={(e) => { setPickup(e.target.value); setPickupId(e.target.value); }} placeholder="City or airport" />
      </Field>
      <Field icon={Calendar} label="Pick-up">
        <TextInput type="datetime-local" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
      </Field>
      <Field icon={Calendar} label="Drop-off">
        <TextInput type="datetime-local" value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} />
      </Field>
      <SubmitBtn />
    </form>
  );
}

/* ---------- Insurance (legacy, unused) ---------- */
export function InsuranceInlineForm({ onSearch, initial }: { onSearch: OnSearch; initial?: Init }) {
  const [destination, setDestination] = useState(initial?.destination ?? "Schengen Area");
  const [start, setStart] = useState(initial?.start ?? "");
  const [end, setEnd] = useState(initial?.end ?? "");
  const [travelers, setTravelers] = useState(initial?.travelers ?? "1");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSearch({ destination, start, end, travelers }); }}
      className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]"
    >
      <Field icon={MapPin} label="Destination"><TextInput value={destination} onChange={(e) => setDestination(e.target.value)} /></Field>
      <Field icon={Calendar} label="Start"><TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      <Field icon={Calendar} label="End"><TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      <Field icon={Users} label="Travelers"><TextInput type="number" min={1} value={travelers} onChange={(e) => setTravelers(e.target.value)} /></Field>
      <SubmitBtn />
    </form>
  );
}

/* ---------- Tours ---------- */
export function ToursInlineForm({ onSearch, initial }: { onSearch: OnSearch; initial?: Init }) {
  const [destination, setDestination] = useState(initial?.destination ?? "Paris");
  const [date, setDate] = useState(initial?.date ?? "");
  const [guests, setGuests] = useState(initial?.guests ?? "2");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSearch({ destination, date, guests }); }}
      className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_0.8fr_auto]"
    >
      <Field icon={MapPin} label="Where">
        <TourDestinationAutocomplete value={destination} onChange={(v) => setDestination(v)} />
      </Field>
      <Field icon={Calendar} label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field icon={Users} label="Guests"><TextInput type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} /></Field>
      <SubmitBtn />
    </form>
  );
}

/* ---------- Pickups ---------- */
export function PickupInlineForm({ onSearch, initial }: { onSearch: OnSearch; initial?: Init }) {
  const [pickup, setPickup] = useState(initial?.pickup ?? "Murtala Muhammed Airport (LOS)");
  const [drop, setDrop] = useState(initial?.drop ?? "Eko Hotel, Victoria Island");
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSearch({ pickup, drop, date, time }); }}
      className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1.4fr_1fr_0.8fr_auto]"
    >
      <Field icon={MapPin} label="Pick-up"><TextInput value={pickup} onChange={(e) => setPickup(e.target.value)} /></Field>
      <Field icon={MapPin} label="Drop-off"><TextInput value={drop} onChange={(e) => setDrop(e.target.value)} /></Field>
      <Field icon={Calendar} label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field icon={Calendar} label="Time"><TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      <SubmitBtn />
    </form>
  );
}
