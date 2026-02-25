import UpcomingAppointments from "@/components/UpcomingAppointments";
import HomeAlerts from "@/components/HomeAlerts";
import TaskList from "@/components/TaskList";
import SpendingCard from "@/components/SpendingCard";
import HomeSnapshot from "@/components/HomeSnapshot";
import CurrentProjects from "@/components/CurrentProjects";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import PropertyName from "@/components/PropertyName";

export default function DashboardPage() {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Page Header */}
      <header className="flex items-center justify-between mb-6">
        <PropertyName />
        <ThemeToggleButton />
      </header>

      {/* Full-width alerts */}
      <HomeAlerts />

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
            <UpcomingAppointments />
          </Card>
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-4">
          <Card>
            <SpendingCard />
          </Card>
          <Card>
            <HomeSnapshot />
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
