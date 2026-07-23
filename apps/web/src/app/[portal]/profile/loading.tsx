export default function Loading() {
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="h-8 w-32 rounded-md bg-muted animate-pulse" />
      <div className="h-40 rounded-2xl bg-muted animate-pulse" />
      <div className="h-24 rounded-2xl bg-muted animate-pulse" />
    </div>
  );
}
