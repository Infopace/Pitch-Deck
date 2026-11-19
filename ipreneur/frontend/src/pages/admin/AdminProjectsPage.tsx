import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { adminApi } from "@/services/api/admin";
import { OfflineScreen } from "@/components/ui/OfflineScreen";
import { isNetworkError } from "@/utils/isNetworkError";

const PAGE_SIZE = 20;

function statusBadge(status: string) {
  const tone =
    status === "ready" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
    status === "error" ? "border-red-200 bg-red-50 text-red-700" :
    ["analyzing", "researching", "generating"].includes(status) ? "border-blue-200 bg-blue-50 text-blue-700" :
    "border-slate-200 bg-slate-100 text-slate-500";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>{status}</span>;
}

export default function AdminProjectsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-projects", search, page],
    queryFn: () => adminApi.listProjects({ page, pageSize: PAGE_SIZE, deckType: search || undefined }),
    staleTime: 10_000,
  });

  const softDelete = useMutation({
    mutationFn: (projectId: string) => adminApi.softDeleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Deck deleted");
    },
    onError: () => toast.error("Couldn't delete that deck — try again."),
  });

  if (isError && isNetworkError(error)) {
    return <OfflineScreen onRetry={() => refetch()} minHeight="70vh" />;
  }

  const rows = data?.data ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Decks</h1>
          <p className="mt-1 text-[13px] text-slate-500">Every deck across every account.</p>
        </div>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Filter by deck type"
          className="w-56 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
      </header>

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
        <table className="w-full min-w-[800px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-200/80 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5 font-medium">Deck</th>
              <th className="px-4 py-2.5 font-medium">Owner</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No decks found.</td></tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.userEmail}</td>
                  <td className="px-4 py-2.5 text-slate-700">{p.deckType}</td>
                  <td className="px-4 py-2.5">{statusBadge(p.status)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${p.name}"? This can't be undone from the admin panel.`)) {
                          softDelete.mutate(p.id);
                        }
                      }}
                      title="Delete deck"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-[12.5px] text-slate-500">
          <span>{data.total} decks total</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-40">Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
