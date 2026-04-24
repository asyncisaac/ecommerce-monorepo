export function ProductSkeleton() {
  return (
    <div className="group block animate-pulse">
      <div className="relative overflow-hidden rounded-2xl bg-[#f7f7f7] ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/15">
        <div className="w-full h-[320px] bg-black/10 dark:bg-white/10 rounded-2xl"></div>
      </div>
      <div className="pt-3 space-y-2">
        <div className="w-16 h-4 bg-black/10 dark:bg-white/10 rounded-full"></div>
        <div className="w-3/4 h-5 bg-black/10 dark:bg-white/10 rounded"></div>
        <div className="w-full h-4 bg-black/10 dark:bg-white/10 rounded"></div>
        <div className="w-1/2 h-4 bg-black/10 dark:bg-white/10 rounded"></div>
        <div className="w-20 h-5 bg-black/10 dark:bg-white/10 rounded mt-2"></div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}
