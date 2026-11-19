import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { adminApi } from "@/services/api/admin";
import { Switch } from "@/components/ui/Switch";
import { OfflineScreen } from "@/components/ui/OfflineScreen";
import { isNetworkError } from "@/utils/isNetworkError";

function SettingRow({
  title, description, checked, onChange, disabled,
}: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-slate-900">{title}</div>
        <div className="mt-0.5 text-[12px] text-slate-500">{description}</div>
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: adminApi.getSettings,
  });

  const update = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => adminApi.updateSetting(key, value),
    onSuccess: (settings) => {
      queryClient.setQueryData(["admin-settings"], settings);
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: () => toast.error("Couldn't save that setting — try again."),
  });

  if (isError && isNetworkError(error)) {
    return <OfflineScreen onRetry={() => refetch()} minHeight="70vh" />;
  }

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <header className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Global settings</h1>
        <p className="mt-1 text-[13px] text-slate-500">Switches that apply to every visitor, immediately.</p>
      </header>

      {isLoading || !data ? (
        <div className="h-40 animate-pulse rounded-xl border border-slate-200/80 bg-slate-50" />
      ) : (
        <div className="rounded-xl border border-slate-200/80 bg-white">
          <SettingRow
            title="Maintenance mode"
            description="Blocks every sign-in and sign-up with a 503 until turned off again."
            checked={data.maintenanceMode}
            disabled={update.isPending}
            onChange={(v) => update.mutate({ key: "maintenance_mode", value: v })}
          />
          <SettingRow
            title="New sign-ups"
            description="Turn off to stop new accounts from registering, without affecting existing users."
            checked={data.signupsEnabled}
            disabled={update.isPending}
            onChange={(v) => update.mutate({ key: "signups_enabled", value: v })}
          />
        </div>
      )}
    </div>
  );
}
