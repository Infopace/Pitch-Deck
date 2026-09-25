import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./HeroSection.css";

export default function HeroSection() {
  const navigate = useNavigate();
  const [promptText, setPromptText] = useState("");

  const handleBuildDeck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = promptText.trim();
    if (query) {
      navigate(`/register?prompt=${encodeURIComponent(query)}`);
    } else {
      navigate("/register");
    }
  };

  return (
    <section className="hero">
      {/* Dark navy gradient overlay — heavy left, fades right so image shows through */}
      <div className="hero-overlay" aria-hidden="true" />

      {/* ── TOP NAVBAR ── */}
      <header className="hero-navbar">
        <Link to="/" className="hero-logo">
          <svg className="hero-logo-icon" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L8 8H4l4 4-1.5 6L12 15l5.5 3L16 12l4-4h-4L12 2z" fill="#ffffff" />
          </svg>
          <div className="hero-logo-text">
            <span className="hero-logo-mark">iPRENEUR</span>
            <span className="hero-logo-sub">Startup Accelerator</span>
          </div>
        </Link>

        <nav className="hero-nav-links">
          <a href="#showcase">Live deck</a>
          <a href="#features">How it works</a>
          <a href="#templates">Templates</a>
          <a href="#comparison">Why iPreneur</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="hero-nav-actions">
          <Link to="/login" className="hero-sign-in">Sign in</Link>
          <Link to="/register" className="hero-start-free">Start free</Link>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <div className="hero-main">
        {/* LEFT: TEXT + INPUT */}
        <div className="hero-left">
          <div className="hero-eyebrow">
            <span className="eyebrow-line" />
            FOR AMBITIOUS FOUNDERS
          </div>

          <h1 className="hero-title">
            A clearer story<br />
            for a <span className="hero-gradient-text">bigger tomorrow.</span>
          </h1>

          <p className="hero-description">
            iPreneur turns your company into a powerful pitch deck —<br />
            so you can focus on what's next.
          </p>

          {/* Input row */}
          <form onSubmit={handleBuildDeck} className="hero-input-row">
            <div className="hero-input-wrap">
              <svg className="input-icon" viewBox="0 0 20 20" fill="none">
                <path d="M13 10a3 3 0 11-6 0 3 3 0 016 0z" stroke="#94a3b8" strokeWidth="1.5" />
                <path d="M10 13v4M10 3v4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M3 10h4M13 10h4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="yourcompany.com — or describe your startup"
                className="hero-input"
              />
            </div>
            <button type="submit" className="hero-build-btn">
              <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                <path d="M10 2l1.5 3.5L15 7l-2.5 2.5.5 3.5L10 11.5 7 13l.5-3.5L5 7l3.5-1.5L10 2z" fill="#000000" />
              </svg>
              Build my deck →
            </button>
          </form>

          {/* Checklist */}
          <div className="hero-checklist">
            <div className="hero-check-item">
              <svg viewBox="0 0 16 16" fill="none" width="15" height="15">
                <path d="M3 8l3.5 3.5L13 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Seven deck types
            </div>
            <div className="hero-check-item">
              <svg viewBox="0 0 16 16" fill="none" width="15" height="15">
                <path d="M3 8l3.5 3.5L13 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              PowerPoint and PDF export
            </div>
            <div className="hero-check-item">
              <svg viewBox="0 0 16 16" fill="none" width="15" height="15">
                <path d="M3 8l3.5 3.5L13 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Every slide editable
            </div>
          </div>
        </div>

        {/* RIGHT: handwritten annotation floats over the image */}
        <div className="hero-right">
          <div className="hero-annotation">
            <div className="annotation-text">
              Ideas today.<br />
              Impact tomorrow.
            </div>
            {/* Arrow curving down-left */}
            <svg className="annotation-arrow" viewBox="0 0 70 55" fill="none">
              <path
                d="M55 6 C38 8, 20 20, 8 44"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M8 44 L18 40 L11 33"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ── TRUST BAR ── */}
      <div className="hero-trust-bar">
        <span className="trust-label">TRUSTED BY FOUNDERS</span>
        <div className="trust-logos">
          <span className="trust-logo trust-stripe">stripe</span>
          <span className="trust-logo trust-airbnb">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 4.8c1.5 0 2.7 1.2 2.7 2.7S13.5 10.2 12 10.2 9.3 9 9.3 7.5 10.5 4.8 12 4.8zm4.8 13.8H7.2v-.6c0-2.6 2.2-4.8 4.8-4.8s4.8 2.2 4.8 4.8v.6z"/></svg>
            airbnb
          </span>
          <span className="trust-logo trust-notion">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z"/></svg>
            Notion
          </span>
          <span className="trust-logo trust-openai">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0L4.1 14.412a4.5 4.5 0 0 1-1.761-6.517zm16.597 3.855l-5.843-3.369 2.02-1.164a.08.08 0 0 1 .071 0l4.724 2.727a4.5 4.5 0 0 1-.676 8.123v-5.68a.79.79 0 0 0-.296-.637zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.723-2.727a4.5 4.5 0 0 1 6.679 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>
            OpenAI
          </span>
          <span className="trust-logo trust-make">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9.5 3.5L1 12l8.5 8.5 1.5-1.5L3 12l8-8-1.5-1.5zm5 0L13 5l8 7-8 8 1.5 1.5L23 12 14.5 3.5z"/></svg>
            make
          </span>
        </div>
      </div>
    </section>
  );
}
