import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Search } from "lucide-react";
import toast from "react-hot-toast";

import { adminApi } from "@/services/api/admin";
import { Switch } from "@/components/ui/Switch";
import { OfflineScreen } from "@/components/ui/OfflineScreen";
import { isNetworkError } from "@/utils/isNetworkError";

const ROLES = ["free", "pro", "enterprise", "admin"] as const;
const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const periodParam = searchParams.get("period");
  const period = periodParam === "7d" || periodParam === "30d" ? periodParam : "all";
  const createdSince = period === "all" ? undefined : new Date(Date.now() - (period === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString();
  const periodPageSize = period === "all" ? PAGE_SIZE : 100;
  const periodApiPage = period === "all" ? page : Math.floor(((page - 1) * PAGE_SIZE) / periodPageSize) + 1;
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-users", search, period, page],
    queryFn: () => adminApi.listUsers({ search: search || undefined, createdSince, page: periodApiPage, pageSize: periodPageSize }),
    staleTime: 10_000,
  });

  const patch = useMutation({
    mutationFn: ({ userId, ...rest }: { userId: string; isActive?: boolean; role?: string; isBillingExempt?: boolean }) =>
      adminApi.updateUser(userId, rest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: () => toast.error("Couldn't update that user — try again."),
  });

  if (isError && isNetworkError(error)) {
    return <OfflineScreen onRetry={() => refetch()} minHeight="70vh" />;
  }

  const responseRows = data?.data ?? [];
  const matchingRows = period === "all" || !createdSince
    ? responseRows
    : responseRows.filter((user) => new Date(user.createdAt).getTime() >= new Date(createdSince).getTime());
  const matchingTotal = period === "all" ? (data?.total ?? 0) : (data && data.total > periodPageSize ? data.total : matchingRows.length);
  const periodPageOffset = period === "all" ? 0 : ((page - 1) * PAGE_SIZE) % periodPageSize;
  const rows = period === "all" ? matchingRows : matchingRows.slice(periodPageOffset, periodPageOffset + PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(matchingTotal / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Users</h1>
          <p className="mt-1 text-[13px] text-slate-500">{period === "all" ? "Suspend an account, change its role, or grant a billing exemption." : `Showing ${data ? matchingTotal : "…"} users who joined in the last ${period === "7d" ? "7" : "30"} days.`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-500">Joined
            <select
              value={period}
              onChange={(e) => { const value = e.target.value; setPage(1); setSearchParams(value === "all" ? {} : { period: value }); }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </label>
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name or email"
              className="w-56 rounded-lg border border-slate-200 bg-white py-1.5 pl-7 pr-3 text-[12.5px] text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </header>

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
        <table className="w-full min-w-[800px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-200/80 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Decks</th>
              <th className="px-4 py-2.5 font-medium">Spend</th>
              <th className="px-4 py-2.5 font-medium">Active</th>
              <th className="px-4 py-2.5 font-medium">Billing exempt</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">{period === "all" ? "No users found." : `No users joined in the last ${period === "7d" ? "7" : "30"} days.`}</td></tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-900">{u.name}</div>
                    <div className="text-[11.5px] text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={u.role}
                      onChange={(e) => patch.mutate({ userId: u.id, role: e.target.value })}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-700 outline-none focus:border-blue-300"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-700">{u.deckCount}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-700">₹{u.totalSpendInr.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-2.5">
                    <Switch checked={u.isActive} onChange={(v) => patch.mutate({ userId: u.id, isActive: v })} />
                  </td>
                  <td className="px-4 py-2.5">
                    <Switch checked={u.isBillingExempt} onChange={(v) => patch.mutate({ userId: u.id, isBillingExempt: v })} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{format(new Date(u.createdAt), "dd/MM/yyyy")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && matchingTotal > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-[12.5px] text-slate-500">
          <span>{matchingTotal} {period === "all" ? "users" : `users joined in the last ${period === "7d" ? "7" : "30"} days`}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
