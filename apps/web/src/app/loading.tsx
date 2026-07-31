export default function RootLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div
        aria-label="Loading"
        className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground"
        role="status"
      />
    </div>
  );
}
