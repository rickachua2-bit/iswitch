import { useState } from "react";
import { BedDouble, Users, ShieldCheck, Coffee, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import type { BookingNormalizedRoom } from "@/server/booking.server";
import { usePriceFormat } from "@/lib/use-price-format";

type Props = {
  rooms: BookingNormalizedRoom[];
  selectedId: string | null;
  onSelect: (room: BookingNormalizedRoom) => void;
  loading?: boolean;
  fallbackCurrency?: string;
};

export function RoomList({ rooms, selectedId, onSelect, loading, fallbackCurrency = "USD" }: Props) {
  const formatPrice = usePriceFormat();

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-secondary/60" />
        ))}
      </div>
    );
  }

  if (!rooms.length) {
    return (
      <p className="text-sm text-muted-foreground">No alternative rooms returned for these dates.</p>
    );
  }

  return (
    <div className="space-y-3">
      {rooms.map((room) => {
        const selected = selectedId === room.id;
        return (
          <div
            key={room.id}
            className={`grid grid-cols-1 gap-3 rounded-xl border p-3 transition md:grid-cols-[200px_1fr_auto] ${
              selected ? "border-primary bg-primary/5 shadow-card" : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <RoomPhotos photos={room.photos} name={room.name} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="truncate text-base font-extrabold text-foreground">{room.name}</h4>
                {selected && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Selected
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {room.bed_configuration && (
                  <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {room.bed_configuration}</span>
                )}
                {room.max_occupancy != null && (
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Sleeps {room.max_occupancy}</span>
                )}
                {room.board && (
                  <span className="flex items-center gap-1"><Coffee className="h-3 w-3" /> {room.board}</span>
                )}
                {room.refundable && (
                  <span className="flex items-center gap-1 text-primary">
                    <ShieldCheck className="h-3 w-3" /> Free cancellation
                  </span>
                )}
              </div>
              {room.highlights.length > 0 && (
                <ul className="mt-2 grid grid-cols-1 gap-1 text-xs text-foreground sm:grid-cols-2">
                  {room.highlights.slice(0, 4).map((h) => (
                    <li key={h} className="flex items-start gap-1">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 flex-none text-emerald-600" />
                      <span className="truncate">{h}</span>
                    </li>
                  ))}
                </ul>
              )}
              {room.cancellation_until && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Free cancellation until {new Date(room.cancellation_until).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end justify-between gap-2 md:items-end">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">From</div>
                <div className="text-lg font-extrabold text-primary">
                  {room.price != null ? formatPrice(room.price, room.currency || fallbackCurrency) : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">per night</div>
              </div>
              <button
                type="button"
                onClick={() => onSelect(room)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  selected
                    ? "bg-primary/10 text-primary"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
                disabled={selected}
              >
                {selected ? "Selected" : "Select room"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoomPhotos({ photos, name }: { photos: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  if (!photos.length) {
    return <div className="aspect-[4/3] w-full rounded-lg bg-secondary md:h-32" />;
  }
  const total = photos.length;
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-secondary md:h-32">
      <img src={photos[idx]} alt={name} className="h-full w-full object-cover" />
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + total) % total); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % total); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white"
            aria-label="Next photo"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
          <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {idx + 1}/{total}
          </div>
        </>
      )}
    </div>
  );
}
