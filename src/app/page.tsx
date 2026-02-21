import SpendingChart from "@/components/SpendingChart";
import {
  StarIcon,
  ChevronRightIcon,
  GearIcon,
  InfoIcon,
  PhoneIcon,
  HomeIcon,
  PackageIcon,
  RefreshIcon,
} from "@/components/icons";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const greeting = getGreeting();

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Page Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          {greeting}, Derik!
        </h1>
        <button className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]">
          <GearIcon width={13} height={13} />
          Customize
        </button>
      </header>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Column 1 */}
        <div className="flex flex-col gap-4">
          <WeeklyRecapCard />
          <BudgetCard />
          <CreditScoreCard />
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-4">
          <SpendingCard />
          <TransactionsCard />
          <RecurringCard />
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

function SelectControl({
  label,
  options,
}: {
  label: string;
  options: string[];
}) {
  return (
    <div className="relative inline-flex items-center">
      <select
        className="appearance-none bg-border border-none rounded-[var(--radius-sm)] py-[5px] pl-2.5 pr-[26px] text-xs font-medium text-text-primary cursor-pointer hover:bg-border-strong transition-[background] duration-[120ms]"
        aria-label={label}
        defaultValue={options[0]}
      >
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
      <svg
        className="absolute right-[7px] pointer-events-none text-text-3"
        width={13}
        height={13}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

/* ----- Weekly Recap ----- */
function WeeklyRecapCard() {
  return (
    <Card>
      <a
        href="/weekly-recap"
        className="block p-5 hover:bg-surface-hover transition-[background] duration-[120ms]"
      >
        <header className="mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-1.5 bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#ec4899] bg-clip-text text-transparent">
            <StarIcon className="text-[#a855f7]" />
            Your Weekly Recap
          </h2>
          <p className="text-xs text-text-3">February 8th–14th</p>
        </header>
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] text-text-2 leading-relaxed">
            See how your net worth and spending changed last week, and see
            what&apos;s coming up this week
          </p>
          <ChevronRightIcon className="shrink-0 text-text-4 hover:text-text-2 transition-all duration-[120ms]" width={16} height={16} />
        </div>
      </a>
    </Card>
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
          <SelectControl
            label="Budget view"
            options={["Expenses", "Income", "Net"]}
          />
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

/* ----- Spending Chart ----- */
function SpendingCard() {
  return (
    <Card>
      <div className="p-5">
        <header className="flex items-start justify-between gap-4 mb-4">
          <div className="flex flex-col gap-[3px] min-w-0">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
              Spending
              <StarIcon />
            </h2>
            <p className="text-[22px] font-bold text-text-primary tracking-tight leading-tight">
              $67,976.72{" "}
              <span className="text-sm font-normal text-text-3">
                this month
              </span>
            </p>
          </div>
          <SelectControl
            label="Spending comparison period"
            options={[
              "This month vs. average month",
              "This month vs. last month",
              "This month vs. last year",
            ]}
          />
        </header>
        <div className="h-[200px] -mx-1 my-3 relative">
          <SpendingChart />
        </div>
        <div className="flex flex-wrap gap-4 pt-2" aria-hidden="true">
          <span className="flex items-center gap-1.5 text-[11px] text-text-3">
            <span className="inline-block w-5 h-0.5 rounded-sm bg-[#aaaaaa] shrink-0" />
            Average month (last 12 months)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-text-3">
            <span className="inline-block w-5 h-0.5 rounded-sm bg-accent shrink-0" />
            This month
          </span>
        </div>
      </div>
    </Card>
  );
}

/* ----- Transactions ----- */
function TransactionsCard() {
  const transactions = [
    { initials: "V", name: "Verizon", bg: "#1a1a2e", category: "Phone", icon: PhoneIcon, amount: "$300.77" },
    { initials: "SF", name: "State Farm", bg: "#cc0000", category: "Insurance", icon: HomeIcon, amount: "$802.55" },
    { initials: "A", name: "Anthropic", bg: "#cc785c", category: "Uncategorized", icon: InfoIcon, amount: "$87.61" },
    { initials: "DA", name: "Delta Airlines", bg: "#003087", category: "Business Travel & Meals", icon: PackageIcon, amount: "$1,346.79" },
    { initials: "DA", name: "Delta Airlines", bg: "#003087", category: "Business Travel & Meals", icon: PackageIcon, amount: "$1,131.79" },
  ];

  return (
    <Card>
      <div className="p-5">
        <header className="flex items-start justify-between gap-4 mb-4">
          <div className="flex flex-col gap-[3px] min-w-0">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
              Transactions
              <StarIcon />
            </h2>
            <p className="text-xs text-text-3">Most recent</p>
          </div>
          <SelectControl
            label="Transaction filter"
            options={["All transactions", "Income only", "Expenses only"]}
          />
        </header>

        <ul
          className="flex flex-col -mx-5"
          role="list"
          aria-label="Recent transactions"
        >
          {transactions.map((tx, i) => (
            <li
              key={i}
              className="grid grid-cols-[32px_1fr_auto_auto_auto_auto] items-center gap-2 px-5 py-[9px] border-t border-border cursor-pointer hover:bg-surface-hover transition-[background] duration-[120ms]"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 tracking-tight"
                style={{ background: tx.bg }}
              >
                {tx.initials}
              </div>
              <span className="text-[13px] font-medium text-text-primary truncate min-w-0">
                {tx.name}
              </span>
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-text-3 whitespace-nowrap max-w-[120px] truncate">
                <tx.icon />
                {tx.category}
              </span>
              <span className="text-[9px] font-bold text-text-3 border border-border-strong rounded-[3px] px-[3px] py-px leading-tight shrink-0">
                P
              </span>
              <span className="text-[13px] font-medium text-text-primary text-right whitespace-nowrap shrink-0">
                {tx.amount}
              </span>
              <ChevronRightIcon className="text-text-4 shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/* ----- Recurring ----- */
function RecurringCard() {
  return (
    <Card>
      <div className="p-5">
        <header className="flex items-start justify-between gap-4 mb-4">
          <div className="flex flex-col gap-[3px] min-w-0">
            <h2 className="text-sm font-semibold text-text-primary">
              Recurring
            </h2>
            <p className="text-xs text-text-3">$1,338.67 remaining due</p>
          </div>
          <SelectControl
            label="Recurring period"
            options={["This month", "Next month"]}
          />
        </header>

        <div className="flex items-center gap-3 pt-3 border-t border-border">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: "#10a37f" }}
          >
            O
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-text-primary">
              OpenAI
            </span>
            <span className="text-[11px] text-text-3">
              Merchant &middot; Every month
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span className="text-[13px] font-medium text-text-primary">
              $21.53
            </span>
            <span className="text-[11px] text-text-3">in 7 days</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
