export default function Loading() {
  return (
    <div className="animate-pulse p-6 sm:p-8">
      {/* Page heading skeleton */}
      <div className="h-6 bg-border rounded w-48 mb-6" />

      {/* Content card skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-surface rounded-[var(--radius-md)] border border-border p-5 space-y-3"
          >
            <div className="h-4 bg-border rounded w-3/4" />
            <div className="h-3 bg-border rounded w-1/2" />
            <div className="h-3 bg-border rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
