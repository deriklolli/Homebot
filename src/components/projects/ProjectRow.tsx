import Link from "next/link";
import type { Project, ProjectStatus } from "@/lib/projects-data";

const STATUS_BADGE: Record<ProjectStatus, string> = {
  "In Progress": "bg-accent-light text-accent",
  Completed: "bg-green-light text-green",
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${month}/${day}/${year.slice(2)}`;
}

export default function ProjectRow({
  project,
  contractorCompany,
}: {
  project: Project;
  contractorCompany: string | null;
}) {
  return (
    <li className="border-t border-border">
      <Link
        href={`/projects/${project.id}`}
        className="grid grid-cols-[1fr_90px_140px_110px] items-center gap-3 px-5 py-3 hover:bg-surface-hover transition-[background] duration-[120ms]"
      >
        {/* Project Name */}
        <span className="text-[13px] font-semibold text-text-primary truncate">
          {project.name}
        </span>

        {/* Date */}
        <span className="text-[12px] text-text-3">
          {formatDate(project.scheduledDate)}
        </span>

        {/* Contractor */}
        <span className="text-[12px] text-text-3 truncate">
          {contractorCompany || "Unassigned"}
        </span>

        {/* Status */}
        <span
          className={`inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-medium rounded-[var(--radius-full)] w-fit ${STATUS_BADGE[project.status]}`}
        >
          {project.status}
        </span>
      </Link>
    </li>
  );
}
