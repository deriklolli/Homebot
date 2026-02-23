import UpcomingAppointments from "@/components/UpcomingAppointments";
import HomeAlerts from "@/components/HomeAlerts";
import TaskList from "@/components/TaskList";
import SpendingCard from "@/components/SpendingCard";
import HomeSnapshot from "@/components/HomeSnapshot";
import CurrentProjects from "@/components/CurrentProjects";
import ThemeToggleButton from "@/components/ThemeToggleButton";

export default function DashboardPage() {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Page Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          1715 Red Hawk Trail
        </h1>
        <ThemeToggleButton />
      </header>

      {/* Full-width alerts */}
      <article className="bg-surface rounded-[var(--radius-lg)] border border-red/20 shadow-[0_1px_4px_rgba(224,49,49,0.15),0_2px_8px_rgba(224,49,49,0.1)] overflow-hidden hover:shadow-[0_4px_16px_rgba(224,49,49,0.18),0_2px_6px_rgba(224,49,49,0.12)] transition-shadow duration-200 mb-4">
        <HomeAlerts />
      </article>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Column 1 */}
        <div className="flex flex-col gap-4">
          <Card>
            <TaskList />
          </Card>
          <Card>
            <CurrentProjects />
          </Card>
          <Card>
            <HomeSnapshot />
          </Card>
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-4">
          <Card>
            <SpendingCard />
          </Card>
          <Card>
            <UpcomingAppointments />
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   WIDGET COMPONENTS
   ============================================================ */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden hover:shadow-[var(--shadow-hover)] transition-shadow duration-200 ${className}`}
    >
      {children}
    </article>
  );
}
