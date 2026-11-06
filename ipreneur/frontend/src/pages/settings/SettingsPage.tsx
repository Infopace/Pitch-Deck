import { useCurrentUser } from "@/stores/authStore";

export default function SettingsPage() {
  const user = useCurrentUser();
  return (
    <div className="p-5 sm:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Settings</h1>
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6">
        <h2 className="font-semibold text-text-primary mb-4">Account</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-3"><span className="text-text-secondary shrink-0">Name</span><span className="text-text-primary text-right break-all">{user?.name}</span></div>
          <div className="flex justify-between gap-3"><span className="text-text-secondary shrink-0">Email</span><span className="text-text-primary text-right break-all">{user?.email}</span></div>
          <div className="flex justify-between gap-3"><span className="text-text-secondary shrink-0">Plan</span><span className="text-text-primary capitalize text-right">{user?.role}</span></div>
        </div>
      </div>
    </div>
  );
}
