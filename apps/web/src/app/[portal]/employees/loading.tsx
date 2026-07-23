export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-48 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-10 w-40 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="h-12 rounded-2xl bg-muted animate-pulse" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
