import UpcomingAppointments from "@/components/UpcomingAppointments";
import HomeAlerts from "@/components/HomeAlerts";
import TaskList from "@/components/TaskList";
import SpendingCard from "@/components/SpendingCard";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import {
  InfoIcon,
  RefreshIcon,
} from "@/components/icons";

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

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Column 1 */}
        <div className="flex flex-col gap-4">
          <Card>
            <HomeAlerts />
          </Card>
          <Card>
            <TaskList />
          </Card>
          <BudgetCard />
          <CreditScoreCard />
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

/* ----- Budget ----- */
function BudgetCard() {
  return (
    <Card>
      <div className="p-5">
        <header className="flex items-start justify-between gap-4 mb-4">
          <div className="flex flex-col gap-[3px] min-w-0">
            <a href="/budget" className="group">
              <h2 className="text-sm font-semibold text-text-primary group-hover:text-accent">
                Budget
              </h2>
            </a>
            <p className="text-xs text-text-3">February 2026</p>
          </div>
          <span className="text-xs font-medium text-text-3">Expenses</span>
        </header>

        <div className="flex flex-col gap-4">
          <BudgetRow
            category="Fixed"
            budget="$23,914 budget"
            percent={77.7}
            variant="green"
            spent="$18,584 spent"
            remaining="$5,330 remaining"
            remainingVariant="positive"
          />
          <BudgetRow
            category="Flexible"
            budget="$7,050 budget"
            percent={100}
            variant="red"
            overflow
            spent="$17,781 spent"
            remaining="-$10,731 remaining"
            remainingVariant="negative"
          />
          <BudgetRow
            category="Non-Monthly"
            budget="$19,050 budget"
            percent={100}
            variant="red"
            overflow
            spent="$31,612 spent"
            remaining="-$3,562 remaining"
            remainingVariant="negative"
            showRefresh
          />
        </div>
      </div>
    </Card>
  );
}

function BudgetRow({
  category,
  budget,
  percent,
  variant,
  overflow = false,
  spent,
  remaining,
  remainingVariant,
  showRefresh = false,
}: {
  category: string;
  budget: string;
  percent: number;
  variant: "green" | "red";
  overflow?: boolean;
  spent: string;
  remaining: string;
  remainingVariant: "positive" | "negative";
  showRefresh?: boolean;
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-[13px] font-medium text-text-primary">
          {category}
        </span>
        <span className="text-[11px] text-text-3">{budget}</span>
      </div>
      <div
        className="h-[7px] bg-border rounded-full overflow-hidden relative"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${category} budget: ${percent}% used`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            variant === "green" ? "bg-green" : "bg-red"
          }`}
          style={{ width: `${percent}%` }}
        />
        {overflow && (
          <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-white/60 rounded-full" />
        )}
      </div>
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-xs text-text-3">{spent}</span>
        <span
          className={`text-xs font-medium flex items-center gap-[3px] ${
            remainingVariant === "positive" ? "text-green" : "text-red"
          }`}
        >
          {showRefresh && <RefreshIcon />}
          {remaining}
        </span>
      </div>
    </div>
  );
}

/* ----- Credit Score ----- */
function CreditScoreCard() {
  return (
    <Card>
      <div className="p-5">
        <header className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            Credit score
            <button
              className="inline-flex items-center text-text-4 p-0.5 rounded-full hover:text-text-2 transition-colors duration-[120ms]"
              aria-label="Learn more about credit score tracking"
            >
              <InfoIcon />
            </button>
          </h2>
        </header>
        <div className="flex flex-col items-center gap-4 py-6 px-4 text-center">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-text-primary">
              Turn on credit score tracking
            </p>
            <p className="text-[13px] text-text-3 leading-normal">
              Keep track of your credit score right in your dashboard.
            </p>
          </div>
          <a
            href="/credit-score"
            className="inline-flex items-center gap-1.5 border border-accent bg-transparent text-accent px-4 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium hover:bg-accent hover:text-white transition-all duration-[120ms]"
          >
            Enable credit score
          </a>
        </div>
      </div>
    </Card>
  );
}


