export function ReportSkeleton() {
  return (
    <div className="animate-pulse" data-testid="report-skeleton">
      {/* Date Group */}
      <div className="mb-2">
        <div className="h-4 w-24 bg-gray-700 rounded" />
      </div>

      {/* Reports */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg bg-gray-800 p-4"
          >
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 bg-gray-700 rounded" />
              <div className="h-4 w-1/2 bg-gray-700/50 rounded" />
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-9 w-9 bg-gray-700/50 rounded-lg"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 