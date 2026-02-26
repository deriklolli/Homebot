"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { WrenchIcon, ChevronRightIcon } from "@/components/icons";

interface CurrentProject {
  id: string;
  name: string;
  contractorCompany: string | null;
}

export default function CurrentProjects() {
  const [projects, setProjects] = useState<CurrentProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, contractors(company)")
        .eq("status", "In Progress")
        .order("created_at", { ascending: false })
        .limit(5)
        .returns<
          {
            id: string;
            name: string;
            contractors: { company: string } | null;
          }[]
        >();

      if (!error && data) {
        setProjects(
          data.map((row) => ({
            id: row.id,
            name: row.name,
            contractorCompany: row.contractors?.company ?? null,
          }))
        );
      }
      setLoading(false);
    }
    fetchProjects();
  }, []);

  return (
    <div className="p-5">
      <header className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-[3px] min-w-0">
          <h2 className="text-[15px] font-semibold text-text-primary flex items-center gap-1.5">
            <WrenchIcon width={15} height={15} className="text-accent" />
            Current Projects
          </h2>
          {!loading && projects.length > 0 && (
            <p className="text-xs text-text-3">
              {projects.length} active
            </p>
          )}
        </div>
        <Link
          href="/projects"
          className="text-[11px] font-medium text-accent hover:underline shrink-0"
        >
          View All
        </Link>
      </header>

      {loading ? (
        <p className="text-[14px] text-text-3 py-4">Loading...</p>
      ) : projects.length === 0 ? (
        <p className="text-[14px] text-text-3 py-4">
          No active projects.
        </p>
      ) : (
        <ul
          className="flex flex-col -mx-5"
          role="list"
          aria-label="Current projects"
        >
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="grid grid-cols-[32px_1fr_auto] items-center gap-2 px-5 py-[9px] border-t border-border hover:bg-surface-hover transition-[background] duration-[120ms]"
              >
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <WrenchIcon width={16} height={16} className="text-accent" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[14px] font-medium text-text-primary truncate">
                    {p.name}
                  </span>
                  {p.contractorCompany && (
                    <span className="text-[11px] text-text-3 truncate">
                      {p.contractorCompany}
                    </span>
                  )}
                </div>
                <ChevronRightIcon className="text-text-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
