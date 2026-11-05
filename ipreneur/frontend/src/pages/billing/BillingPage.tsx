import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, CreditCard, Layers, Loader2 } from "lucide-react";

import { billingApi, type CreditRow, type PricingRow } from "@/services/api/billing";
import { useDeckPayment } from "@/hooks/useDeckPayment";
import { useCurrentUser } from "@/stores/authStore";
import { OfflineScreen } from "@/components/ui/OfflineScreen";
import { isNetworkError } from "@/utils/isNetworkError";

function PriceCard({
  deck, busy, onBuy,
}: { deck: PricingRow; busy: boolean; onBuy: () => void }) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <h3 className="text-[14px] font-semibold text-slate-900">{deck.label}</h3>
      <div className="mt-3 flex-1 text-[26px] font-bold leading-none tracking-tight text-slate-900">
        ₹{deck.priceInr}
      </div>
      <p className="mt-2 text-[12px] text-slate-500">One-time, per deck. Yours to generate and re-generate.</p>
      <button
        type="button"
        onClick={onBuy}
        disabled={busy}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
      >
        {busy && <Loader2 size={14} className="animate-spin" />}
        {busy ? "Opening checkout" : `Buy ₹${deck.priceInr}`}
      </button>
    </article>
  );
}

function statusBadge(status: CreditRow["status"]) {
  if (status === "consumed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 size={11} /> Used
      </span>
    );
  }
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
        <Clock size={11} /> Ready to use
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
      Incomplete
    </span>
  );
}

export default function BillingPage() {
  const user = useCurrentUser();
  const qc = useQueryClient();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const {
    data: pricing, isLoading: pricingLoading, isError: pricingError,
    error: pricingErrorObj, refetch: refetchPricing,
  } = useQuery({
    queryKey: ["billing-pricing"],
    queryFn: billingApi.getPricing,
    staleTime: 30 * 60_000,
  });
  const { data: credits } = useQuery({
    queryKey: ["billing-credits"],
    queryFn: billingApi.listCredits,
    staleTime: 10_000,
  });

  const payment = useDeckPayment();
  const [buying, setBuying] = useState<string | null>(null);

  const buy = async (deck: PricingRow) => {
    setNotice(null);
    setBuying(deck.key);
    try {
      const paid = await payment.mutateAsync({
        deckType: deck.key,
        deckLabel: deck.label,
        name: user?.name,
        email: user?.email,
      });
      if (paid) {
        setNotice({ kind: "ok", text: `Paid for a ${deck.label} deck. It's ready to use from New Deck.` });
        qc.invalidateQueries({ queryKey: ["billing-credits"] });
      }
    } catch (e: any) {
      setNotice({ kind: "error", text: e?.response?.data?.detail || e?.message || "Checkout failed. Try again." });
    } finally {
      setBuying(null);
    }
  };

  const unused = useMemo(() => (credits ?? []).filter((c) => c.status === "paid").length, [credits]);

  if (pricingError && isNetworkError(pricingErrorObj)) {
    return <OfflineScreen onRetry={() => refetchPricing()} minHeight="70vh" />;
  }

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8">
      <header className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Billing</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Each deck type is a one-time purchase — no subscription, no monthly quota.
        </p>
      </header>

      {notice && (
        <div
          role="status"
          className={`mb-4 rounded-lg border px-4 py-3 text-[13px] ${
            notice.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      {unused > 0 && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] text-blue-800">
          <Layers size={15} />
          {unused} paid {unused === 1 ? "deck" : "decks"} ready to generate — no extra charge next time you create one of those types.
        </div>
      )}

      {/* Pricing */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <CreditCard size={15} className="text-blue-600" />
          <h2 className="text-[15px] font-semibold text-slate-900">Deck pricing</h2>
        </div>
        {pricingLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl border border-slate-200/80 bg-slate-50" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {(pricing ?? []).map((deck) => (
              <PriceCard key={deck.key} deck={deck} busy={buying === deck.key} onBuy={() => buy(deck)} />
            ))}
          </div>
        )}
        <p className="mt-4 text-[12px] text-slate-500">Payments are processed securely by Razorpay.</p>
      </section>

      {/* Invoices */}
      <section className="mt-10">
        <h2 className="mb-3 text-[15px] font-semibold text-slate-900">Purchase history</h2>
        {!credits || credits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
            <p className="text-[13px] font-medium text-slate-700">No purchases yet</p>
            <p className="mt-1 text-[12px] text-slate-500">Buy a deck type above, or pay when you create your first deck.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Deck type</th>
                  <th className="px-4 py-2.5 font-medium">Amount</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {credits.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{c.deckLabel}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-700">₹{c.amountInr}</td>
                    <td className="px-4 py-2.5">{statusBadge(c.status)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
