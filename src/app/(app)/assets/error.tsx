"use client";

export default function AssetsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8 max-w-lg mx-auto mt-16 text-center">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-red-700">Page Error</h2>
        <p className="text-sm text-red-600 font-mono bg-red-100 rounded p-3 text-left break-all">
          {error?.message || "Unknown error"}
        </p>
        {error?.stack && (
          <pre className="text-xs text-left text-red-500 bg-red-50 border border-red-100 rounded p-3 overflow-auto max-h-48">
            {error.stack}
          </pre>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
