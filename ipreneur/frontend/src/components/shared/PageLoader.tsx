import { HourglassLoader } from "@/components/ui/HourglassLoader";

interface PageLoaderProps {
  message?: string;
  size?: number;
  minHeight?: number | string;
}

export function PageLoader({
  message = "Loading…",
  size = 64,
  minHeight = "100vh",
}: PageLoaderProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight,
        width: "100%",
        gap: 16,
        background: "transparent",
      }}
    >
      <HourglassLoader size={size} />
      {message && (
        <p
          style={{
            font: "500 14px var(--font-body, system-ui, -apple-system, sans-serif)",
            color: "var(--text-muted, #64748b)",
            letterSpacing: "0.01em",
            margin: 0,
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
