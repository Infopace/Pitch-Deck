import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { RetroErrorScreen } from "@/components/ui/RetroErrorScreen";

interface NotFoundPageProps {
  title?: string;
  description?: string;
}

export default function NotFoundPage({
  title = "Lost the Signal — Page Not Found",
  description = "The page or pitch deck you're looking for doesn't exist, has been removed, or the link is incorrect.",
}: NotFoundPageProps) {
  const navigate = useNavigate();

  return (
    <RetroErrorScreen
      title={title}
      description={description}
      screenText="NOT FOUND"
      watermark
      dashboardIsPrimary
      primaryAction={{ label: "Go Back", icon: <ArrowLeft size={15} />, onClick: () => navigate(-1) }}
    />
  );
}
