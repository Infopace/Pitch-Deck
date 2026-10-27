import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Globe,
  ArrowRight,
  Sparkles,
  TrendingUp,
  BarChart3,
  Users,
  CheckCircle2,
  Download,
  Zap,
} from "lucide-react";
import { MintLogo } from "@/components/brand/MintLogo";
import "./HeroSection.css";

export default function HeroSection() {
  const navigate = useNavigate();
  const [promptText, setPromptText] = useState("");
  const [activeCard, setActiveCard] = useState<number>(1); // center card active by default

  const handleBuildDeck = (e?: React.FormEvent, preset?: string) => {
    if (e) e.preventDefault();
    const query = promptText.trim() || (preset ? `Build a ${preset} deck` : "");
    if (query) {
      navigate(`/register?prompt=${encodeURIComponent(query)}`);
    } else {
      navigate("/register");
    }
  };

  return (
    <section className="hero-c1-root">
      {/* Subtle light mesh background gradients matching the rest of the landing page */}
      <div className="hero-c1-ambient" aria-hidden="true" />
      <div className="hero-c1-grid" aria-hidden="true" />

      {/* ── TOP NAVBAR ── */}
      <header className="hero-c1-header">
        <Link to="/" className="hero-c1-logo" aria-label="Mint Home">
          <MintLogo variant={1} height={34} textColor="#0F172A" />
        </Link>

        <nav className="hero-c1-nav">
          <a href="#showcase">Live Deck</a>
          <a href="#features">How It Works</a>
          <a href="#templates">Templates</a>
          <a href="#comparison">Why Mint</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="hero-c1-nav-actions">
          <Link to="/login" className="c1-sign-in">Sign in</Link>
          <Link to="/register" className="c1-start-free">
            <span>Start free</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* ── CENTER HERO HERO CONTENT ── */}
      <div className="hero-c1-content">
        {/* Eyebrow Badge */}
        <div className="hero-c1-badge">
          <Sparkles size={13} className="text-blue-600" />
          <span>Autonomous AI Pitch Deck Generator</span>
        </div>

        {/* Main Headline */}
        <h1 className="hero-c1-title">
          The Deck That Closes <span className="hero-c1-gradient">The Round</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-c1-subtitle">
          Instantly generate professional, data-driven investor pitch decks with AI.
          <br className="hidden sm:inline" /> Input your website, Mint creates your winning presentation.
        </p>

        {/* Search / URL Intake Pill Bar */}
        <form onSubmit={handleBuildDeck} className="hero-c1-input-bar">
          <div className="c1-input-group">
            <Globe size={18} className="c1-input-icon" />
            <input
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Enter your company website URL (e.g. yourstartup.com)"
              className="c1-input"
            />
          </div>
          <button type="submit" className="c1-generate-btn">
            <span>Generate Deck</span>
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Quick architecture filter chips */}
        <div className="hero-c1-chips">
          <span className="chips-hint">Presets:</span>
          {["⚡ Investor Pitch", "🚀 YC Demo Day", "💼 Enterprise Sales", "📈 Series A"].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleBuildDeck(undefined, preset)}
              className="c1-chip"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* ── 3D FAN-OUT PRESENTATION SHOWCASE ── */}
        <div className="hero-c1-showcase-stage">
          <div
            className="hero-c1-fanout-deck"
            onMouseLeave={() => setActiveCard(1)}
          >

            {/* ── SLIDE 1: Market Size (TAM) (Left angled card) ── */}
            <div
              className={`fanout-card card-left ${activeCard === 0 ? "is-focused" : ""}`}
              onMouseEnter={() => setActiveCard(0)}
            >
              <div className="card-topbar">
                <div className="card-tag">
                  <BarChart3 size={11} className="text-emerald-600" />
                  <span>Market Opportunity</span>
                </div>
                <span className="card-slide-num">Slide 03</span>
              </div>

              <div className="card-body">
                <h4 className="card-title">Total Addressable Market (TAM)</h4>
                <p className="card-caption">Global clinical trial recruitment software</p>

                <div className="tam-hero-stat">
                  <span className="tam-label">Global Target</span>
                  <div className="tam-number">$3.8B</div>
                  <span className="tam-growth">+22% YoY CAGR</span>
                </div>

                {/* Bar chart graphic */}
                <div className="tam-bars-graphic">
                  <div className="bar-col">
                    <div className="bar-fill" style={{ height: "35%" }} />
                    <span className="bar-year">'23</span>
                  </div>
                  <div className="bar-col">
                    <div className="bar-fill" style={{ height: "48%" }} />
                    <span className="bar-year">'24</span>
                  </div>
                  <div className="bar-col">
                    <div className="bar-fill" style={{ height: "64%" }} />
                    <span className="bar-year">'25</span>
                  </div>
                  <div className="bar-col">
                    <div className="bar-fill" style={{ height: "82%" }} />
                    <span className="bar-year">'26</span>
                  </div>
                  <div className="bar-col highlight">
                    <div className="bar-fill" style={{ height: "100%" }} />
                    <span className="bar-year">'27</span>
                  </div>
                </div>

                <div className="card-footer-metric">
                  <span className="metric-chip">Serviceable Market: $960M</span>
                </div>
              </div>
            </div>

            {/* ── SLIDE 2: Projected Revenue (Center elevated hero card) ── */}
            <div
              className={`fanout-card card-center ${activeCard === 1 ? "is-focused" : ""}`}
              onMouseEnter={() => setActiveCard(1)}
            >
              <div className="card-topbar">
                <div className="card-tag">
                  <TrendingUp size={11} className="text-blue-600" />
                  <span>Financial Projection</span>
                </div>
                <span className="card-slide-num badge-pill">Slide 07 • Master</span>
              </div>

              <div className="card-body">
                <div className="center-header-row">
                  <div>
                    <h4 className="card-title">Projected Revenue Growth</h4>
                    <p className="card-caption">Multi-year ARR scaling model, site to enterprise tier</p>
                  </div>
                  <div className="center-live-pill">
                    <span className="live-dot" />
                    <span>Live Model</span>
                  </div>
                </div>

                {/* Financial KPI chips */}
                <div className="financial-kpi-row">
                  <div className="kpi-box">
                    <span className="kpi-label">Projected ARR</span>
                    <div className="kpi-val">$17M</div>
                    <span className="kpi-badge text-emerald-600">6.1x Growth</span>
                  </div>
                  <div className="kpi-box">
                    <span className="kpi-label">Target Margin</span>
                    <div className="kpi-val">80%</div>
                    <span className="kpi-badge text-blue-600">SaaS Benchmark</span>
                  </div>
                  <div className="kpi-box">
                    <span className="kpi-label">Net Retention</span>
                    <div className="kpi-val">121%</div>
                    <span className="kpi-badge text-emerald-600">Expansion</span>
                  </div>
                </div>

                {/* Curved growth line visualization */}
                <div className="financial-chart-container">
                  <svg className="growth-curve-svg" viewBox="0 0 340 90" fill="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="50%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 10 75 Q 90 70, 160 50 T 330 14 L 330 90 L 10 90 Z"
                      fill="url(#chartGrad)"
                    />
                    <path
                      className="growth-line"
                      pathLength={1}
                      d="M 10 75 Q 90 70, 160 50 T 330 14"
                      stroke="url(#strokeGrad)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* Data point glowing circles */}
                    <circle cx="10" cy="75" r="4" fill="#3B82F6" />
                    <circle cx="160" cy="50" r="4" fill="#10B981" />
                    <circle cx="330" cy="14" r="5" fill="#059669" stroke="#ffffff" strokeWidth="2" />
                  </svg>
                </div>

                <div className="card-center-footer">
                  <div className="footer-export-info">
                    <Download size={13} className="text-slate-400" />
                    <span>Real vector chart in PowerPoint (.pptx)</span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-slate-500">
                    Series A Target
                  </span>
                </div>
              </div>
            </div>

            {/* ── SLIDE 3: Executive Team (Right angled card) ── */}
            <div
              className={`fanout-card card-right ${activeCard === 2 ? "is-focused" : ""}`}
              onMouseEnter={() => setActiveCard(2)}
            >
              <div className="card-topbar">
                <div className="card-tag">
                  <Users size={11} className="text-indigo-600" />
                  <span>Leadership Team</span>
                </div>
                <span className="card-slide-num">Slide 11</span>
              </div>

              <div className="card-body">
                <h4 className="card-title">Founders & Leadership</h4>
                <p className="card-caption">Operators who lived the enrollment bottleneck firsthand</p>

                {/* Team member cards */}
                <div className="team-members-list">
                  <div className="team-member-card">
                    <div className="team-avatar avatar-1">NM</div>
                    <div className="team-meta">
                      <span className="team-name">Nina Markovic</span>
                      <span className="team-role">CEO & Co-Founder</span>
                      <span className="team-prev">Ex-IQVIA • Trial Ops</span>
                    </div>
                  </div>

                  <div className="team-member-card">
                    <div className="team-avatar avatar-2">JT</div>
                    <div className="team-meta">
                      <span className="team-name">Jonah Teller</span>
                      <span className="team-role">CTO & Co-Founder</span>
                      <span className="team-prev">Ex-Epic • EHR Integrations</span>
                    </div>
                  </div>
                </div>

                <div className="card-team-trust">
                  <div className="trust-pill">
                    <Zap size={11} className="text-amber-500" />
                    <span>Advised by former ops chiefs at IQVIA & Flatiron Health</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
