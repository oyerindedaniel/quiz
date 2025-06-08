export function AnalyticsSkeleton() {
  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-5 bg-gray-200 rounded w-80"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-28"></div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-md border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gray-200"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Quiz Attempts Over Time */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-200"></div>
          <div>
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-36"></div>
          </div>
        </div>
        <div className="h-80 w-full bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-200"></div>
          <div>
            <div className="h-6 bg-gray-200 rounded w-40 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-60"></div>
          </div>
        </div>
        <div className="h-80 w-full bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="w-40 h-40 bg-gray-200 rounded-full"></div>
        </div>
      </div>

      {/* Subject Performance */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-200"></div>
          <div>
            <div className="h-6 bg-gray-200 rounded w-44 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        <div className="h-80 w-full bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="h-4 bg-gray-200 rounded w-28"></div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-200"></div>
          <div>
            <div className="h-6 bg-gray-200 rounded w-36 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-52"></div>
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-28 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
              <div className="text-right">
                <div className="h-5 bg-gray-200 rounded w-12 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
