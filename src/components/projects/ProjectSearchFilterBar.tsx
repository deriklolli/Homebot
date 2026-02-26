import { type ProjectStatus } from "@/lib/projects-data";
import { SearchIcon } from "@/components/icons";

interface ProjectSearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedStatus: ProjectStatus | "All";
  onStatusChange: (value: ProjectStatus | "All") => void;
}

export default function ProjectSearchFilterBar({
  searchQuery,
  onSearchChange,
}: ProjectSearchFilterBarProps) {
  return (
    <div className="mb-4">
      <div className="relative max-w-full sm:max-w-[350px]">
        <SearchIcon
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4"
          width={15}
          height={15}
        />
        <input
          type="text"
          placeholder="Search Projects"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent transition-all duration-[120ms]"
          aria-label="Search projects"
        />
      </div>
    </div>
  );
}
