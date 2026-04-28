import { useEffect, useRef, useState } from "react";
import { Users, Minus, Plus, BedDouble, Trash2 } from "lucide-react";

export interface RoomOccupancy {
  adults: number;
  childrenAges: number[]; // length = number of children, value = age
}

export interface GuestsRoomsValue {
  rooms: RoomOccupancy[];
}

export const DEFAULT_GUESTS_ROOMS: GuestsRoomsValue = {
  rooms: [{ adults: 2, childrenAges: [] }],
};

export function guestsRoomsDisplay(v: GuestsRoomsValue) {
  const adults = v.rooms.reduce((a, r) => a + r.adults, 0);
  const children = v.rooms.reduce((a, r) => a + r.childrenAges.length, 0);
  const rooms = v.rooms.length;
  const guests = adults + children;
  const parts = [
    `${guests} ${guests === 1 ? "Guest" : "Guests"}`,
    `${rooms} ${rooms === 1 ? "Room" : "Rooms"}`,
  ];
  return parts.join(", ");
}

/** Parse legacy "X Guests, Y Room(s)" strings into a GuestsRoomsValue. */
export function parseGuestsRooms(input: string | GuestsRoomsValue | undefined): GuestsRoomsValue {
  if (!input) return DEFAULT_GUESTS_ROOMS;
  if (typeof input !== "string") return input;
  const guests = Number(input.match(/(\d+)\s*Guest/i)?.[1] ?? 2);
  const rooms = Number(input.match(/(\d+)\s*Room/i)?.[1] ?? 1);
  const safeRooms = Math.max(1, rooms);
  const perRoom = Math.max(1, Math.floor(guests / safeRooms));
  const remainder = Math.max(0, guests - perRoom * safeRooms);
  return {
    rooms: Array.from({ length: safeRooms }, (_, i) => ({
      adults: perRoom + (i === 0 ? remainder : 0),
      childrenAges: [],
    })),
  };
}

interface Props {
  value: GuestsRoomsValue;
  onChange: (v: GuestsRoomsValue) => void;
  label?: string;
}

const MAX_ROOMS = 8;
const MAX_ADULTS_PER_ROOM = 6;
const MAX_CHILDREN_PER_ROOM = 4;

export function GuestsRoomsPopover({ value, onChange, label = "Guests / Rooms" }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<GuestsRoomsValue>(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function updateRoom(idx: number, patch: Partial<RoomOccupancy>) {
    setDraft((d) => ({
      rooms: d.rooms.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));
  }

  function addRoom() {
    setDraft((d) =>
      d.rooms.length >= MAX_ROOMS ? d : { rooms: [...d.rooms, { adults: 2, childrenAges: [] }] },
    );
  }

  function removeRoom(idx: number) {
    setDraft((d) =>
      d.rooms.length <= 1 ? d : { rooms: d.rooms.filter((_, i) => i !== idx) },
    );
  }

  function stepAdults(idx: number, delta: number) {
    const r = draft.rooms[idx];
    const next = Math.min(MAX_ADULTS_PER_ROOM, Math.max(1, r.adults + delta));
    updateRoom(idx, { adults: next });
  }

  function stepChildren(idx: number, delta: number) {
    const r = draft.rooms[idx];
    const targetCount = Math.min(MAX_CHILDREN_PER_ROOM, Math.max(0, r.childrenAges.length + delta));
    let ages = r.childrenAges.slice(0, targetCount);
    while (ages.length < targetCount) ages.push(8);
    updateRoom(idx, { childrenAges: ages });
  }

  function setChildAge(roomIdx: number, childIdx: number, age: number) {
    const r = draft.rooms[roomIdx];
    const ages = r.childrenAges.slice();
    ages[childIdx] = age;
    updateRoom(roomIdx, { childrenAges: ages });
  }

  function apply() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full flex-col gap-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-left transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Users className="h-3 w-3" /> {label}
        </div>
        <div className="truncate text-sm font-semibold text-foreground">
          {guestsRoomsDisplay(value)}
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 w-[360px] max-w-[94vw] rounded-xl border border-border bg-card p-4 shadow-elevated">
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {draft.rooms.map((room, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-background p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <BedDouble className="h-3.5 w-3.5" /> Room {idx + 1}
                  </div>
                  {draft.rooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRoom(idx)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  )}
                </div>

                <Row
                  title="Adults"
                  hint="18+ years"
                  value={room.adults}
                  min={1}
                  max={MAX_ADULTS_PER_ROOM}
                  onMinus={() => stepAdults(idx, -1)}
                  onPlus={() => stepAdults(idx, +1)}
                />
                <Row
                  title="Children"
                  hint="0-17 years"
                  value={room.childrenAges.length}
                  min={0}
                  max={MAX_CHILDREN_PER_ROOM}
                  onMinus={() => stepChildren(idx, -1)}
                  onPlus={() => stepChildren(idx, +1)}
                />

                {room.childrenAges.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {room.childrenAges.map((age, ci) => (
                      <label key={ci} className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Child {ci + 1} age
                        </span>
                        <select
                          value={age}
                          onChange={(e) => setChildAge(idx, ci, Number(e.target.value))}
                          className="rounded-md border border-input bg-background px-2 py-1.5 text-xs font-semibold focus:border-primary focus:outline-none"
                        >
                          {Array.from({ length: 18 }, (_, i) => i).map((a) => (
                            <option key={a} value={a}>
                              {a === 0 ? "<1" : a} {a === 1 ? "year" : "years"}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRoom}
            disabled={draft.rooms.length >= MAX_ROOMS}
            className="mt-3 w-full rounded-lg border border-dashed border-primary/40 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Add another room
          </button>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <div className="text-xs text-muted-foreground">{guestsRoomsDisplay(draft)}</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setDraft(value); setOpen(false); }}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={apply}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  title, hint, value, min, max, onMinus, onPlus,
}: {
  title: string; hint: string; value: number; min: number; max: number;
  onMinus: () => void; onPlus: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <div className="text-sm font-bold text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMinus}
          disabled={value <= min}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Decrease ${title}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-5 text-center text-sm font-bold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={onPlus}
          disabled={value >= max}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Increase ${title}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
