import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, Hotel as HotelIcon } from "lucide-react";

type Props = {
  images: string[];
  hotelName: string;
};

export function HotelGallery({ images, hotelName }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const total = images.length;
  const cover = images[0];
  const tiles = images.slice(1, 5);

  const openAt = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(total - 1, i)));
    setOpen(true);
  }, [total]);

  const next = useCallback(() => setIndex((i) => (i + 1) % Math.max(1, total)), [total]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + Math.max(1, total)) % Math.max(1, total)), [total]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev]);

  if (!total) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl bg-gradient-primary">
        <HotelIcon className="h-14 w-14 text-primary-foreground/70" />
      </div>
    );
  }

  return (
    <>
      {/* Desktop / tablet collage */}
      <div className="relative hidden overflow-hidden rounded-2xl border border-border bg-card shadow-card md:block">
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => openAt(0)}
            className="col-span-2 row-span-2 aspect-[4/3] overflow-hidden bg-secondary"
          >
            <img src={cover} alt={hotelName} className="h-full w-full object-cover transition hover:scale-[1.02]" />
          </button>
          {tiles.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => openAt(i + 1)}
              className="aspect-[4/3] overflow-hidden bg-secondary"
            >
              <img src={src} alt={`${hotelName} ${i + 2}`} className="h-full w-full object-cover transition hover:scale-[1.02]" />
            </button>
          ))}
          {Array.from({ length: Math.max(0, 4 - tiles.length) }).map((_, i) => (
            <div key={`ph-${i}`} className="aspect-[4/3] bg-secondary" />
          ))}
        </div>
        {total > 1 && (
          <button
            type="button"
            onClick={() => openAt(0)}
            className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-background/95 px-3 py-1.5 text-xs font-bold text-foreground shadow-card backdrop-blur hover:bg-background"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Show all {total} photos
          </button>
        )}
      </div>

      {/* Mobile: horizontal strip */}
      <div className="md:hidden">
        <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => openAt(i)}
              className="snap-center shrink-0 overflow-hidden rounded-xl bg-secondary"
              style={{ width: "85%" }}
            >
              <img src={src} alt={`${hotelName} ${i + 1}`} className="aspect-[16/10] h-auto w-full object-cover" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => openAt(0)}
          className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Show all {total} photos
        </button>
      </div>

      {/* Lightbox */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl border-0 bg-black/95 p-0 sm:rounded-xl">
          <div className="relative flex h-[80vh] w-full items-center justify-center">
            <button
              type="button"
              aria-label="Close gallery"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            >
              <X className="h-5 w-5" />
            </button>
            {total > 1 && (
              <button
                type="button"
                aria-label="Previous photo"
                onClick={prev}
                className="absolute left-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            <img
              src={images[index]}
              alt={`${hotelName} ${index + 1}`}
              className="max-h-full max-w-full object-contain"
            />
            {total > 1 && (
              <button
                type="button"
                aria-label="Next photo"
                onClick={next}
                className="absolute right-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
              {index + 1} / {total}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
