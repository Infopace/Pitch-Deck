import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MintLogo } from "@/components/brand/MintLogo";
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
        <Link to="/" className="hero-logo" aria-label="Mint Home">
          <MintLogo variant={1} height={34} textColor="#ffffff" />
        </Link>

        <nav className="hero-nav-links">
          <a href="#showcase">Live deck</a>
          <a href="#features">How it works</a>
          <a href="#templates">Templates</a>
          <a href="#comparison">Why Mint</a>
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
            Paste your website. Mint researches your company and market,
            then writes the deck —<br />ready for you to edit, restyle and take
            to PowerPoint.
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
                <path d="M10 2l1.5 3.5L15 7l-2.5 2.5.5 3.5L10 11.5 7 13l.5-3.5L5 7l3.5-1.5L10 2z" fill="#ffffff" />
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
              Thirteen deck types
            </div>
            <div className="hero-check-item">
              <svg viewBox="0 0 16 16" fill="none" width="15" height="15">
                <path d="M3 8l3.5 3.5L13 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              PowerPoint export
            </div>
            <div className="hero-check-item">
              <svg viewBox="0 0 16 16" fill="none" width="15" height="15">
                <path d="M3 8l3.5 3.5L13 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Every slide editable
            </div>
          </div>
        </div>

        {/* RIGHT: handwritten annotation floats over the section's
             full-bleed background photo. */}
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

      {/* ── CAPABILITY BAR ──
           Was a "TRUSTED BY FOUNDERS" row of Stripe / Airbnb / Notion / OpenAI
           / Make logos, which asserted customers the product does not have.
           These are verifiable facts about what it actually does. ── */}
      <div className="hero-trust-bar">
        <span className="trust-label">WHAT YOU GET</span>
        <div className="trust-logos">
          <span className="trust-logo">13 deck types</span>
          <span className="trust-logo">40 designs</span>
          <span className="trust-logo">Live market research</span>
          <span className="trust-logo">Edit every slide</span>
          <span className="trust-logo">PowerPoint export</span>
        </div>
      </div>
    </section>
  );
}
