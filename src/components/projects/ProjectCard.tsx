"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project, ProjectStatus } from "@/lib/projects-data";
import { UserIcon } from "@/components/icons";

const STATUS_BADGE: Record<ProjectStatus, string> = {
  "In Progress": "bg-accent-light text-accent",
  Completed: "bg-green-light text-green",
};

export default function ProjectCard({
  project,
  contractorCompany,
  contractorLogoUrl,
}: {
  project: Project;
  contractorCompany: string | null;
  contractorLogoUrl?: string | null;
}) {
  const [logoError, setLogoError] = useState(false);

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
            {contractorCompany && (
              <div className="flex items-center gap-2">
                {contractorLogoUrl?.trim() && !logoError ? (
                  <img
                    src={contractorLogoUrl}
                    alt={contractorCompany}
                    className="w-5 h-5 rounded-full object-contain bg-white border border-border shrink-0"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
                    <UserIcon width={11} height={11} />
                  </div>
                )}
                <span className="text-[12px] text-text-2 truncate">{contractorCompany}</span>
              </div>
            )}
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
