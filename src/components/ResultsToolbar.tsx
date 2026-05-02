import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";

/**
 * Compact toolbar for search-results pages.
 * Renders two pills ("Search", "Filter") and shows a count/summary.
 * The parent owns the open/close state for the search bar and filters panel.
 */
export function ResultsToolbar({
  searchOpen,
  filterOpen,
  onToggleSearch,
  onToggleFilter,
  showFilterButton = true,
  summary,
}: {
  searchOpen: boolean;
  filterOpen: boolean;
  onToggleSearch: () => void;
  onToggleFilter?: () => void;
  showFilterButton?: boolean;
  summary?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-4 pt-4 md:px-6">
      <button
        type="button"
        onClick={onToggleSearch}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition ${
          searchOpen
            ? "border-primary bg-primary text-primary-foreground shadow-card"
            : "border-border bg-card text-foreground hover:border-primary hover:text-primary"
        }`}
      >
        {searchOpen ? <X className="h-3.5 w-3.5" /> : <SearchIcon className="h-3.5 w-3.5" />}
        {searchOpen ? "Close search" : "Search"}
      </button>
      {showFilterButton && (
        <button
          type="button"
          onClick={onToggleFilter}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition ${
            filterOpen
              ? "border-primary bg-primary text-primary-foreground shadow-card"
              : "border-border bg-card text-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {filterOpen ? <X className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
          {filterOpen ? "Hide filters" : "Filter"}
        </button>
      )}
      {summary && (
        <div className="ml-auto text-xs text-muted-foreground md:text-sm">{summary}</div>
      )}
    </div>
  );
}
