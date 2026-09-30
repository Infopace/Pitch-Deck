import { useState, useEffect, useMemo } from "react";
import { Outlet, NavLink, useNavigate, useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutGrid,
  Settings,
  Menu,
  X,
  LogOut,
  Search,
  Bell,
  LayoutTemplate,
  CreditCard,
  Plus,
} from "lucide-react";

import { useAuthStore, useCurrentUser } from "@/stores/authStore";
import { projectsApi } from "@/services/api/projects";
import { billingApi } from "@/services/api/billing";
import { MintLogo } from "@/components/brand/MintLogo";

const IN_PROGRESS = ["analyzing", "researching", "generating"];
const FAILED = ["failed", "error"];

/** Status → the dot colour used in the recent list and the composition bar. */
function statusTone(status: string) {
  if (status === "ready") return { dot: "bg-emerald-500", label: "Ready" };
  if (IN_PROGRESS.includes(status)) return { dot: "bg-blue-500 animate-pulse", label: "Generating" };
  if (FAILED.includes(status)) return { dot: "bg-red-500", label: "Failed" };
  return { dot: "bg-slate-300", label: "Draft" };
}

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { logout } = useAuthStore();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = user?.name || "there";
  const userInitials = (displayName.split(" ").map((n) => n[0]).join("") || "U").slice(0, 2).toUpperCase();

  // Same query key as the dashboard, so this shares one cached response rather
  // than issuing a second request for the same list.
  const { data: projectData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list({ pageSize: 30 }),
    staleTime: 30_000,
  });
  const { data: plan } = useQuery({
    queryKey: ["billing-plan"],
    queryFn: () => billingApi.getPlan(),
    staleTime: 5 * 60_000,
  });

  const projects = projectData?.data ?? [];

  const mix = useMemo(() => {
    const ready = projects.filter((p) => p.status === "ready").length;
    const running = projects.filter((p) => IN_PROGRESS.includes(p.status)).length;
    const failed = projects.filter((p) => FAILED.includes(p.status)).length;
    return { ready, running, failed, draft: projects.length - ready - running - failed, total: projects.length };
  }, [projects]);

  const recent = useMemo(
    () =>
      [...projects]
        .sort(
          (a, b) =>
            new Date((b as any).updatedAt || (b as any).updated_at || 0).getTime() -
            new Date((a as any).updatedAt || (a as any).updated_at || 0).getTime()
        )
        .slice(0, 5),
    [projects]
  );

  // ⌘K focuses search, ⌘N starts a deck. The search box these target lives in
  // the sidebar below — before, the shortcut looked for an element that was
  // never rendered, so it silently did nothing.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMobileOpen(true);
        document.getElementById("global-command-search")?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n" && location.pathname !== "/projects/new") {
        e.preventDefault();
        navigate("/projects/new");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, location]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12.5px] font-medium no-underline transition-all ${isActive
      ? "bg-slate-900 text-white shadow-sm"
      : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"
    }`;

  const icon = (isActive: boolean) => (isActive ? "text-white" : "text-slate-400");

  return (
    <div className="flex h-full min-h-screen flex-col bg-[#f5f7fa] text-slate-800 antialiased md:flex-row">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ══ Sidebar ══════════════════════════════════════════════════ */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[212px] shrink-0 flex-col
          border-r border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/80
          transition-transform duration-300 lg:static lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* ── Brand ── */}
        <div className="flex items-center justify-between px-3 pb-3 pt-3">
          <Link to="/dashboard" className="flex items-center no-underline transition-opacity hover:opacity-90">
            <MintLogo variant={1} height={28} textColor="#0f172a" />
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Search — drives the dashboard's filter ── */}
        <div className="px-2.5 pb-2.5">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="global-command-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => location.pathname !== "/dashboard" && navigate("/dashboard")}
              placeholder="Search decks"
              className="w-full rounded-lg border border-slate-200 bg-white py-[6px] pl-7 pr-7 text-[12px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9.5px] font-semibold text-slate-300">
                ⌘K
              </kbd>
            )}
          </div>
        </div>

        {/* ── Primary action ── */}
        <div className="px-2.5 pb-3">
          <Link
            to="/projects/new"
            onClick={() => setMobileOpen(false)}
            className="btn-uiverse-fill w-full py-[7px] text-[12px]"
          >
            <Plus size={14} />
            <span>New Deck</span>
          </Link>
        </div>

        {/* ── Nav ── */}
        <nav className="space-y-0.5 px-2.5">
          <div className="px-1 pb-1 text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </div>
          <NavLink to="/dashboard" end onClick={() => setMobileOpen(false)} className={navLinkClass}>
            {({ isActive }) => (<><LayoutGrid size={14} className={icon(isActive)} /><span className="truncate">Overview</span></>)}
          </NavLink>
          <NavLink to="/templates" onClick={() => setMobileOpen(false)} className={navLinkClass}>
            {({ isActive }) => (<><LayoutTemplate size={14} className={icon(isActive)} /><span className="truncate">Templates</span></>)}
          </NavLink>

          <div className="px-1 pb-1 pt-3 text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">
            Account
          </div>
          <NavLink to="/billing" onClick={() => setMobileOpen(false)} className={navLinkClass}>
            {({ isActive }) => (<><CreditCard size={14} className={icon(isActive)} /><span className="truncate">Billing</span></>)}
          </NavLink>
          <NavLink to="/settings" onClick={() => setMobileOpen(false)} className={navLinkClass}>
            {({ isActive }) => (<><Settings size={14} className={icon(isActive)} /><span className="truncate">Settings</span></>)}
          </NavLink>
        </nav>

        {/* ── Recent decks — real, and what fills the rail ── */}
        {recent.length > 0 && (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-2.5">
            <div className="px-1 pb-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">
              Recent
            </div>
            <div className="space-y-0.5">
              {recent.map((p) => {
                const tone = statusTone(p.status);
                const ready = p.status === "ready";
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setMobileOpen(false);
                      navigate(ready ? `/projects/${p.id}/editor` : `/projects/${p.id}`);
                    }}
                    title={`${p.name} — ${tone.label}`}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left transition-colors hover:bg-white hover:shadow-sm"
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
                    <span className="truncate text-[11.5px] text-slate-600">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Footer: plan, deck mix, account ── */}
        <div className="mt-auto border-t border-slate-100 p-2.5">
          {mix.total > 0 && (
            <div className="mb-2.5 px-1">
              <div className="flex items-baseline justify-between text-[9.5px]">
                <span className="font-medium text-slate-400">Decks</span>
                <span className="font-semibold text-slate-600 tabular-nums">{mix.total}</span>
              </div>
              {/* Composition, not a quota: how the decks actually break down. */}
              <div className="mt-1 flex h-1 gap-px overflow-hidden rounded-full bg-slate-100">
                {mix.ready > 0 && <span className="bg-emerald-500" style={{ width: `${(mix.ready / mix.total) * 100}%` }} />}
                {mix.running > 0 && <span className="bg-blue-500" style={{ width: `${(mix.running / mix.total) * 100}%` }} />}
                {mix.draft > 0 && <span className="bg-slate-300" style={{ width: `${(mix.draft / mix.total) * 100}%` }} />}
                {mix.failed > 0 && <span className="bg-red-400" style={{ width: `${(mix.failed / mix.total) * 100}%` }} />}
              </div>
              <div className="mt-1 text-[9.5px] text-slate-400">
                {mix.ready} ready
                {mix.running > 0 && ` · ${mix.running} running`}
                {mix.failed > 0 && ` · ${mix.failed} failed`}
              </div>
            </div>
          )}

          <div className="relative flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-white pr-9">
            <div className="relative shrink-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[10px] font-bold text-white">
                {userInitials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[11.5px] font-semibold text-slate-800">{displayName}</span>
              <span className="truncate text-[9.5px] capitalize text-slate-400">{plan?.plan ?? user?.role ?? "free"} plan</span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="btn-uiverse-logout"
            >
              <div className="sign">
                <svg viewBox="0 0 512 512">
                  <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
                </svg>
              </div>
              <div className="text">Logout</div>
            </button>
          </div>
        </div>
      </aside>

      {/* ══ Main ═════════════════════════════════════════════════════ */}
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-2.5 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <MintLogo variant={1} height={24} textColor="#0f172a" />
            <span className="rounded border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
              STUDIO
            </span>
          </div>
          <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
            <Bell size={18} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ searchQuery }} />
        </main>
      </div>
    </div>
  );
}
