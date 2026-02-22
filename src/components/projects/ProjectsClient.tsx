"use client";

import { useState, useEffect } from "react";
import { type Project, type ProjectStatus } from "@/lib/projects-data";
import { type Contractor } from "@/lib/contractors-data";
import { supabase, type DbProject, type DbContractor } from "@/lib/supabase";
import { dbToProject, dbToContractor, projectToDb } from "@/lib/mappers";
import { PlusIcon } from "@/components/icons";
import ProjectCard from "./ProjectCard";
import ProjectSearchFilterBar from "./ProjectSearchFilterBar";
import AddProjectModal from "./AddProjectModal";

export default function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    ProjectStatus | "All"
  >("All");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [projectsRes, contractorsRes] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false })
          .returns<DbProject[]>(),
        supabase
          .from("contractors")
          .select("*")
          .order("created_at", { ascending: false })
          .returns<DbContractor[]>(),
      ]);

      if (projectsRes.error) {
        console.error("Failed to fetch projects:", projectsRes.error);
      } else {
        setProjects(projectsRes.data.map(dbToProject));
      }

      if (contractorsRes.error) {
        console.error("Failed to fetch contractors:", contractorsRes.error);
      } else {
        setContractors(contractorsRes.data.map(dbToContractor));
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  const contractorMap = new Map(contractors.map((c) => [c.id, c]));

  const filtered = projects.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query);
    const matchesStatus =
      selectedStatus === "All" || p.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  async function handleAdd(
    data: Omit<
      Project,
      "id" | "createdAt" | "totalCost" | "contractorRating" | "completedAt"
    >
  ) {
    const { data: rows, error } = await supabase
      .from("projects")
      .insert({
        ...projectToDb(data),
        total_cost: null,
        contractor_rating: null,
        completed_at: null,
      } as Record<string, unknown>)
      .select()
      .returns<DbProject[]>();

    if (error) {
      console.error("Failed to add project:", error);
      return;
    }
    setProjects([dbToProject(rows[0]), ...projects]);
    setModalOpen(false);
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
        <p className="text-sm text-text-3">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Projects
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms]"
        >
          <PlusIcon width={14} height={14} />
          Add Project
        </button>
      </header>

      {/* Search + filter */}
      <ProjectSearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {/* Results count */}
      <p className="text-xs text-text-3 mb-3">
        {filtered.length} project{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Project cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              contractorCompany={
                p.contractorId
                  ? contractorMap.get(p.contractorId)?.company ?? null
                  : null
              }
            />
          ))}
        </div>
      ) : (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-sm font-semibold text-text-primary mb-1">
            No projects found
          </p>
          <p className="text-[13px] text-text-3">
            Try adjusting your search or filter, or add a new project.
          </p>
        </div>
      )}

      {/* Add modal */}
      {modalOpen && (
        <AddProjectModal
          contractors={contractors}
          onSave={handleAdd}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
