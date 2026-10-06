export interface User {
  id: string;
  email: string;
  name: string;
  role: "free" | "pro" | "enterprise" | "admin";
  is_active: boolean;
  is_verified: boolean;
  avatar_url?: string;
}

/** The `projects.branding_data` blob.
 *
 * It is NOT just branding: the founder's intake answers are written here on
 * create, then the AI's inferred branding is merged on top after generation
 * (see backend `endpoints/projects.py` — `{**_user_input, **branding_data}`).
 * The axios interceptor camel-cases responses, but values that arrived from the
 * founder's own payload keep their snake_case spelling, so the fields that come
 * from both directions are declared in both cases.
 */
export interface BrandingData {
  // ── AI-inferred branding ────────────────────────────────────────────────
  companyName?: string;
  tagline?: string;
  industry?: string;
  primaryColor?: string;
  secondaryColor?: string;
  description?: string;

  // ── Founder intake, carried through in the same dict ────────────────────
  fundingStage?: string;
  funding_stage?: string;
  askAmountUsd?: number;
  ask_amount_usd?: number;
  businessModel?: string;
  business_model?: string;
}

/** A single researched fact's provenance, as the backend's research pass tags it
 * (see `_build_research_prompt` in `app/agents/master/master_agent.py`):
 * HIGH = found via live search or the company's own site, MEDIUM = reasoned
 * from the industry, LOW = a weak guess. */
export type ResearchConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface ResearchFounder {
  name: string;
  title: string;
  education?: string;
  prior?: string;
  credential?: string;
  source?: string;
  confidence?: ResearchConfidence;
}

export interface ResearchCompetitor {
  name: string;
  funding?: string;
  weakness?: string;
  confidence?: ResearchConfidence;
}

export interface ResearchMarket {
  tam?: string;
  tam_source?: string;
  tam_description?: string;
  sam?: string;
  sam_description?: string;
  som?: string;
  som_description?: string;
  cagr?: string;
  cagr_source?: string;
  cagr_period?: string;
  growth_drivers?: string[];
}

export interface ResearchFunding {
  total?: string;
  rounds?: Array<{ stage: string; amount: string; date: string; investors: string[] }>;
  valuation?: string;
  status?: string;
}

/** The `projects.research_data` blob — what MasterDeckAgent's research pass
 * found, with per-fact confidence and the source URLs it was grounded in. */
export interface ResearchData {
  confidence?: ResearchConfidence;
  sources?: string[];
  founders?: ResearchFounder[];
  company_facts?: {
    founded_year?: string;
    headquarters?: string;
    headcount?: string;
    operations?: string;
    milestones?: string[];
  };
  funding?: ResearchFunding;
  competitors?: ResearchCompetitor[];
  market?: ResearchMarket;
}

export interface DeckSlide {
  id: string;
  type?: string;
  title?: string;
  content?: string;
}

export interface DeckContent {
  slides?: DeckSlide[];
  /** Rich payload for the templated renderer (deck_content.template_data). */
  templateData?: Record<string, unknown>;
  /** Which deck type generated this. */
  deckType?: string;
  /** The section sequence this deck was actually generated against.
   * Authoritative over the registry default — see deckTypes.ts slideOrder(). */
  slideOrder?: string[];
}

export interface Project {
  id: string;
  userId?: string;
  user_id?: string;
  name: string;
  companyUrl?: string;
  company_url?: string;
  status: "draft" | "analyzing" | "researching" | "generating" | "ready" | "error";
  deckType?: string;
  deck_type?: string;
  templateKey?: string | null;
  template_key?: string | null;
  assets?: Record<string, unknown> | null;
  brandingData?: BrandingData;
  branding_data?: Record<string, unknown>;
  researchData?: ResearchData;
  research_data?: ResearchData;
  deckContent?: DeckContent;
  deck_content?: Record<string, unknown>;
  errorMessage?: string;
  error_message?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface JobProgress {
  jobId?: string;
  job_id?: string;
  projectId?: string;
  project_id?: string;
  status: "queued" | "running" | "completed" | "failed";
  currentStep?: string;
  current_step?: string;
  stepProgress?: number;
  step_progress?: number;
  totalProgress?: number;
  total_progress?: number;
  message: string;
  error?: string | null;
  startedAt?: string | null;
  started_at?: string | null;
  completedAt?: string | null;
  completed_at?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize?: number;
  page_size?: number;
  hasNextPage?: boolean;
  has_next_page?: boolean;
}
