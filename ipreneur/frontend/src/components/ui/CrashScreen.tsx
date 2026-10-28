import { RefreshCw } from "lucide-react";
import { RetroErrorScreen } from "@/components/ui/RetroErrorScreen";

/** Shown by ErrorBoundary when a render crashes. A reload is the only
 * reliable recovery — the React tree underneath is already gone. */
export function CrashScreen() {
  return (
    <RetroErrorScreen
      title="Lost the Signal — Something Went Wrong"
      description="Something broke on our end. Reloading the page usually fixes it — if it keeps happening, let us know."
      screenText="SYSTEM ERROR"
      primaryAction={{ label: "Reload Page", icon: <RefreshCw size={15} />, onClick: () => window.location.reload() }}
    />
  );
}
