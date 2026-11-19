import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock } from "lucide-react";

import { adminApi } from "@/services/api/admin";
import { OfflineScreen } from "@/components/ui/OfflineScreen";
import { isNetworkError } from "@/utils/isNetworkError";

const PAGE_SIZE = 20;

function deckStatusBadge(generated: boolean, status?: string | null) {
  if (generated) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 size={11} /> Delivered
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
      <Clock size={11} /> {status ?? "Not generated"}
    </span>
  );
}

export default function AdminTransactionsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-transactions", search, page],
    queryFn: () => adminApi.listTransactions({ page, pageSize: PAGE_SIZE, userId: undefined, deckType: search || undefined }),
    staleTime: 10_000,
  });

  if (isError && isNetworkError(error)) {
    return <OfflineScreen onRetry={() => refetch()} minHeight="70vh" />;
  }

  const rows = data?.data ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const totalInr = rows.reduce((sum, r) => sum + r.amountInr, 0);

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Transactions</h1>
          <p className="mt-1 text-[13px] text-slate-500">Who bought which deck, when, and what happened to it.</p>
        </div>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Filter by deck type (e.g. investor)"
          className="w-64 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
      </header>

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-200/80 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5 font-medium">Buyer</th>
              <th className="px-4 py-2.5 font-medium">Deck type</th>
              <th className="px-4 py-2.5 font-medium">Deck</th>
              <th className="px-4 py-2.5 font-medium">Amount</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Paid at</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No transactions found.</td></tr>
            ) : (
              rows.map((t) => (
                <tr key={t.paymentId} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-900">{t.userName}</div>
                    <div className="text-[11.5px] text-slate-500">{t.userEmail}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{t.deckLabel}</td>
                  <td className="px-4 py-2.5 text-slate-500">{t.projectName ?? "—"}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-700">₹{t.amountInr.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-2.5">{deckStatusBadge(t.deckGenerated, t.projectStatus)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{new Date(t.paidAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-[12.5px] text-slate-500">
        <span>{data?.total ?? 0} transactions · ₹{totalInr.toLocaleString("en-IN")} on this page</span>
        {data && data.total > PAGE_SIZE && (
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-40">Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
