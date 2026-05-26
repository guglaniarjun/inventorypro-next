"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: 32, maxWidth: 600, margin: "64px auto", fontFamily: "monospace" }}>
          <h2 style={{ color: "#b91c1c", marginBottom: 8 }}>Application Error</h2>
          <pre style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 16, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {error?.message || "Unknown error"}{"\n\n"}{error?.stack || ""}
          </pre>
          <button
            onClick={reset}
            style={{ marginTop: 16, padding: "8px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
