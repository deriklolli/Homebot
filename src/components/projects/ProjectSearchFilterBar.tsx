import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/projects-data";
import { SearchIcon, ChevronDownIcon } from "@/components/icons";

interface ProjectSearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedStatus: ProjectStatus | "All";
  onStatusChange: (value: ProjectStatus | "All") => void;
}

export default function ProjectSearchFilterBar({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
}: ProjectSearchFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      {/* Search input */}
      <div className="relative flex-1">
        <SearchIcon
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4"
          width={15}
          height={15}
        />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
          aria-label="Search projects"
        />
      </div>

      {/* Status filter */}
      <div className="relative inline-flex items-center">
        <select
          value={selectedStatus}
          onChange={(e) =>
            onStatusChange(e.target.value as ProjectStatus | "All")
          }
          className="appearance-none bg-surface border border-border rounded-[var(--radius-sm)] py-[7px] pl-3 pr-8 text-[13px] font-medium text-text-primary cursor-pointer hover:border-border-strong focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
          aria-label="Filter by status"
        >
          <option value="All">All Statuses</option>
          {PROJECT_STATUSES.map((s) => (
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
