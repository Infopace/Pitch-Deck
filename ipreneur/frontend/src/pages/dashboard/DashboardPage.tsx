import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  CheckCircle2,
  Loader2,
  FileText,
  Plus,
  ChevronDown,
} from "lucide-react";

import { projectsApi } from "@/services/api/projects";
import { useCurrentUser } from "@/stores/authStore";
import { deckTypeLabel, slideOrder } from "@/components/workspace/deckTemplates/deckTypes";
import { renderSlide } from "@/components/workspace/deckTemplates/TemplatedDeck";
import { FitSlide } from "@/components/workspace/deckTemplates/FitSlide";
import { getTheme, ensureDeckFonts, DEFAULT_THEME_KEY } from "@/components/workspace/deckTemplates/themes";
import { VIEW_CTX } from "@/components/workspace/deckTemplates/editing/editableText";
import { HourglassLoader } from "@/components/ui/HourglassLoader";
import type { Project } from "@/types";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function relativeTime(iso?: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const IN_PROGRESS = ["analyzing", "researching", "generating"];
const FAILED = ["failed", "error"];

/** How many slides this deck actually renders.
 *
 *  Not a stored number: most decks have no persisted `slide_order`, so the
 *  count comes from the same content-aware resolver the editor renders with.
 *  That keeps this figure equal to what the user sees when they open the deck.
 */
function slideCount(p: Project): number {
  try {
    return deckView(p).slides;
  } catch {
    return 0;
  }
}

/** Everything a card needs about one deck, resolved once. */
function deckView(p: Project) {
  const dc = (p as any).deckContent ?? (p as any).deck_content;
  const td = dc?.templateData ?? dc?.template_data;
  const type = (p as any).deckType ?? (p as any).deck_type;
  const order = td ? slideOrder(type, dc?.slideOrder ?? dc?.slide_order, td) : [];
  return {
    td,
    order,
    slides: order.length,
    typeLabel: deckTypeLabel(type),
    theme: getTheme((p as any).templateKey ?? (p as any).template_key ?? td?.theme_suggestion ?? DEFAULT_THEME_KEY),
    updated: relativeTime((p as any).updatedAt || (p as any).updated_at),
  };
}

function statusChip(status: string) {
  if (status === "ready") return { label: "Ready", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
  if (IN_PROGRESS.includes(status)) return { label: "Generating", cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500 animate-pulse" };
  if (FAILED.includes(status)) return { label: "Failed", cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" };
  return { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
}

function Stat({
  label, value, sub, icon, tone,
}: {
  label: string; value: string | number; sub: string; icon: React.ReactNode; tone: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200/80 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-slate-500">{label}</span>
        <span className={`flex h-6 w-6 items-center justify-center rounded-md border ${tone}`}>{icon}</span>
      </div>
      <div className="mt-1.5 text-[22px] font-bold leading-none tracking-tight text-slate-900 tabular-nums">
        {value}
      </div>
      <div className="mt-2 border-t border-slate-100 pt-1.5 text-[11px] text-slate-500">{sub}</div>
    </article>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ searchQuery?: string }>() || {};
  // The cards render real slides, so the deck faces have to be loaded here too.
  useEffect(() => { ensureDeckFonts(); }, []);
  const [sortOrder, setSortOrder] = useState<"recent" | "name" | "slides">("recent");
  const [tab, setTab] = useState<"all" | "ready" | "running" | "draft" | "failed">("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list({ pageSize: 30 }),
  });

  const projects = data?.data ?? [];

  const stats = useMemo(() => {
    const ready = projects.filter((p) => p.status === "ready");
    const running = projects.filter((p) => IN_PROGRESS.includes(p.status));
    const slides = ready.reduce((n, p) => n + slideCount(p), 0);
    const types = new Set(projects.map((p) => (p as any).deckType ?? (p as any).deck_type ?? "investor"));
    const failed = projects.filter((p) => FAILED.includes(p.status));
    return {
      total: projects.length,
      ready: ready.length,
      running: running.length,
      failed: failed.length,
      drafts: projects.length - ready.length - running.length - failed.length,
      slides,
      types: types.size,
      avg: ready.length ? Math.round(slides / ready.length) : 0,
    };
  }, [projects]);

  const queryText = (outletContext.searchQuery || "").trim().toLowerCase();

  const filtered = useMemo(() => {
    const list = projects.filter((p) => {
      if (tab === "ready" && p.status !== "ready") return false;
      if (tab === "running" && !IN_PROGRESS.includes(p.status)) return false;
      if (tab === "failed" && !FAILED.includes(p.status)) return false;
      if (tab === "draft" && (p.status === "ready" || IN_PROGRESS.includes(p.status) || FAILED.includes(p.status))) return false;
      if (!queryText) return true;
      const hay = [
        p.name,
        (p as any).companyUrl || (p as any).company_url,
        p.brandingData?.industry,
        deckTypeLabel((p as any).deckType ?? (p as any).deck_type),
      ];
      return hay.some((v) => (v || "").toLowerCase().includes(queryText));
    });
    return [...list].sort((a, b) => {
      if (sortOrder === "name") return a.name.localeCompare(b.name);
      if (sortOrder === "slides") return slideCount(b) - slideCount(a);
      const tA = new Date((a as any).updatedAt || (a as any).updated_at || 0).getTime();
      const tB = new Date((b as any).updatedAt || (b as any).updated_at || 0).getTime();
      return tB - tA;
    });
  }, [projects, queryText, sortOrder, tab]);

  const user = useCurrentUser();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5 p-5 lg:p-6">
      {/* ── Greeting ───────────────────────────────────────────────── */}
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
            Good {getGreeting()}, <span className="text-blue-600">{firstName}</span>
          </h1>
          <p className="mt-1 text-[12px] text-slate-500">
            {isLoading
              ? "Loading your decks…"
              : stats.total === 0
              ? "Create your first AI pitch deck to get started"
              : `${stats.total} pitch deck${stats.total !== 1 ? "s" : ""} in your workspace`}
          </p>
        </div>

        <Link
          to="/projects/new"
          className="btn-uiverse-fill self-start sm:self-auto shrink-0"
        >
          <Plus size={15} />
          <span>New Deck</span>
        </Link>
      </section>

      {/* ── Deck stats — every figure derived from the user's own decks ── */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Decks" value={stats.total}
          sub={stats.types === 1 ? "1 deck type" : `${stats.types} deck types`}
          icon={<Layers size={13} />} tone="border-blue-100 bg-blue-50 text-blue-600"
        />
        <Stat
          label="Ready" value={stats.ready}
          sub={stats.total ? `${Math.round((stats.ready / stats.total) * 100)}% of your decks` : "No decks yet"}
          icon={<CheckCircle2 size={13} />} tone="border-emerald-100 bg-emerald-50 text-emerald-600"
        />
        <Stat
          label="In progress" value={stats.running}
          sub={stats.running ? "Generating now" : "Nothing running"}
          icon={<Loader2 size={13} />} tone="border-amber-100 bg-amber-50 text-amber-600"
        />
        <Stat
          label="Slides" value={stats.slides}
          sub={stats.avg ? `${stats.avg} per ready deck` : "None generated yet"}
          icon={<FileText size={13} />} tone="border-slate-200 bg-slate-50 text-slate-600"
        />
      </section>

      {/* ── Deck grid ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Only offer a filter for a state the user actually has decks in. */}
            {([
              ["all", "All", stats.total],
              ["ready", "Ready", stats.ready],
              ["running", "In progress", stats.running],
              ["draft", "Drafts", stats.drafts],
              ["failed", "Failed", stats.failed],
            ] as const)
              .filter(([key, , n]) => key === "all" || n > 0)
              .map(([key, label, n]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    tab === key
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                  <span className={tab === key ? "text-white/60" : "text-slate-400"}>{n}</span>
                </button>
              ))}
          </div>
          <button
            onClick={() =>
              setSortOrder((p) => (p === "recent" ? "slides" : p === "slides" ? "name" : "recent"))
            }
            className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            Sort by:{" "}
            <strong className="font-semibold text-slate-700">
              {sortOrder === "recent" ? "Recent" : sortOrder === "slides" ? "Most slides" : "Name"}
            </strong>
            <ChevronDown size={13} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <HourglassLoader size={64} />
            <p className="text-[13px] font-medium text-slate-500">Loading your decks…</p>
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-6 text-center">
            <p className="text-[13px] font-semibold text-slate-800">Couldn't load your decks</p>
            <p className="mt-1 text-[12px] text-slate-500">Check your connection and refresh the page.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-[13px] font-semibold text-slate-800">
              {queryText ? "No decks match your search" : "No pitch decks yet"}
            </p>
            <p className="mt-1 text-[12px] text-slate-500">
              {queryText ? "Try a different name, website or deck type." : "Your generated decks will appear here."}
            </p>
            {!queryText && (
              <Link
                to="/projects/new"
                className="btn-uiverse-fill mt-4"
              >
                <Plus size={15} />
                <span>Create your first deck</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filtered.map((deck) => {
              const v = deckView(deck);
              const chip = statusChip(deck.status);
              const ready = deck.status === "ready" && !!v.td;

              return (
                <article
                  key={deck.id}
                  onClick={() => navigate(ready ? `/projects/${deck.id}/editor` : `/projects/${deck.id}`)}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md"
                >
                  {/* The deck's own first slide, in the deck's own template. */}
                  <div className="relative border-b border-slate-100 bg-slate-50">
                    {ready ? (
                      <FitSlide render={() => renderSlide(v.theme, v.td, 0, VIEW_CTX, v.order)} />
                    ) : (
                      <span
                        className="flex items-center justify-center bg-slate-50 text-[11px] font-medium text-slate-400"
                        style={{ width: "100%", aspectRatio: "16 / 9" }}
                      >
                        {FAILED.includes(deck.status)
                          ? "Generation failed"
                          : IN_PROGRESS.includes(deck.status)
                          ? "Generating…"
                          : "Not generated yet"}
                      </span>
                    )}

                    {/* A ready deck shows its own cover — only the exceptions
                        need calling out, so the grid stays quiet. */}
                    {deck.status !== "ready" && (
                      <span
                        className={`absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${chip.cls}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${chip.dot}`} />
                        {chip.label}
                      </span>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="line-clamp-2 min-h-[34px] text-[13px] font-semibold leading-snug text-slate-900 transition-colors group-hover:text-blue-600">
                      {deck.name}
                    </h3>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate text-slate-500">
                        {v.typeLabel}
                        {v.slides > 0 && <span className="text-slate-400"> · {v.slides} slides</span>}
                      </span>
                      <span className="shrink-0 text-slate-400">{v.updated}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
