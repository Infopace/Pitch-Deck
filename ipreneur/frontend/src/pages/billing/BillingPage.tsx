import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, CreditCard, Layers } from "lucide-react";

import { billingApi, type CreditRow, type PricingRow } from "@/services/api/billing";
import { OfflineScreen } from "@/components/ui/OfflineScreen";
import { isNetworkError } from "@/utils/isNetworkError";

function PriceCard({ deck, onSelect }: { deck: PricingRow; onSelect: () => void }) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-5">
      <h3 className="text-[12px] font-semibold leading-snug text-slate-900 sm:text-[14px]">{deck.label}</h3>
      <div className="mt-1.5 flex-1 text-[19px] font-bold leading-none tracking-tight text-slate-900 sm:mt-3 sm:text-[26px]">
        ₹{deck.priceInr}
      </div>
      <p className="mt-1.5 hidden text-[12px] text-slate-500 sm:mt-2 sm:block">One-time, per deck, charged when you generate it.</p>
      {/* No checkout here — this only takes you to the generator. The charge
          (or a credit already bought there) happens when you actually
          generate the deck, same as every other deck type. */}
      <button
        type="button"
        onClick={onSelect}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-slate-800 sm:mt-5 sm:px-4 sm:py-2 sm:text-[13px]"
      >
        Create this deck
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
  const navigate = useNavigate();

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
          <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200/80 bg-slate-50 sm:h-40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3">
            {(pricing ?? []).map((deck) => (
              <PriceCard key={deck.key} deck={deck} onSelect={() => navigate(`/projects/new?type=${deck.key}`)} />
            ))}
          </div>
        )}
        <p className="mt-4 text-[12px] text-slate-500">Payments are processed securely by Razorpay, when you generate the deck.</p>
      </section>

      {/* Invoices */}
      <section className="mt-10">
        <h2 className="mb-3 text-[15px] font-semibold text-slate-900">Purchase history</h2>
        {!credits || credits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
            <p className="text-[13px] font-medium text-slate-700">No purchases yet</p>
            <p className="mt-1 text-[12px] text-slate-500">Pick a deck type above, or from New Deck — you'll pay when you generate your first deck.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
            <table className="w-full min-w-[480px] text-left text-[13px]">
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
