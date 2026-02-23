import { SPECIALTIES, type Specialty } from "@/lib/contractors-data";
import { SearchIcon, ChevronDownIcon } from "@/components/icons";

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedSpecialty: Specialty | "All";
  onSpecialtyChange: (value: Specialty | "All") => void;
}

export default function SearchFilterBar({
  searchQuery,
  onSearchChange,
  selectedSpecialty,
  onSpecialtyChange,
}: SearchFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      {/* Search input */}
      <div className="relative max-w-full sm:max-w-[250px]">
        <SearchIcon
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4"
          width={15}
          height={15}
        />
        <input
          type="text"
          placeholder="Search by name or company..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
          aria-label="Search contractors"
        />
      </div>

      {/* Specialty filter */}
      <div className="relative inline-flex items-center">
        <select
          value={selectedSpecialty}
          onChange={(e) =>
            onSpecialtyChange(e.target.value as Specialty | "All")
          }
          className="appearance-none bg-surface border border-border rounded-[var(--radius-sm)] py-[7px] pl-3 pr-8 text-[13px] font-medium text-text-primary cursor-pointer hover:border-border-strong focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
          aria-label="Filter by specialty"
        >
          <option value="All">All Specialties</option>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="absolute right-2.5 pointer-events-none text-text-3" />
      </div>
    </div>
  );
}
