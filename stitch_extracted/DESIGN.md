---
name: Venture Studio Executive
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002114'
  on-tertiary-container: '#069669'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  metric-kpi:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system establishes an institutional yet kinetic venture capital and startup accelerator identity tailored for founders and portfolio directors on mobile. The aesthetic blends **Modern Corporate VC** with **Tactile Glassmorphism**—delivering the crisp precision of a Bloomberg Terminal distilled into the high-end consumer polish of Stripe and Linear. 

The emotional posture is authoritative, decisive, and calm under high velocity. Visual noise is stripped away; every stroke, badge, and metric exists to convey status, progress, and financial traction at a glance. We move away from generic flat dashboards into layered depth featuring luminous tint washes, hairline borders with subtle alpha transparency, razor-sharp typographic hierarchy, and tactile micro-interactions built for one-handed mobile triage.

## Colors

The palette is engineered around high-contrast slate anchors paired with vibrant semantic accents:

- **Primary (`#0F172A`)**: Deep Obsidian Navy. Used for core typography, primary interactive states, and anchored brand marks. Delivers commanding visual weight without the harshness of pure black.
- **Secondary (`#2563EB`)**: Hyper-Cobalt. Used for primary calls-to-action, active deck states, pipeline highlights, and focal interactive elements.
- **Tertiary (`#059669`)**: Emerald Alpha. Used for positive financial trajectory, ARR indicators, and "Ready to Pitch" accelerator statuses.
- **Neutral (`#64748B`)**: Slate Cadence. Delivers subdued metadata, card headers, time-ago stamps, and secondary copy.

### Semantic & Surface Spectrum
- **Canvas Base**: `#F8FAFC` (ultra-clean off-white canvas with 0.5% slate undertone).
- **Surface Elevation 1 (Cards)**: `#FFFFFF` with `rgba(15, 23, 42, 0.04)` subtle border definition.
- **Status Soft Emerald**: Surface `#ECFDF5`, Border `#A7F3D0`, Text `#065F46`.
- **Status Soft Amber**: Surface `#FFFBEB`, Border `#FDE68A`, Text `#92400E` (for in-review and draft decks).
- **Status Soft Violet**: Surface `#F5F3FF`, Border `#DDD6FE`, Text `#5B21B6` (for pipeline velocity metrics).

## Typography

Typography pairs geometric distinction with editorial utility. **Plus Jakarta Sans** leads all display headlines, numerical stat points, and component labels, bringing sculpted, modern neo-grotesque authority. **Inter** powers all descriptive copy, subheadings, and dense pitch metadata, providing optimal legibility at micro sizes on retina displays.

- **KPI Figures (`metric-kpi`)**: High-density numerical tracking with tight negative letter-spacing for large-scale revenue metrics (`$4.6M`, `12 Decks`).
- **Deck Titles (`headline-md`)**: Direct, ink-heavy slate titles that immediately establish company identification.
- **Labels & Badges (`label-sm`)**: Uppercase optical weight with open tracking (`+0.04em`) to ensure status readouts are legible in peripheral vision.

## Layout & Spacing

The layout is built on a fluid, edge-to-edge mobile-first discipline adapting to an 8pt architectural rhythm:

- **Mobile Canvas**: 16px (`1rem`) outer margin from viewport bounds, ensuring maximum card real estate while preventing thumb-edge collision.
- **KPI Metrics Carousel / Grid**: Metrics display as a 2x2 grid or horizontal swipe snap strip on narrow viewports with an 8px (`0.5rem`) gap.
- **Portfolio Deck Feed**: Vertical stacked column with 12px (`0.75rem`) vertical gaps between cards, allowing effortless single-handed scrolling.
- **Desktop/Tablet Reflow**: Seamlessly scales from single-column mobile view into a 12-column responsive layout with 24px margins, where KPI cards span 3 columns each and pitch cards occupy a 2 or 3-column auto-fill grid.

## Elevation & Depth

Visual hierarchy uses a refined three-tiered approach: **Tonal Grounding**, **Soft Frosted Glass**, and **Micro-Ambient Shadowing**:

1. **Base Tier (Ground)**: Canvas background `#F8FAFC` remains stationary with an ethereal ambient blur behind pinned headers (`backdrop-filter: blur(16px)` with 80% opacity fill).
2. **Tier 1 (Surface Cards & KPIs)**: Pitch deck cards and metric containers sit on pure white `#FFFFFF` with a compound shadow:
   - Ambient drop: `0px 1px 2px rgba(15, 23, 42, 0.04), 0px 4px 16px rgba(15, 23, 42, 0.03)`
   - Inner perimeter: `1px solid rgba(226, 232, 240, 0.8)`
3. **Tier 2 (Floating Action & Interactive Triggers)**: Pinned primary action bar ("+ New Deck"), search pill filters, and active modals hover with:
   - Dynamic shadow: `0px 12px 32px -4px rgba(15, 23, 42, 0.12), 0px 4px 12px -2px rgba(15, 23, 42, 0.04)`
   - Translucent frosted rim: Top stroke `rgba(255, 255, 255, 0.6)` simulating light hitting polished beveled glass.

## Shapes

The design system adopts **Level 2 (Rounded)** curvature:
- **Base Components**: Inputs, action buttons, filter tags, and status chips leverage `0.5rem` (8px) corners.
- **Pitch Deck & Metric Cards**: Outer containers use `rounded-lg` (`1rem` / 16px) for an organic, pocketable card feel.
- **Floating Modals & Sheet Overlays**: Leverage `rounded-xl` (`1.5rem` / 24px) on top edge radii for mobile bottom sheets.
- **Indicator Rings & Icon Pods**: Full circular treatment (`border-radius: 9999px`) for founder avatars, status pulse rings, and deck thumbnail glyphs.

## Components

### 1. Executive KPI Stat Cards
- **Structure**: Surface white, padded with `1.25rem`. Top row features a dual-tone circular glyph pod (`36x36px`) alongside an external trend arrow or pulse beacon.
- **Metric Presentation**: `metric-kpi` bold slate figure directly stacked above `label-md` neutral caption (e.g., "$4.6M" over "Tracked ARR").
- **Visual Wash**: A subtle diagonal radial gradient (`linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, transparent 60%)`) anchored at the top-right corner of each card.

### 2. Pitch Deck Portfolio Cards
- **Header Pod**: Includes the brand/pitch icon in an energetic micro-gradient square (`44x44px`, 12px corner radius), the company title (`headline-md`), and a floating right-aligned status badge.
- **Metadata Section**: 
  - Domain link displayed with interactive link styling and a subtle globe glyph (`body-sm`).
  - Sector category tags (e.g., "Fintech", "AI Recruiting") paired with color-coded dot badges.
- **Card Footer**: Clear hairline separator (`border-t border-slate-100`) anchoring the "Last Activity" relative timestamp alongside an expanded tap target icon (`ArrowUpRight`).

### 3. Status Badges & Chips
- **Ready to Pitch**: `#ECFDF5` background with a glowing `#10B981` status dot and `#065F46` label.
- **In Review**: `#FFFBEB` background with `#F59E0B` status dot and `#92400E` label.
- **Filter Tabs (Horizontal Strip)**: Segmented control style; active tab renders with deep slate background (`#0F172A`) and crisp white typography with pill counter; inactive tabs render in clear ghost mode (`#F1F5F9` text `#64748B`).

### 4. Floating Action & Primary Buttons
- **"+ New Deck" Floating Action Bar**: Fixed above mobile bottom safe area. High-gloss dark gradient (`#0F172A` to `#1E293B`) with a frosted white internal highlight border, icon prefix, and tactile haptic-press feedback.
- **Secondary Actions**: Ghost outline with hairline border `rgba(15, 23, 42, 0.08)`, expanding to fill width on mobile modals.

### 5. Input Fields & Search Bars
- Background `#F8FAFC`, transitioning to `#FFFFFF` on active focus with an electric cobalt hairline glow (`ring-2 ring-blue-500/20 border-blue-600`).