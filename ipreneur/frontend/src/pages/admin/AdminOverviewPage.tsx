import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, ArrowUpRight, CreditCard, LayoutGrid, LogIn, Sparkles, Users } from "lucide-react";

import { adminApi } from "@/services/api/admin";
import { OfflineScreen } from "@/components/ui/OfflineScreen";
import { isNetworkError } from "@/utils/isNetworkError";
import type { AdminEvent } from "@/types/admin";

const inr = (n: number | undefined) => `₹${(n ?? 0).toLocaleString("en-IN")}`;
const compactInr = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n}`;
const DECK_COLORS = ["#2563eb", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e"];

function Stat({ icon, value, label, detail, to, tone }: { icon: React.ReactNode; value: string; label: string; detail: string; to: string; tone: string }) {
  return (
    <Link to={to} className="group relative min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm no-underline transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400">
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
        <ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-blue-600" />
      </div>
      <div className="mt-4 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-0.5 truncate text-xs font-medium text-slate-600">{label}</div>
      <div className="mt-2 truncate text-[11px] text-slate-400">{detail}</div>
    </Link>
  );
}

const EVENT_LABEL: Record<string, { label: string; icon: React.ReactNode }> = {
  user_login: { label: "Login", icon: <LogIn size={13} /> },
  user_registered: { label: "Sign-up", icon: <Sparkles size={13} /> },
  deck_created: { label: "Deck created", icon: <LayoutGrid size={13} /> },
  payment_received: { label: "Payment", icon: <CreditCard size={13} /> },
  admin_action: { label: "Admin", icon: <Activity size={13} /> },
};

function EventRow({ event }: { event: AdminEvent }) {
  const meta = EVENT_LABEL[event.type] ?? { label: event.type, icon: <Activity size={13} /> };
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{meta.icon}</span>
      <div className="min-w-0 flex-1"><p className="text-[13px] text-slate-800">{event.summary}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{meta.label} · {new Date(event.createdAt).toLocaleString()}</p></div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg"><p className="text-xs text-slate-500">{payload[0].name ?? label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{inr(Number(payload[0].value))}</p></div>;
}

export default function AdminOverviewPage() {
  const { data: overview, isLoading, isError, error, refetch } = useQuery({ queryKey: ["admin-overview"], queryFn: adminApi.getOverview, staleTime: 30_000, refetchInterval: 30_000 });
  const { data: events } = useQuery({ queryKey: ["admin-events"], queryFn: () => adminApi.listEvents({ limit: 30 }), refetchInterval: 20_000 });

  const revenueDays = useMemo(() => {
    if (!overview) return [];
    const byDate = new Map(overview.revenueByDay.map((day) => [day.date, day.revenueInr]));
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - 29 + i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return { date: key, revenueInr: byDate.get(key) ?? 0 };
    });
  }, [overview]);

  if (isError && isNetworkError(error)) return <OfflineScreen onRetry={() => refetch()} minHeight="70vh" />;
  const totalPeriodRevenue = revenueDays.reduce((sum, day) => sum + day.revenueInr, 0);
  const bestDay = revenueDays.reduce((best, day) => day.revenueInr > best.revenueInr ? day : best, { date: "", revenueInr: 0 });
  const deckTypes = overview?.revenueByDeckType ?? [];
  const totalDeckRevenue = deckTypes.reduce((sum, row) => sum + row.revenueInr, 0);

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <header className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Your business at a glance</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Admin overview</h1>
        <p className="mt-1 text-sm text-slate-500">A live snapshot of customers, deck creation, and payments.</p></header>

      {isLoading || !overview ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />)}</div> : <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat icon={<Users size={18} />} value={overview.totalUsers.toLocaleString()} label="Total users" detail="All registered accounts" to="/admin/users" tone="bg-blue-50 text-blue-700" />
          <Stat icon={<Sparkles size={18} />} value={`+${overview.newUsersWeek}`} label="New users · 7 days" detail="View recent sign-ups" to="/admin/users?period=7d" tone="bg-violet-50 text-violet-700" />
          <Stat icon={<LayoutGrid size={18} />} value={overview.totalProjects.toLocaleString()} label="Total decks" detail="Created across accounts" to="/admin/projects" tone="bg-cyan-50 text-cyan-700" />
          <Stat icon={<CreditCard size={18} />} value={inr(overview.revenueInrToday)} label="Revenue today" detail="Payments received today" to="/admin/transactions" tone="bg-emerald-50 text-emerald-700" />
          <Stat icon={<CreditCard size={18} />} value={inr(overview.revenueInrWeek)} label="Revenue · 7 days" detail="Payments in the last week" to="/admin/transactions" tone="bg-amber-50 text-amber-700" />
          <Stat icon={<CreditCard size={18} />} value={inr(overview.revenueInrAllTime)} label="Revenue all-time" detail="All recorded payments" to="/admin/transactions" tone="bg-rose-50 text-rose-700" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900">Revenue over time</h2><p className="mt-1 text-xs text-slate-500">Daily payments received · last 30 days</p></div>
              <div className="rounded-xl bg-blue-50 px-3 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-blue-600">30-day total</p><p className="text-lg font-bold text-blue-900">{inr(totalPeriodRevenue)}</p></div></div>
            <div className="mt-4 w-full" style={{ height: 260, minHeight: 260 }}>
              {totalPeriodRevenue === 0 ? <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">No payments recorded in the last 30 days.</div> : <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                <AreaChart data={revenueDays} margin={{ top: 8, right: 10, bottom: 0, left: 4 }}>
                  <defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.24} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0.015} /></linearGradient></defs>
                  <CartesianGrid stroke="#e8eef7" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tickFormatter={compactInr} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip content={<ChartTooltip />} /><ReferenceLine y={totalPeriodRevenue / 30} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="revenueInr" stroke="#2563eb" strokeWidth={3} fill="url(#revenueFill)" activeDot={{ r: 5, strokeWidth: 2, stroke: "white" }} />
                </AreaChart>
              </ResponsiveContainer>}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-600" />Daily revenue</span><span className="text-right">{bestDay.revenueInr > 0 ? <>Best day: <strong className="font-semibold text-slate-700">{new Date(`${bestDay.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {inr(bestDay.revenueInr)}</strong></> : "Dashed line shows the daily average"}</span></div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div><h2 className="text-base font-semibold text-slate-900">Revenue mix by deck type</h2><p className="mt-1 text-xs text-slate-500">Each slice shows its share of deck revenue</p></div>
            {deckTypes.length === 0 ? <div className="mt-4 flex h-48 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">No deck revenue to show yet.</div> : <div className="mt-3 grid items-center gap-3 sm:grid-cols-[minmax(180px,0.9fr)_1.1fr]">
              <div className="relative mx-auto h-[220px] w-full max-w-[250px]" aria-label="Donut chart showing revenue share by deck type">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                  <PieChart>
                    <Pie data={deckTypes} dataKey="revenueInr" nameKey="label" innerRadius="64%" outerRadius="88%" paddingAngle={deckTypes.length > 1 ? 3 : 0} stroke="#fff" strokeWidth={3}>
                      {deckTypes.map((item, index) => <Cell key={item.deckType} fill={DECK_COLORS[index % DECK_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Total revenue</span><strong className="mt-1 max-w-[90%] truncate text-base font-bold text-slate-900">{inr(totalDeckRevenue)}</strong></div>
              </div>
              <div className="space-y-3">
                {deckTypes.slice().sort((a, b) => b.revenueInr - a.revenueInr).map((item) => {
                  const colorIndex = deckTypes.findIndex((entry) => entry.deckType === item.deckType);
                  const share = totalDeckRevenue > 0 ? Math.round(item.revenueInr / totalDeckRevenue * 100) : 0;
                  return <div key={item.deckType} className="flex items-start gap-2.5">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: DECK_COLORS[colorIndex % DECK_COLORS.length] }} />
                    <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><span className="truncate text-xs font-medium text-slate-700">{item.label}</span><strong className="shrink-0 text-xs text-slate-900">{share}%</strong></div><p className="mt-0.5 text-[11px] text-slate-500">{inr(item.revenueInr)} · {item.count} {item.count === 1 ? "sale" : "sales"}</p></div>
                  </div>;
                })}
              </div>
            </div>}
            {deckTypes.length > 0 && <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className="text-slate-500">Total deck revenue</span><strong className="text-slate-900">{inr(totalDeckRevenue)}</strong></div>}
            <Link to="/admin/transactions" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900">View transactions <ArrowRight size={13} /></Link>
          </section>
        </div>
      </>}

      <section className="mt-6"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-base font-semibold text-slate-900">Recent activity</h2><p className="mt-0.5 text-xs text-slate-500">What people are doing right now</p></div><Activity size={17} className="text-slate-400" /></div>
        <div className="max-h-[480px] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">{!events || events.length === 0 ? <div className="px-4 py-8 text-center text-[13px] text-slate-500">No activity yet.</div> : events.map((e) => <EventRow key={e.id} event={e} />)}</div></section>
    </div>
  );
}
