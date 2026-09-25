import React from "react";
import { Link } from "react-router-dom";
import {
  Globe,
  Clock3,
  ArrowUpRight,
  Layers3,
  Lightbulb,
  Building2,
  BarChart3,
  Users,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import type { BrandingData, Project } from "@/types";

export type DeckGraphicType = "growth" | "idea" | "banking" | "analytics" | "people";

export const graphicMap: Record<
  DeckGraphicType,
  {
    icon: LucideIcon;
    wrapper: string;
    iconColor: string;
    dots: [string, string];
  }
> = {
  growth: {
    icon: Layers3,
    wrapper: "from-emerald-50 via-green-50 to-cyan-50",
    iconColor: "text-emerald-500",
    dots: ["#2563EB", "#38BDF8"],
  },
  idea: {
    icon: Lightbulb,
    wrapper: "from-purple-50 via-violet-50 to-indigo-50",
    iconColor: "text-violet-500",
    dots: ["#1E293B", "#64748B"],
  },
  banking: {
    icon: Building2,
    wrapper: "from-blue-50 via-sky-50 to-indigo-50",
    iconColor: "text-blue-500",
    dots: ["#2563EB", "#38BDF8"],
  },
  analytics: {
    icon: BarChart3,
    wrapper: "from-purple-50 via-fuchsia-50 to-indigo-50",
    iconColor: "text-purple-500",
    dots: ["#7C3AED", "#C084FC"],
  },
  people: {
    icon: Users,
    wrapper: "from-emerald-50 via-teal-50 to-cyan-50",
    iconColor: "text-emerald-500",
    dots: ["#0D9488", "#10B981"],
  },
};

export function resolveDeckType(project: Project, index?: number): DeckGraphicType {
  const name = (project.name || "").toLowerCase().trim();
  const deckType = (project.deckType || project.deck_type || "").toLowerCase();
  const industry = ((project.brandingData as BrandingData | undefined)?.industry || "").toLowerCase();
  const text = `${name} ${deckType} ${industry}`;

  // 1. Exact matches for the user's specific decks
  if (name.includes("cydi")) return "analytics";
  if (name.includes("xxxxxx")) return "idea";
  if (name.includes("invest")) return "growth";
  if (name.includes("sales") || name.includes("razorpay")) return "banking";
  if (name.includes("hiyr") || name.includes("hiring")) return "people";

  // 2. Keyword based matching
  if (text.includes("analytic") || text.includes("data") || text.includes("ai-powered") || text.includes("metric") || text.includes("chart")) {
    return "analytics";
  }
  if (text.includes("hire") || text.includes("people") || text.includes("talent") || text.includes("recruit") || text.includes("team")) {
    return "people";
  }
  if (text.includes("bank") || text.includes("fintech") || text.includes("razorpay") || text.includes("finance") || text.includes("payment")) {
    return "banking";
  }
  if (text.includes("idea") || text.includes("consult") || text.includes("advisory") || text.includes("strategy") || text.includes("creative")) {
    return "idea";
  }
  if (text.includes("growth") || text.includes("scale") || text.includes("market") || text.includes("invest")) {
    return "growth";
  }

  // 3. Cycle fallback so consecutive cards always have different logos
  const cycle: DeckGraphicType[] = ["growth", "idea", "banking", "analytics", "people"];
  if (index !== undefined) {
    return cycle[index % cycle.length];
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return cycle[Math.abs(hash) % cycle.length];
}

export function DeckGraphic({ type }: { type: DeckGraphicType }) {
  const graphic = graphicMap[type] || graphicMap.idea;
  const Icon = graphic.icon;

  return (
    <div
      className={`
        relative h-[76px] overflow-hidden rounded-xl
        bg-gradient-to-br ${graphic.wrapper}
      `}
    >
      <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full bg-white/40 pointer-events-none" />
      <div className="absolute -bottom-10 left-20 h-28 w-28 rounded-full bg-white/30 pointer-events-none" />

      <div className="absolute left-5 top-4">
        <Icon
          size={42}
          strokeWidth={1.8}
          className={graphic.iconColor}
        />
      </div>

      <div className="absolute right-5 top-5 flex gap-1 opacity-30 text-slate-700">
        <span className="h-2 w-2 rounded-full bg-current" />
        <span className="h-2 w-2 rounded-full bg-current" />
        <span className="h-2 w-2 rounded-full bg-current" />
      </div>
    </div>
  );
}

interface Props {
  project: Project;
  deckTypeOverride?: DeckGraphicType;
  index?: number;
}

export function ProjectCard({ project, deckTypeOverride, index }: Props) {
  const companyUrl = (project.companyUrl ?? project.company_url ?? "").replace(/^https?:\/\//, "");
  const branding = (project.brandingData || project.branding_data || {}) as BrandingData;
  const updatedAt = project.updatedAt ?? project.updated_at ?? project.createdAt ?? project.created_at;

  const category = branding.industry || project.deckType || "Consultancy";
  const type = deckTypeOverride || resolveDeckType(project, index);
  const graphic = graphicMap[type] || graphicMap.idea;

  let updated = "recently";
  try {
    if (updatedAt) {
      updated = formatDistanceToNow(new Date(updatedAt), { addSuffix: true });
    }
  } catch {
    updated = "recently";
  }

  const isReady = project.status === "ready";
  const isInProgress = ["analyzing", "researching", "generating"].includes(project.status);

  // Colors for category indicator dots
  const color1 = branding.primaryColor || graphic.dots[0];
  const color2 = branding.secondaryColor || graphic.dots[1];

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group flex flex-col h-full w-full text-left no-underline"
    >
      <div
        className="
          overflow-hidden rounded-2xl border border-slate-200/80
          bg-white p-4 shadow-sm transition-all duration-300
          hover:-translate-y-1 hover:border-blue-200
          hover:shadow-xl h-full flex flex-col justify-between flex-1
        "
      >
        <div>
          {/* Top Graphic Banner with Status Badge */}
          <div className="relative">
            <DeckGraphic type={type} />

            {isReady ? (
              <span
                className="
                  absolute right-3 top-3 rounded-full
                  border border-emerald-200 bg-emerald-50
                  px-3 py-1 text-xs font-semibold text-emerald-600 shadow-2xs
                "
              >
                Ready
              </span>
            ) : isInProgress ? (
              <span
                className="
                  absolute right-3 top-3 rounded-full
                  border border-amber-200 bg-amber-50
                  px-3 py-1 text-xs font-semibold text-amber-600 shadow-2xs
                "
              >
                In progress
              </span>
            ) : (
              <span
                className="
                  absolute right-3 top-3 rounded-full
                  border border-slate-200 bg-slate-100
                  px-3 py-1 text-xs font-semibold text-slate-600 shadow-2xs
                "
              >
                Draft
              </span>
            )}
          </div>

          <div className="px-1 pt-4">
            <h3 className="text-xl font-bold tracking-tight text-[#101a36] truncate">
              {project.name}
            </h3>

            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Globe size={15} className="flex-shrink-0 text-slate-400" />
              <span
                className={`truncate ${
                  !companyUrl || companyUrl === "no website"
                    ? "italic text-slate-400"
                    : "text-slate-500"
                }`}
              >
                {companyUrl || "no website"}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 min-w-0">
              <span className="flex gap-0.5 flex-shrink-0">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: color1 }}
                />
                <span
                  className="h-3 w-3 -ml-1 rounded-full ring-1 ring-white"
                  style={{ backgroundColor: color2 }}
                />
              </span>

              <span className="truncate text-slate-600">{category}</span>
            </div>
          </div>
        </div>

        <div className="px-1 mt-auto">
          <div className="my-4 h-px bg-slate-100" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock3 size={15} className="flex-shrink-0 text-slate-400" />
              <span>{updated}</span>
            </div>

            <ArrowUpRight
              size={20}
              className="
                text-slate-400 transition-transform
                group-hover:-translate-y-0.5
                group-hover:translate-x-0.5
                group-hover:text-blue-600
              "
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
