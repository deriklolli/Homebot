"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { type Project, type ProjectStatus, type ProjectInvoice, PROJECT_STATUSES } from "@/lib/projects-data";
import { type Contractor } from "@/lib/contractors-data";
import { type HomeAsset } from "@/lib/home-assets-data";
import { supabase, type DbProject, type DbContractor, type DbHomeAsset, type DbProjectInvoice } from "@/lib/supabase";
import { dbToProject, dbToContractor, dbToHomeAsset, projectToDb, contractorToDb, dbToProjectInvoice } from "@/lib/mappers";
import { PlusIcon, ChevronDownIcon } from "@/components/icons";
import ProjectCard from "./ProjectCard";
import ProjectSearchFilterBar from "./ProjectSearchFilterBar";
import AddProjectModal from "./AddProjectModal";
import CompleteProjectModal from "./CompleteProjectModal";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ── Sortable card wrapper ── */
function SortableProjectCard({
  project,
  contractorCompany,
  contractorLogoUrl,
}: {
  project: Project;
  contractorCompany: string | null;
  contractorLogoUrl?: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ProjectCard
        project={project}
        contractorCompany={contractorCompany}
        contractorLogoUrl={contractorLogoUrl}
      />
    </div>
  );
}

/* ── Kanban column ── */
function KanbanColumn({
  status,
  projectIds,
  projectMap,
  contractorMap,
  isOver,
}: {
  status: ProjectStatus;
  projectIds: string[];
  projectMap: Map<string, Project>;
  contractorMap: Map<string, Contractor>;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: `column-${status}` });

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-baseline gap-2 mb-3 shrink-0">
        <h2 className="text-[16px] font-semibold text-text-primary">{status}</h2>
        <span className="text-xs text-text-3">{projectIds.length}</span>
      </div>
      <SortableContext items={projectIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex flex-col gap-4 min-h-[120px] flex-1 overflow-y-auto custom-scroll rounded-[var(--radius-lg)] p-2 -m-2 transition-colors duration-200 ${
            isOver ? "bg-accent/[0.06] border-2 border-dashed border-accent/20" : "border-2 border-transparent"
          }`}
        >
          {projectIds.map((id) => {
            const p = projectMap.get(id);
            if (!p) return null;
            return (
              <SortableProjectCard
                key={id}
                project={p}
                contractorCompany={
                  p.contractorId
                    ? contractorMap.get(p.contractorId)?.company ?? null
                    : null
                }
                contractorLogoUrl={
                  p.contractorId
                    ? contractorMap.get(p.contractorId)?.logoUrl ?? null
                    : null
                }
              />
            );
          })}
        </div>
      </SortableContext>
    </div>
  );
}

/* ── Main component ── */
export default function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [homeAssets, setHomeAssets] = useState<HomeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [completingProject, setCompletingProject] = useState<Project | null>(null);
  const [completingInvoices, setCompletingInvoices] = useState<ProjectInvoice[]>([]);

  // Drag-and-drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragSourceColumn, setDragSourceColumn] = useState<ProjectStatus | null>(null);
  const [overColumn, setOverColumn] = useState<ProjectStatus | null>(null);
  const [columnItems, setColumnItems] = useState<Record<ProjectStatus, string[]>>({
    "Not Started": [],
    "In Progress": [],
    Completed: [],
  });

  useEffect(() => {
    async function fetchData() {
      const [projectsRes, contractorsRes, assetsRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, user_id, name, description, contractor_id, home_asset_id, notes, status, total_cost, contractor_rating, completed_at, created_at")
          .order("created_at", { ascending: false })
          .returns<DbProject[]>(),
        supabase
          .from("contractors")
          .select("id, user_id, name, company, phone, email, specialty, rating, notes, website, logo_url, created_at")
          .order("created_at", { ascending: false })
          .returns<DbContractor[]>(),
        supabase
          .from("home_assets")
          .select("id, user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url, created_at")
          .order("name", { ascending: true })
          .returns<DbHomeAsset[]>(),
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

      if (assetsRes.error) {
        console.error("Failed to fetch home assets:", assetsRes.error);
      } else {
        setHomeAssets(assetsRes.data.map(dbToHomeAsset));
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const contractorMap = useMemo(
    () => new Map(contractors.map((c) => [c.id, c])),
    [contractors]
  );

  // Available years (current year + any year with projects)
  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    for (const p of projects) {
      years.add(new Date(p.createdAt).getFullYear());
    }
    return [...years].sort((a, b) => b - a);
  }, [projects]);

  // Build column items from filtered projects
  const buildColumns = useCallback(() => {
    const cols: Record<ProjectStatus, string[]> = {
      "Not Started": [],
      "In Progress": [],
      Completed: [],
    };
    for (const p of projects) {
      const year = new Date(p.createdAt).getFullYear();
      if (year !== selectedYear) continue;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q)
        )
          continue;
      }
      cols[p.status].push(p.id);
    }
    return cols;
  }, [projects, selectedYear, searchQuery]);

  // Re-initialize columns when projects or filters change
  useEffect(() => {
    setColumnItems(buildColumns());
  }, [buildColumns]);

  // DnD sensors — 8px distance prevents accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function findColumnForId(id: string): ProjectStatus | null {
    for (const status of PROJECT_STATUSES) {
      if (id === `column-${status}`) return status;
    }
    for (const status of PROJECT_STATUSES) {
      if (columnItems[status].includes(id)) return status;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    setActiveId(id);
    setDragSourceColumn(findColumnForId(id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      setOverColumn(null);
      return;
    }

    const activeColumn = findColumnForId(active.id as string);
    const targetColumn = findColumnForId(over.id as string);
    setOverColumn(targetColumn);

    if (!activeColumn || !targetColumn || activeColumn === targetColumn) return;

    // Move item across columns
    setColumnItems((prev) => {
      const sourceItems = prev[activeColumn].filter((id) => id !== active.id);
      const destItems = [...prev[targetColumn]];
      const overIndex = destItems.indexOf(over.id as string);
      const insertAt = overIndex >= 0 ? overIndex : destItems.length;
      destItems.splice(insertAt, 0, active.id as string);

      return {
        ...prev,
        [activeColumn]: sourceItems,
        [targetColumn]: destItems,
      };
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverColumn(null);

    if (!over || !dragSourceColumn) {
      setDragSourceColumn(null);
      setColumnItems(buildColumns());
      return;
    }

    const currentColumn = findColumnForId(active.id as string);
    if (!currentColumn) {
      setDragSourceColumn(null);
      return;
    }

    // Reorder within same column
    const overTargetColumn = findColumnForId(over.id as string);
    if (currentColumn === overTargetColumn && active.id !== over.id) {
      const items = columnItems[currentColumn];
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setColumnItems((prev) => ({
          ...prev,
          [currentColumn]: arrayMove(prev[currentColumn], oldIndex, newIndex),
        }));
      }
    }

    // Status changed — persist to Supabase
    if (dragSourceColumn !== currentColumn) {
      const projectId = active.id as string;
      const newStatus = currentColumn;
      const project = projectMap.get(projectId);
      if (!project) {
        setDragSourceColumn(null);
        return;
      }

      // Show completion modal when dragging to Completed
      if (newStatus === "Completed" && project.status !== "Completed") {
        // Fetch invoices for pre-filling total cost
        supabase
          .from("project_invoices")
          .select("id, user_id, project_id, storage_path, file_name, file_type, amount, created_at")
          .eq("project_id", projectId)
          .returns<DbProjectInvoice[]>()
          .then(({ data }) => {
            setCompletingInvoices(data ? data.map(dbToProjectInvoice) : []);
          });
        setCompletingProject(project);
        setDragSourceColumn(null);
        return;
      }

      const oldStatus = project.status;
      const oldCompletedAt = project.completedAt;
      const completedAt = newStatus === "Completed" ? new Date().toISOString() : null;

      // Optimistic update
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, status: newStatus, completedAt } : p
        )
      );

      const { error } = await supabase
        .from("projects")
        .update({ status: newStatus, completed_at: completedAt })
        .eq("id", projectId);

      if (error) {
        console.error("Failed to update project status:", error);
        // Revert on failure
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, status: oldStatus, completedAt: oldCompletedAt }
              : p
          )
        );
      }
    }

    setDragSourceColumn(null);
  }

  function handleDragCancel() {
    setActiveId(null);
    setOverColumn(null);
    setDragSourceColumn(null);
    setColumnItems(buildColumns());
  }

  async function handleContractorAdded(
    data: Omit<Contractor, "id" | "createdAt">
  ): Promise<Contractor> {
    const { data: rows, error } = await supabase
      .from("contractors")
      .insert(contractorToDb(data) as Record<string, unknown>)
      .select()
      .returns<DbContractor[]>();

    if (error || !rows?.length) {
      throw new Error("Failed to add contractor");
    }
    const newContractor = dbToContractor(rows[0]);
    setContractors((prev) => [...prev, newContractor]);
    return newContractor;
  }

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

  const activeProject = activeId ? projectMap.get(activeId) : null;
  const totalFiltered = PROJECT_STATUSES.reduce(
    (sum, s) => sum + columnItems[s].length,
    0
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
            Projects
          </h1>
          <div className="relative inline-flex items-center">
            <select
              className="appearance-none bg-border border-none rounded-[var(--radius-sm)] py-[5px] pl-2.5 pr-[26px] text-xs font-medium text-text-primary cursor-pointer hover:bg-border-strong transition-[background] duration-[120ms]"
              aria-label="Filter by year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              className="absolute right-[7px] pointer-events-none text-text-3"
              width={13}
              height={13}
            />
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
        >
          <PlusIcon width={14} height={14} />
          Add Project
        </button>
      </header>

      {/* Search */}
      <div className="shrink-0">
        <ProjectSearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Kanban board — columns scroll independently */}
      <div className="mt-[25px] flex-1 min-h-0">
        {totalFiltered > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
              {PROJECT_STATUSES.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  projectIds={columnItems[status]}
                  projectMap={projectMap}
                  contractorMap={contractorMap}
                  isOver={overColumn === status && dragSourceColumn !== status}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeProject ? (
                <div style={{ cursor: "grabbing" }}>
                  <ProjectCard
                    project={activeProject}
                    contractorCompany={
                      activeProject.contractorId
                        ? contractorMap.get(activeProject.contractorId)?.company ?? null
                        : null
                    }
                    contractorLogoUrl={
                      activeProject.contractorId
                        ? contractorMap.get(activeProject.contractorId)?.logoUrl ?? null
                        : null
                    }
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
            <p className="text-[15px] font-semibold text-text-primary mb-1">
              No projects found
            </p>
            <p className="text-[14px] text-text-3">
              Try adjusting your search or filter, or add a new project.
            </p>
          </div>
        )}
      </div>

      {/* Add modal */}
      {modalOpen && (
        <AddProjectModal
          homeAssets={homeAssets}
          contractors={contractors}
          onSave={handleAdd}
          onContractorAdded={handleContractorAdded}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Complete modal */}
      {completingProject && (
        <CompleteProjectModal
          project={completingProject}
          contractorName={
            completingProject.contractorId
              ? contractors.find((c) => c.id === completingProject.contractorId)?.company ?? null
              : null
          }
          invoices={completingInvoices}
          onComplete={async ({ totalCost, contractorRating }) => {
            const projectId = completingProject.id;
            const completedAt = new Date().toISOString();

            setProjects((prev) =>
              prev.map((p) =>
                p.id === projectId
                  ? { ...p, status: "Completed" as ProjectStatus, completedAt, totalCost, contractorRating }
                  : p
              )
            );
            setCompletingProject(null);

            const { error } = await supabase
              .from("projects")
              .update({
                status: "Completed",
                completed_at: completedAt,
                total_cost: totalCost,
                contractor_rating: contractorRating || null,
              })
              .eq("id", projectId);

            if (error) {
              console.error("Failed to complete project:", error);
              setProjects((prev) =>
                prev.map((p) =>
                  p.id === projectId
                    ? { ...p, status: completingProject.status, completedAt: completingProject.completedAt, totalCost: completingProject.totalCost, contractorRating: completingProject.contractorRating }
                    : p
                )
              );
            }
          }}
          onClose={() => { setCompletingProject(null); setCompletingInvoices([]); }}
        />
      )}
    </div>
  );
}
