import { RefreshCw } from "lucide-react";
import { RetroErrorScreen } from "@/components/ui/RetroErrorScreen";

interface OfflineScreenProps {
  /** Re-run whatever query/action failed. */
  onRetry: () => void;
  minHeight?: string;
}

/** Shown in place of a page's content when its data couldn't load because
 * the request never got a response at all — see isNetworkError(). A page
 * that fails for a reason the server actually stated (a 404, a 500) keeps
 * its own inline message instead; this one is specifically "we're not even
 * reaching Mint." */
export function OfflineScreen({ onRetry, minHeight }: OfflineScreenProps) {
  return (
    <RetroErrorScreen
      title="Lost the Signal — Can't Reach Mint"
      description="We can't connect to the server right now. Check your internet connection and try again."
      screenText="NO SIGNAL"
      primaryAction={{ label: "Retry", icon: <RefreshCw size={15} />, onClick: onRetry }}
      minHeight={minHeight}
    />
  );
}
