export function ImportSkeleton() {
  return (
    <div className="p-6 space-y-8 animate-pulse">
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-80"></div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-40"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-64 mt-1"></div>
        </div>

        <div className="p-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="w-12 h-12 bg-gray-200 rounded mx-auto mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-48"></div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <ul className="space-y-2 ml-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-gray-200 rounded-full mt-2"></div>
                  <div className="h-4 bg-gray-200 rounded flex-1"></div>
                </li>
              ))}
            </ul>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="h-4 bg-gray-200 rounded w-40 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
