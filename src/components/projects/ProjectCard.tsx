import Link from "next/link";
import type { Project, ProjectStatus } from "@/lib/projects-data";

const STATUS_BADGE: Record<ProjectStatus, string> = {
  "In Progress": "bg-accent-light text-accent",
  Completed: "bg-green-light text-green",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProjectCard({
  project,
  contractorCompany,
}: {
  project: Project;
  contractorCompany: string | null;
}) {
  return (
    <Link href={`/projects/${project.id}`}>
      <article className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden hover:shadow-[var(--shadow-hover)] transition-shadow duration-200 h-full">
        <div className="p-5">
          {/* Name + status */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-[13px] font-semibold text-text-primary truncate">
              {project.name}
            </p>
            <span
              className={`shrink-0 inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-[var(--radius-full)] ${STATUS_BADGE[project.status]}`}
            >
              {project.status}
            </span>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-[13px] text-text-3 line-clamp-2 leading-relaxed mb-3">
              {project.description}
            </p>
          )}

          {/* Details */}
          <div className="flex flex-col gap-1.5 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-4 uppercase tracking-wide">
                Scheduled
              </span>
              <span className="text-[12px] text-text-2">
                {formatDate(project.scheduledDate)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-4 uppercase tracking-wide">
                Contractor
              </span>
              <span className="text-[12px] text-text-2 truncate ml-4">
                {contractorCompany || "Unassigned"}
              </span>
            </div>
            {project.totalCost !== null && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-text-4 uppercase tracking-wide">
                  Cost
                </span>
                <span className="text-[12px] text-text-2">
                  ${project.totalCost.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
