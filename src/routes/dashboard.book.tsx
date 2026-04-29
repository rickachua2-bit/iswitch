import { createFileRoute } from "@tanstack/react-router";
import { SearchTabs } from "@/components/SearchTabs";

export const Route = createFileRoute("/dashboard/book")({
  head: () => ({ meta: [{ title: "Search & book — iSwitch dashboard" }] }),
  component: BookPage,
});

function BookPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Search & book</h1>
        <p className="mt-1 text-sm text-muted-foreground">Flights, hotels, visas, insurance, tours and transfers — all in one place.</p>
      </div>
      <SearchTabs />
    </div>
  );
}
