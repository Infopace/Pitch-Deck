import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  Globe,
  Download,
  TrendingUp,
  Layers,
  Zap,
  CheckCircle2,
  FileSpreadsheet,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { MintLogo } from "@/components/brand/MintLogo";
import "./HeroSection.css";

const DECK_PREVIEWS = [
  {
    id: "market",
    tabLabel: "01 Market TAM",
    tag: "MARKET OPPORTUNITY",
    title: "A $28.4B Market Reaching Inflection Point",
    stats: [
      { label: "Total Addressable Market", val: "$28.4B", change: "+24.2% YoY" },
      { label: "Serviceable Market (SAM)", val: "$7.2B", change: "Enterprise" },
      { label: "Target Segment Capture", val: "$620M", change: "Year 3 Horizon" },
    ],
    highlight: "Autonomous synthesis from 14 industry analyst sources.",
    visualType: "bars",
  },
  {
    id: "problem",
    tabLabel: "02 The Problem",
    tag: "THE CORE PROBLEM",
    title: "Founders Waste 50+ Hours Building Decks from Scratch",
    stats: [
      { label: "Average Time Spent", val: "54 hrs", change: "Per pitch round" },
      { label: "Agency Retainer Cost", val: "$8,500+", change: "Standard fee" },
      { label: "Narrative Rejection Rate", val: "72%", change: "Weak data backing" },
    ],
    highlight: "Unstructured messaging and unverifiable stats kill investor conviction early.",
    visualType: "problem",
  },
  {
    id: "solution",
    tabLabel: "03 Solution",
    tag: "THE MINT PLATFORM",
    title: "From Website to Investor-Grade Deck in 60 Seconds",
    stats: [
      { label: "Generation Speed", val: "< 60s", change: "Full 15 slides" },
      { label: "Research Coverage", val: "100%", change: "Live verified facts" },
      { label: "Native PPTX Export", val: "Editable", change: "Zero lock-in" },
    ],
    highlight: "Dual-pass intelligence: Deep site crawl + automated competitive landscape.",
    visualType: "solution",
  },
  {
    id: "traction",
    tabLabel: "04 Traction",
    tag: "VALIDATION & TRACTION",
    title: "Exponential Growth Backed by Real Unit Economics",
    stats: [
      { label: "Monthly Recurring Revenue", val: "$184K", change: "+42% MoM" },
      { label: "Net Revenue Retention", val: "138%", change: "Zero churn cohort" },
      { label: "Customer Acquisition Cost", val: "$142", change: "3.8mo payback" },
    ],
    highlight: "Charts and financial models export as real PowerPoint vector shapes.",
    visualType: "traction",
  },
];

const DECK_TYPES_PILLS = [
  "⚡ Investor Pitch",
  "🚀 YC Demo Day",
  "💼 Enterprise Sales",
  "📈 Series A Round",
  "🔥 Product Launch",
];

export default function HeroSection() {
  const navigate = useNavigate();
  const [promptText, setPromptText] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  const handleBuildDeck = (e?: React.FormEvent, presetType?: string) => {
    if (e) e.preventDefault();
    const query = promptText.trim() || (presetType ? `Build an ${presetType} deck` : "");
    if (query) {
      navigate(`/register?prompt=${encodeURIComponent(query)}`);
    } else {
      navigate("/register");
    }
  };

  const currentPreview = DECK_PREVIEWS[activeTab];

  return (
    <section className="hero-root">
      {/* Dynamic atmospheric lighting */}
      <div className="hero-mesh-glow" aria-hidden="true" />
      <div className="hero-grid-pattern" aria-hidden="true" />

      {/* ── TOP NAVBAR ── */}
      <header className="hero-header">
        <Link to="/" className="hero-brand" aria-label="Mint Home">
          <MintLogo variant={1} height={36} textColor="#ffffff" />
        </Link>

        <nav className="hero-nav">
          <a href="#showcase" className="nav-item">Live Deck</a>
          <a href="#features" className="nav-item">How It Works</a>
          <a href="#templates" className="nav-item">Templates</a>
          <a href="#comparison" className="nav-item">Why Mint</a>
          <a href="#faq" className="nav-item">FAQ</a>
        </nav>

        <div className="hero-actions">
          <Link to="/login" className="btn-signin">Sign In</Link>
          <Link to="/register" className="btn-start-primary">
            <span>Start Free</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* ── HERO HERO CONTENT CONTAINER ── */}
      <div className="hero-container">
        {/* LEFT COLUMN: Narrative & Action Console */}
        <div className="hero-left-content">
          <div className="hero-badge">
            <span className="badge-pulse">
              <span className="pulse-dot" />
            </span>
            <Sparkles size={13} className="badge-sparkle" />
            <span>Autonomous Pitch Deck Generator 2.0</span>
          </div>

          <h1 className="hero-heading">
            Turn your website or idea into an{" "}
            <span className="hero-highlight-text">investor-ready deck.</span>
          </h1>

          <p className="hero-subheading">
            Paste your company URL. Mint conducts deep market research,
            structures the narrative, and creates a tailored, data-backed presentation — ready to customize and export to PowerPoint.
          </p>

          {/* Interactive Input Intake Bar */}
          <form onSubmit={handleBuildDeck} className="hero-intake-card">
            <div className="intake-field">
              <Globe className="intake-icon" size={19} />
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="yourcompany.com — or enter your startup idea"
                className="intake-input"
              />
            </div>
            <button type="submit" className="intake-submit-btn">
              <Zap size={16} />
              <span>Generate Deck</span>
            </button>
          </form>

          {/* Quick preset selector chips */}
          <div className="hero-preset-chips">
            <span className="chips-label">Popular architectures:</span>
            <div className="chips-list">
              {DECK_TYPES_PILLS.map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => handleBuildDeck(undefined, pill)}
                  className="preset-chip"
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {/* Trust Value Proof Items */}
          <div className="hero-proof-row">
            <div className="proof-pill">
              <CheckCircle2 size={15} className="proof-check" />
              <span>13 Deck Types</span>
            </div>
            <div className="proof-pill">
              <CheckCircle2 size={15} className="proof-check" />
              <span>Live Market Research</span>
            </div>
            <div className="proof-pill">
              <CheckCircle2 size={15} className="proof-check" />
              <span>Editable .PPTX Export</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive 3D Deck Studio Showcase */}
        <div className="hero-right-showcase">
          <div className="deck-showcase-wrapper">
            {/* Ambient card back glow */}
            <div className="deck-ambient-glow" />

            {/* Floating Live Indicator Badge */}
            <div className="floating-metric-badge top-right">
              <div className="metric-glow-dot" />
              <div className="metric-text-group">
                <span className="metric-title">Gemini 2.5 Multi-Agent</span>
                <span className="metric-val">14 market sources verified</span>
              </div>
            </div>

            {/* Floating Export Format Badge */}
            <div className="floating-metric-badge bottom-left">
              <Download size={15} className="metric-icon" />
              <div className="metric-text-group">
                <span className="metric-title">PowerPoint (.pptx)</span>
                <span className="metric-val">Native vector shapes</span>
              </div>
            </div>

            {/* Main Interactive Studio Slide Frame */}
            <div className="deck-preview-card">
              {/* Studio window chrome bar */}
              <div className="deck-card-topbar">
                <div className="deck-dots">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </div>
                <div className="deck-file-title">
                  <span>Apex Robotics — Series A Master.pptx</span>
                </div>
                <div className="deck-status-pill">
                  <Layers size={12} />
                  <span>40 Themes</span>
                </div>
              </div>

              {/* Slide Interactive Navigation Tabs */}
              <div className="deck-slide-tabs">
                {DECK_PREVIEWS.map((tab, idx) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`slide-tab-btn ${activeTab === idx ? "active" : ""}`}
                  >
                    {tab.tabLabel}
                  </button>
                ))}
              </div>

              {/* Active Slide Canvas Visual */}
              <div className="slide-canvas">
                <div className="slide-content-header">
                  <span className="slide-category-tag">{currentPreview.tag}</span>
                  <h3 className="slide-main-title">{currentPreview.title}</h3>
                </div>

                {/* 3 Metric Cards Grid */}
                <div className="slide-metrics-grid">
                  {currentPreview.stats.map((st, i) => (
                    <div key={i} className="slide-stat-card">
                      <span className="stat-label">{st.label}</span>
                      <div className="stat-number">{st.val}</div>
                      <span className="stat-change">{st.change}</span>
                    </div>
                  ))}
                </div>

                {/* Interactive Graphic Representation */}
                <div className="slide-visual-container">
                  <div className="visual-graphic-bar">
                    <div className="graphic-bar-fill" style={{ width: `${80 + activeTab * 5}%` }} />
                  </div>
                  <div className="slide-footer-intel">
                    <div className="intel-pill">
                      <ShieldCheck size={13} className="text-emerald-400" />
                      <span>{currentPreview.highlight}</span>
                    </div>
                    <span className="intel-count">Slide {activeTab + 1} of 14</span>
                  </div>
                </div>
              </div>

              {/* Bottom Interactive Control */}
              <div className="deck-card-footer">
                <span className="footer-theme-info">
                  Theme: <strong>Emerald Obsidian</strong> • Slide 16:9 Wide
                </span>
                <button
                  type="button"
                  onClick={() => handleBuildDeck(undefined, "investor")}
                  className="footer-edit-btn"
                >
                  <span>Build This Deck</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── REAL CAPABILITY STATUS BANNER ── */}
      <div className="hero-metrics-ribbon">
        <div className="ribbon-inner">
          <div className="ribbon-item">
            <span className="ribbon-number">13</span>
            <span className="ribbon-desc">Deck Architectures</span>
          </div>
          <div className="ribbon-divider" />
          <div className="ribbon-item">
            <span className="ribbon-number">40+</span>
            <span className="ribbon-desc">Curated Theme Designs</span>
          </div>
          <div className="ribbon-divider" />
          <div className="ribbon-item">
            <span className="ribbon-number">&lt; 60s</span>
            <span className="ribbon-desc">Average Generation Speed</span>
          </div>
          <div className="ribbon-divider" />
          <div className="ribbon-item">
            <span className="ribbon-number">.pptx</span>
            <span className="ribbon-desc">Native PowerPoint Export</span>
          </div>
        </div>
      </div>
    </section>
  );
}
