import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, FileText, Layers, Loader2, Sparkles } from "lucide-react";

import { billingApi, type PlanSummary } from "@/services/api/billing";
import { openSubscriptionCheckout } from "@/services/razorpay";
import { projectsApi } from "@/services/api/projects";
import { useCurrentUser } from "@/stores/authStore";
import { OfflineScreen } from "@/components/ui/OfflineScreen";
import { isNetworkError } from "@/utils/isNetworkError";

/** Plan names from the API ("Free", "Pro") line up with the user's role
 *  ("free", "pro"); admin accounts are shown as Enterprise. */
function planKey(plan?: string): string {
  const p = (plan || "free").toLowerCase();
  return p === "admin" ? "enterprise" : p;
}

function limitLabel(n: number): string {
  return n < 0 ? "Unlimited" : String(n);
}

function UsageMeter({ label, used, limit, icon }: { label: string; used: number; limit: number; icon: React.ReactNode }) {
  const unlimited = limit < 0;
  const pct = unlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const near = !unlimited && pct >= 80;
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600">{icon}</span>
          {label}
        </span>
        <span className="text-[13px] tabular-nums text-slate-500">
          <span className="font-semibold text-slate-900">{used}</span> / {limitLabel(limit)}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={unlimited ? undefined : limit} aria-label={label}>
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${near ? "bg-amber-500" : "bg-blue-600"}`}
          style={{ width: unlimited ? "100%" : `${pct}%`, opacity: unlimited ? 0.25 : 1 }}
        />
      </div>
      {near && <p className="mt-2 text-[12px] text-amber-700">You are close to your plan limit.</p>}
    </div>
  );
}

function PlanCard({
  plan, current, onUpgrade, busy,
}: { plan: PlanSummary; current: boolean; onUpgrade?: () => void; busy?: boolean }) {
  const custom = !/\d/.test(plan.price);
  const canBuy = !current && !custom && !!onUpgrade;
  return (
    <article
      className={`flex flex-col rounded-xl border bg-white p-5 shadow-sm ${
        current ? "border-blue-500 ring-1 ring-blue-500/30" : "border-slate-200/80"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-slate-900">{plan.name}</h3>
        {current && (
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
            Current plan
          </span>
        )}
      </div>
      <div className="mt-3 text-[28px] font-bold leading-none tracking-tight text-slate-900">{plan.price}</div>
      <ul className="mt-5 flex-1 space-y-2.5 text-[13px] text-slate-600">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check size={14} className="mt-0.5 shrink-0 text-blue-600" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {/* Only paid self-serve plans open checkout; Enterprise is sold by the team. */}
      <button
        type="button"
        disabled={!canBuy || busy}
        onClick={onUpgrade}
        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
          current
            ? "cursor-default border border-slate-200 bg-slate-50 text-slate-500"
            : canBuy
              ? "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
              : "cursor-default border border-slate-200 bg-white text-slate-600"
        }`}
      >
        {busy && <Loader2 size={14} className="animate-spin" />}
        {current ? "Your current plan" : custom ? "Contact sales" : busy ? "Opening checkout" : `Upgrade to ${plan.name}`}
      </button>
    </article>
  );
}

export default function BillingPage() {
  const user = useCurrentUser();

  const { data: plan, isLoading: planLoading, isError: planError, error: planErrorObj, refetch: refetchPlan } = useQuery({
    queryKey: ["billing-plan"],
    queryFn: () => billingApi.getPlan(),
    staleTime: 5 * 60_000,
  });
  const { data: plans } = useQuery({
    queryKey: ["billing-plans"],
    queryFn: () => billingApi.listPlans(),
    staleTime: 30 * 60_000,
  });
  // Same key the dashboard uses, so this reuses its cached list.
  const { data: projectData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list({ pageSize: 30 }),
    staleTime: 30_000,
  });

  const qc = useQueryClient();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const upgrade = useMutation({
    mutationFn: async () => {
      const session = await billingApi.createCheckout();
      const result = await openSubscriptionCheckout({
        keyId: session.keyId,
        subscriptionId: session.subscriptionId,
        name: user?.name,
        email: user?.email,
      });
      if (!result) return false; // window closed without paying
      await billingApi.verifyPayment(result);
      return true;
    },
    onSuccess: (paid) => {
      if (paid) {
        setNotice({ kind: "ok", text: "Payment received. You are now on the Pro plan." });
        qc.invalidateQueries({ queryKey: ["billing-plan"] });
      }
    },
    onError: (e: any) =>
      setNotice({ kind: "error", text: e?.response?.data?.detail || e?.message || "Checkout failed. Try again." }),
  });

  const cancel = useMutation({
    mutationFn: () => billingApi.cancel(),
    onSuccess: () => {
      setNotice({ kind: "ok", text: "Renewal stopped. Pro stays active until the end of your paid period." });
      qc.invalidateQueries({ queryKey: ["billing-plan"] });
    },
    onError: (e: any) =>
      setNotice({ kind: "error", text: e?.response?.data?.detail || "Could not cancel. Try again." }),
  });

  const current = planKey(plan?.plan);
  const currentName = current.charAt(0).toUpperCase() + current.slice(1);
  const decksUsed = projectData?.total ?? projectData?.data?.length ?? 0;

  // If the plan request never reached the server, it's a safe bet the other
  // two queries on this page didn't either — the whole page is unreachable,
  // not just this one card.
  if (planError && isNetworkError(planErrorObj)) {
    return <OfflineScreen onRetry={() => refetchPlan()} minHeight="70vh" />;
  }

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8">
      <header className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Billing</h1>
        <p className="mt-1 text-[13px] text-slate-500">Your plan, what you have used, and the options available to you.</p>
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

      {/* Current plan + usage */}
      <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-slate-500">
            <CreditCard size={14} /> Current plan
          </div>
          {planLoading ? (
            <div className="mt-4 h-8 w-32 animate-pulse rounded bg-slate-100" />
          ) : planError ? (
            <p className="mt-3 text-[13px] text-red-600">We could not load your plan. Refresh the page to try again.</p>
          ) : (
            <>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-[32px] font-bold leading-none tracking-tight text-slate-900">{currentName}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    plan?.isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-100 text-slate-600"
                  }`}
                >
                  {plan?.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-3 text-[13px] text-slate-500">
                Billed to <span className="font-medium text-slate-700">{user?.email ?? "your account email"}</span>
              </p>
            </>
          )}
        </div>

        <div className="grid gap-3">
          <UsageMeter
            label="Decks"
            used={decksUsed}
            limit={plan?.projectsLimit ?? 0}
            icon={<Layers size={13} />}
          />
          {/* Export counts are not tracked yet, so only the allowance is shown. */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm">
            <span className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600">
                <FileText size={13} />
              </span>
              Exports included
            </span>
            <span className="text-[13px] font-semibold text-slate-900 tabular-nums">{limitLabel(plan?.exportsLimit ?? 0)}</span>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={15} className="text-blue-600" />
          <h2 className="text-[15px] font-semibold text-slate-900">Plans</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {(plans ?? []).map((p) => (
            <PlanCard
              key={p.name}
              plan={p}
              current={p.name.toLowerCase() === current}
              onUpgrade={p.name === "Pro" ? () => { setNotice(null); upgrade.mutate(); } : undefined}
              busy={p.name === "Pro" && upgrade.isPending}
            />
          ))}
        </div>
        {current === "pro" && (
          <button
            type="button"
            onClick={() => { setNotice(null); cancel.mutate(); }}
            disabled={cancel.isPending}
            className="mt-4 text-[12px] font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline disabled:opacity-60"
          >
            {cancel.isPending ? "Cancelling" : "Cancel subscription"}
          </button>
        )}
        <p className="mt-4 text-[12px] text-slate-500">Payments are processed securely by Razorpay. Enterprise plans are arranged with the iPreneur team.</p>
      </section>

      {/* Invoices */}
      <section className="mt-10">
        <h2 className="mb-3 text-[15px] font-semibold text-slate-900">Invoices</h2>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
          <p className="text-[13px] font-medium text-slate-700">No invoices yet</p>
          <p className="mt-1 text-[12px] text-slate-500">Invoices appear here after your first paid billing period.</p>
        </div>
      </section>
    </div>
  );
}
