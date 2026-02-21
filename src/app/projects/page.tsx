export default function ProjectsPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
      <header className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Projects
        </h1>
      </header>
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
        <p className="text-sm font-semibold text-text-primary mb-1">
          No projects yet
        </p>
        <p className="text-[13px] text-text-3">
          Start tracking your home projects by adding your first one.
        </p>
      </div>
    </div>
  );
}
