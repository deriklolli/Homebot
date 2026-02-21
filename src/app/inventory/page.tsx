export default function InventoryPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
      <header className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Home Inventory
        </h1>
      </header>
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
        <p className="text-sm font-semibold text-text-primary mb-1">
          No items yet
        </p>
        <p className="text-[13px] text-text-3">
          Start cataloging your home items, appliances, and furnishings.
        </p>
      </div>
    </div>
  );
}
