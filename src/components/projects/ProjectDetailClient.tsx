"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDateLong, formatDateTime, formatTime } from "@/lib/date-utils";
import {
  PROJECT_STATUSES,
  type Project,
  type ProjectStatus,
  type ProjectEvent,
  type ProjectNote,
  type ProjectImage,
  type ProjectInvoice,
} from "@/lib/projects-data";
import { type Contractor } from "@/lib/contractors-data";
import { type HomeAsset } from "@/lib/home-assets-data";
import {
  supabase,
  type DbProject,
  type DbContractor,
  type DbProjectEvent,
  type DbProjectNote,
  type DbProjectImage,
  type DbProjectInvoice,
  type DbHomeAsset,
} from "@/lib/supabase";
import {
  dbToProject,
  dbToContractor,
  dbToHomeAsset,
  contractorToDb,
  projectToDb,
  dbToProjectEvent,
  dbToProjectNote,
  dbToProjectImage,
  dbToProjectInvoice,
} from "@/lib/mappers";

type TimelineItem =
  | { type: "event"; data: ProjectEvent; createdAt: string }
  | { type: "note"; data: ProjectNote; createdAt: string };
import {
  ChevronLeftIcon,
  PencilIcon,
  TrashIcon,
  DollarIcon,
  StarFilledIcon,
  PlusIcon,
  ChevronDownIcon,
  XIcon,
  ThumbsUpSolidIcon,
  CalendarSolidIcon,
  NoteSolidIcon,
  BuildingIcon,
  UserIcon,
} from "@/components/icons";
import AddProjectModal from "./AddProjectModal";
import CompleteProjectModal from "./CompleteProjectModal";
import AddEventModal from "./AddEventModal";
import ProjectImageGallery, { type ProjectImageGalleryHandle } from "./ProjectImageGallery";
import ProjectInvoiceSection, { type ProjectInvoiceSectionHandle } from "./ProjectInvoiceSection";

const STATUS_BADGE: Record<ProjectStatus, string> = {
  "In Progress": "bg-accent-light text-accent",
  Completed: "bg-green-light text-green",
};

const formatDate = formatDateLong;


export default function ProjectDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [homeAssets, setHomeAssets] = useState<HomeAsset[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [addEventModalOpen, setAddEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProjectEvent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [logoError, setLogoError] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<ProjectImageGalleryHandle>(null);
  const invoiceSectionRef = useRef<ProjectInvoiceSectionHandle>(null);

  useEffect(() => {
    async function fetchData() {
      const [projectRes, contractorsRes, eventsRes, notesRes, imagesRes, assetsRes, invoicesRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, user_id, name, description, contractor_id, home_asset_id, notes, status, total_cost, contractor_rating, completed_at, created_at")
          .eq("id", id)
          .returns<DbProject[]>()
          .single(),
        supabase
          .from("contractors")
          .select("id, user_id, name, company, phone, email, specialty, rating, notes, website, logo_url, created_at")
          .order("created_at", { ascending: false })
          .returns<DbContractor[]>(),
        supabase
          .from("project_events")
          .select("id, user_id, project_id, title, event_date, event_time, event_end_time, created_at")
          .eq("project_id", id)
          .order("created_at", { ascending: true })
          .returns<DbProjectEvent[]>(),
        supabase
          .from("project_notes")
          .select("id, user_id, project_id, content, created_at")
          .eq("project_id", id)
          .order("created_at", { ascending: true })
          .returns<DbProjectNote[]>(),
        supabase
          .from("project_images")
          .select("id, user_id, project_id, storage_path, caption, created_at")
          .eq("project_id", id)
          .order("created_at", { ascending: true })
          .returns<DbProjectImage[]>(),
        supabase
          .from("home_assets")
          .select("id, user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url, created_at")
          .order("name", { ascending: true })
          .returns<DbHomeAsset[]>(),
        supabase
          .from("project_invoices")
          .select("id, user_id, project_id, storage_path, file_name, file_type, amount, created_at")
          .eq("project_id", id)
          .order("created_at", { ascending: true })
          .returns<DbProjectInvoice[]>(),
      ]);

      if (projectRes.error || !projectRes.data) {
        setNotFound(true);
      } else {
        setProject(dbToProject(projectRes.data));
      }

      if (contractorsRes.data) {
        setContractors(contractorsRes.data.map(dbToContractor));
      }

      if (eventsRes.data) {
        setEvents(eventsRes.data.map(dbToProjectEvent));
      }

      if (notesRes.data) {
        setNotes(notesRes.data.map(dbToProjectNote));
      }

      if (imagesRes.data) {
        setImages(imagesRes.data.map(dbToProjectImage));
      }

      if (assetsRes.data) {
        setHomeAssets(assetsRes.data.map(dbToHomeAsset));
      }

      if (invoicesRes.data) {
        setInvoices(invoicesRes.data.map(dbToProjectInvoice));
      }

      setLoading(false);
    }
    fetchData();
  }, [id]);

  const contractorMap = new Map(contractors.map((c) => [c.id, c]));
  const contractor = project?.contractorId
    ? contractorMap.get(project.contractorId) ?? null
    : null;

  // Build unified timeline sorted by created_at
  const timeline: TimelineItem[] = [
    ...events.map((e) => ({ type: "event" as const, data: e, createdAt: e.createdAt })),
    ...notes.map((n) => ({ type: "note" as const, data: n, createdAt: n.createdAt })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Close status popover on outside click
  useEffect(() => {
    if (!statusPopoverOpen) return;
    function handleClick(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [statusPopoverOpen]);

  // Close add menu on outside click
  useEffect(() => {
    if (!addMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [addMenuOpen]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
        <p className="text-sm text-text-3">Loading project...</p>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] mb-6"
        >
          <ChevronLeftIcon width={14} height={14} />
          Back to Projects
        </Link>
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-[15px] font-semibold text-text-primary mb-1">
            Project not found
          </p>
          <p className="text-[14px] text-text-3">
            This project may have been removed.
          </p>
        </div>
      </div>
    );
  }

  async function handleEdit(
    data: Omit<
      Project,
      "id" | "createdAt" | "totalCost" | "contractorRating" | "completedAt"
    >
  ) {
    const { data: rows, error } = await supabase
      .from("projects")
      .update(projectToDb(data) as Record<string, unknown>)
      .eq("id", project!.id)
      .select()
      .returns<DbProject[]>();

    if (error) {
      console.error("Failed to update project:", error);
      return;
    }
    setProject(dbToProject(rows[0]));
    setEditModalOpen(false);
  }

  async function handleStatusChange(status: ProjectStatus) {
    setStatusPopoverOpen(false);
    if (status === "Completed") {
      setCompleteModalOpen(true);
      return;
    }
    const { data: rows, error } = await supabase
      .from("projects")
      .update({
        status,
        total_cost: null,
        contractor_rating: null,
        completed_at: null,
      } as Record<string, unknown>)
      .eq("id", project!.id)
      .select()
      .returns<DbProject[]>();

    if (error) {
      console.error("Failed to update status:", error);
      return;
    }
    setProject(dbToProject(rows[0]));
  }

  async function handleComplete(data: {
    totalCost: number;
    contractorRating: number;
  }) {
    const { data: rows, error } = await supabase
      .from("projects")
      .update({
        status: "Completed",
        total_cost: data.totalCost,
        contractor_rating: data.contractorRating || null,
        completed_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", project!.id)
      .select()
      .returns<DbProject[]>();

    if (error) {
      console.error("Failed to complete project:", error);
      return;
    }
    setProject(dbToProject(rows[0]));
    setCompleteModalOpen(false);
  }

  async function handleAddNote() {
    const trimmed = newNote.trim();
    if (!trimmed || !project) return;

    const { data: rows, error } = await supabase
      .from("project_notes")
      .insert({
        project_id: project.id,
        content: trimmed,
      } as Record<string, unknown>)
      .select()
      .returns<DbProjectNote[]>();

    if (error) {
      console.error("Failed to add note:", error);
      return;
    }
    setNotes([...notes, dbToProjectNote(rows[0])]);
    setNewNote("");
    setAddNoteModalOpen(false);
  }

  async function handleDeleteNote(noteId: string) {
    const { error } = await supabase
      .from("project_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      console.error("Failed to delete note:", error);
      return;
    }
    setNotes(notes.filter((n) => n.id !== noteId));
  }

  async function handleAddEvent(data: {
    title: string;
    eventDate: string;
    eventTime: string | null;
    eventEndTime: string | null;
    contractorId: string | null;
  }) {
    const { data: rows, error } = await supabase
      .from("project_events")
      .insert({
        project_id: project!.id,
        title: data.title,
        event_date: data.eventDate,
        event_time: data.eventTime,
        event_end_time: data.eventEndTime,
      } as Record<string, unknown>)
      .select()
      .returns<DbProjectEvent[]>();

    if (error) {
      console.error("Failed to add event:", error);
      return;
    }

    // Update contractor on the project if changed
    if (data.contractorId !== project!.contractorId) {
      const { data: projRows, error: projError } = await supabase
        .from("projects")
        .update({ contractor_id: data.contractorId } as Record<string, unknown>)
        .eq("id", project!.id)
        .select()
        .returns<DbProject[]>();

      if (!projError && projRows?.[0]) {
        setProject(dbToProject(projRows[0]));
      }
    }

    const newEvent = dbToProjectEvent(rows[0]);
    setEvents(
      [...events, newEvent].sort((a, b) =>
        a.eventDate.localeCompare(b.eventDate)
      )
    );
    setAddEventModalOpen(false);
  }

  async function handleUpdateEvent(data: {
    title: string;
    eventDate: string;
    eventTime: string | null;
    eventEndTime: string | null;
    contractorId: string | null;
  }) {
    if (!editingEvent) return;

    const { data: rows, error } = await supabase
      .from("project_events")
      .update({
        title: data.title,
        event_date: data.eventDate,
        event_time: data.eventTime,
        event_end_time: data.eventEndTime,
      } as Record<string, unknown>)
      .eq("id", editingEvent.id)
      .select()
      .returns<DbProjectEvent[]>();

    if (error) {
      console.error("Failed to update event:", error);
      return;
    }

    // Update contractor on the project if changed
    if (data.contractorId !== project!.contractorId) {
      const { data: projRows, error: projError } = await supabase
        .from("projects")
        .update({ contractor_id: data.contractorId } as Record<string, unknown>)
        .eq("id", project!.id)
        .select()
        .returns<DbProject[]>();

      if (!projError && projRows?.[0]) {
        setProject(dbToProject(projRows[0]));
      }
    }

    const updatedEvent = dbToProjectEvent(rows[0]);
    setEvents(
      events.map((e) => (e.id === editingEvent.id ? updatedEvent : e))
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    );
    setEditingEvent(null);
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

  async function handleDeleteEvent(eventId: string) {
    const { error } = await supabase
      .from("project_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      console.error("Failed to delete event:", error);
      return;
    }
    setEvents(events.filter((e) => e.id !== eventId));
  }

  async function handleDelete() {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", project!.id);

    if (error) {
      console.error("Failed to delete project:", error);
      return;
    }
    router.push("/projects");
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] mb-6"
      >
        <ChevronLeftIcon width={14} height={14} />
        Back to Projects
      </Link>

      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-tight text-text-primary truncate">
              {project.name}
            </h1>

            {/* Clickable status badge */}
            <div className="relative shrink-0" ref={statusRef}>
              <button
                onClick={() => setStatusPopoverOpen(!statusPopoverOpen)}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium rounded-[var(--radius-full)] cursor-pointer hover:brightness-90 transition-all duration-[120ms] ${STATUS_BADGE[project.status]}`}
              >
                {project.status}
                <ChevronDownIcon width={10} height={10} />
              </button>

              {statusPopoverOpen && (
                <div className="absolute top-full left-0 mt-1.5 bg-surface rounded-[var(--radius-sm)] border border-border shadow-[var(--shadow-hover)] py-1 min-w-[140px] z-20">
                  {PROJECT_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`w-full text-left px-3 py-1.5 text-[14px] transition-colors duration-[120ms] ${
                        s === project.status
                          ? "font-semibold text-text-primary bg-border/50"
                          : "text-text-2 hover:bg-border hover:text-text-primary"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative" ref={addMenuRef}>
            <button
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
            >
              <PlusIcon width={13} height={13} />
              Add Event
            </button>

            {addMenuOpen && (
              <div className="absolute top-full right-0 mt-1.5 bg-surface rounded-[var(--radius-sm)] border border-border shadow-[var(--shadow-hover)] py-1 min-w-[170px] z-20">
                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    setAddEventModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[14px] text-text-2 hover:bg-border hover:text-text-primary transition-colors duration-[120ms]"
                >
                  Schedule Appointment
                </button>
                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    setAddNoteModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[14px] text-text-2 hover:bg-border hover:text-text-primary transition-colors duration-[120ms]"
                >
                  Add Note
                </button>
                <button
                  onClick={() => {
                    galleryRef.current?.triggerUpload();
                    setAddMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[14px] text-text-2 hover:bg-border hover:text-text-primary transition-colors duration-[120ms]"
                >
                  Add Photos
                </button>
                <button
                  onClick={() => {
                    invoiceSectionRef.current?.triggerUpload();
                    setAddMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[14px] text-text-2 hover:bg-border hover:text-text-primary transition-colors duration-[120ms]"
                >
                  Add Invoice
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            <PencilIcon width={13} height={13} />
            Edit
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            <TrashIcon width={13} height={13} />
            Delete
          </button>
        </div>
      </header>

      {/* Description card */}
      {project.description && (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-6 mb-5">
          <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-2">
            Project Description
          </span>
          <p className="text-[14px] text-text-primary leading-relaxed">
            {project.description}
          </p>
        </div>
      )}

      {/* Contractor row */}
      <div className="flex items-center gap-4 mb-5">
        <span className="flex flex-col items-end gap-0.5 text-[11px] font-medium text-text-4 uppercase tracking-wide w-[80px] shrink-0">
          <ThumbsUpSolidIcon width={30} height={30} className="text-accent" />
          Hired
        </span>
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] px-5 py-4 flex-1 flex items-start justify-between group">
          <div className="flex items-center gap-3">
            {contractor ? (
              <>
                {contractor.logoUrl?.trim() && !logoError ? (
                  <img
                    src={contractor.logoUrl}
                    alt={contractor.company}
                    className="w-9 h-9 rounded-full object-contain bg-white border border-border shrink-0"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
                    {contractor.company?.trim() ? (
                      <BuildingIcon width={18} height={18} />
                    ) : (
                      <UserIcon width={18} height={18} />
                    )}
                  </div>
                )}
                <div>
                  <span className="block text-[14px] font-semibold text-text-primary">
                    {contractor.company}
                  </span>
                  {contractor.name && (
                    <span className="block text-[12px] text-text-3">
                      {contractor.name}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-[14px] text-text-3">Unassigned</span>
            )}
          </div>
          <span className="text-[10px] text-text-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms]">
            Added {formatDateTime(project.createdAt)}
          </span>
        </div>
      </div>

      {/* Timeline: events + notes in creation order */}
      {timeline.map((item) =>
        item.type === "event" ? (
          <div key={`event-${item.data.id}`} className="flex items-start gap-4 mb-3">
            <span className="flex flex-col items-end gap-0.5 text-[11px] font-medium text-text-4 uppercase tracking-wide w-[80px] shrink-0 mt-4">
              <CalendarSolidIcon width={30} height={30} className="text-accent" />
              Scheduled
            </span>
            <div
              className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] px-5 py-4 flex-1 flex items-start justify-between group cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-[1.02] hover:border-border/80 transition-all duration-200 ease-out"
              onClick={() => setEditingEvent(item.data)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") setEditingEvent(item.data); }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-text-primary">
                  {item.data.title}
                </span>
                <span className="text-[14px] text-text-3">
                  {formatDate(item.data.eventDate)}{item.data.eventTime ? ` at ${formatTime(item.data.eventTime)}${item.data.eventEndTime ? ` – ${formatTime(item.data.eventEndTime)}` : ""}` : ""}
                </span>
                {contractor && (
                  <>
                    <span className="text-[14px] text-text-3">
                      {contractor.company}
                    </span>
                    {contractor.name && (
                      <span className="text-[14px] text-text-3">
                        {contractor.name}
                      </span>
                    )}
                    {contractor.phone && (
                      <span className="text-[14px] text-text-3">
                        {contractor.phone}
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-text-4 opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms]">
                  Added {formatDateTime(item.data.createdAt)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteEvent(item.data.id); }}
                  className="text-text-4 hover:text-red opacity-0 group-hover:opacity-100 transition-all duration-[120ms]"
                  aria-label="Delete event"
                >
                  <XIcon width={14} height={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div key={`note-${item.data.id}`} className="flex items-start gap-4 mb-3">
            <span className="flex flex-col items-end gap-0.5 text-[11px] font-medium text-text-4 uppercase tracking-wide w-[80px] shrink-0 mt-4">
              <NoteSolidIcon width={30} height={30} className="text-accent" />
              Note
            </span>
            <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] px-5 py-4 flex-1 flex items-start justify-between group">
              <p className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap">
                {item.data.content}
              </p>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-[10px] text-text-4 opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms]">
                  Added {formatDateTime(item.data.createdAt)}
                </span>
                <button
                  onClick={() => handleDeleteNote(item.data.id)}
                  className="text-text-4 hover:text-red opacity-0 group-hover:opacity-100 transition-all duration-[120ms]"
                  aria-label="Delete note"
                >
                  <XIcon width={14} height={14} />
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {/* Photos */}
      <ProjectImageGallery
        ref={galleryRef}
        projectId={project.id}
        images={images}
        onImagesChange={setImages}
      />

      {/* Invoices */}
      <ProjectInvoiceSection
        ref={invoiceSectionRef}
        projectId={project.id}
        invoices={invoices}
        onInvoicesChange={setInvoices}
      />

      {/* Completion details */}
      {project.status === "Completed" && (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div>
              <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                Total Cost
              </span>
              <span className="text-[14px] font-semibold text-text-primary flex items-center gap-1.5">
                <DollarIcon width={13} height={13} className="text-text-3" />
                {project.totalCost !== null
                  ? `$${project.totalCost.toLocaleString()}`
                  : "—"}
              </span>
            </div>

            {project.contractorRating !== null && (
              <div>
                <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                  Contractor Rating
                </span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <StarFilledIcon
                      key={i}
                      width={14}
                      height={14}
                      className={
                        i < project.contractorRating!
                          ? "text-accent"
                          : "text-border-strong"
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {project.completedAt && (
              <div>
                <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                  Completed On
                </span>
                <span className="text-[14px] text-text-3">
                  {formatDateTime(project.completedAt)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mt-4 flex items-center gap-3 bg-surface rounded-[var(--radius-lg)] border border-red/20 shadow-[var(--shadow-card)] px-5 py-3">
          <span className="text-[14px] text-text-3 flex-1">
            Are you sure you want to delete this project? This cannot be undone.
          </span>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] bg-red text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editModalOpen && (
        <AddProjectModal
          project={project}
          contractors={contractors}
          homeAssets={homeAssets}
          onSave={handleEdit}
          onClose={() => setEditModalOpen(false)}
        />
      )}

      {/* Complete modal */}
      {completeModalOpen && (
        <CompleteProjectModal
          project={project}
          contractorName={contractor?.name ?? null}
          onComplete={handleComplete}
          onClose={() => setCompleteModalOpen(false)}
        />
      )}

      {/* Add event modal */}
      {addEventModalOpen && (
        <AddEventModal
          contractors={contractors}
          defaultContractorId={project.contractorId}
          onSave={handleAddEvent}
          onContractorAdded={handleContractorAdded}
          onClose={() => setAddEventModalOpen(false)}
        />
      )}

      {/* Edit event modal */}
      {editingEvent && (
        <AddEventModal
          contractors={contractors}
          defaultContractorId={project.contractorId}
          event={editingEvent}
          onSave={handleUpdateEvent}
          onContractorAdded={handleContractorAdded}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {/* Add note modal */}
      {addNoteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setAddNoteModalOpen(false);
              setNewNote("");
            }
          }}
        >
          <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-hover)] w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-[15px] font-semibold text-text-primary">
                Add Note
              </h2>
              <button
                onClick={() => {
                  setAddNoteModalOpen(false);
                  setNewNote("");
                }}
                className="flex items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-text-3 hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
                aria-label="Close modal"
              >
                <XIcon width={16} height={16} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <textarea
                ref={noteRef}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={4}
                className="w-full px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                placeholder="Write a note..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.metaKey) handleAddNote();
                }}
              />
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setAddNoteModalOpen(false);
                    setNewNote("");
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
