/**
 * Instant skeleton shell for /search — streams before hydration and keeps
 * the first paint non-blocking while the route chunk loads.
 */
export default function SearchLoading() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="border-b border-gray-200 bg-white">
        <div className="page-container py-4">
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>
      </div>
      <div className="page-container py-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton aspect-[4/3] w-full" />
              <div className="space-y-3 p-4">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-8 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
