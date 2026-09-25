"""
Deck themes — Python port of the frontend theme tokens.

Mirrors `frontend/src/components/workspace/deckTemplates/themes.ts` so the
downloaded PPTX matches the template the user selected and previewed in the
module. Keep the two files in sync: same keys, same colors, same light/dark
mode. Each theme is a design-token set the renderer maps onto slide elements.
"""
from typing import Optional

# key -> tokens. Fields mirror the TS `Theme` interface (color + mode subset
# the PPTX renderer needs). `mode` drives light-vs-dark handling in the palette.
#
# font_title/font_body/title_upper are NOT font-embedding — they're safe,
# widely-preinstalled-on-Windows/Mac font *names* chosen to echo the mood of
# each theme's Google-Fonts counterpart in `frontend/.../themes.ts` (Space
# Grotesk, Newsreader, etc. aren't available without embedding, which is too
# fragile for an automated pipeline — these are the closest safe analogs).
# Body text stays on Calibri everywhere (the proven baseline); only
# titles/headlines get differentiated per theme.
THEMES: dict[str, dict] = {
    "meridian":  {"name": "Meridian Navy",   "mode": "dark",  "bg": "#0A1838", "surface": "#102350", "text": "#EAF0FF", "muted": "#9DB0D6", "accent": "#5B8DEF", "accent2": "#62D6C4", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": True},
    "onyx":      {"name": "Onyx Coral",       "mode": "dark",  "bg": "#141519", "surface": "#1E2027", "text": "#F5F5F6", "muted": "#A1A3AD", "accent": "#FF6B53", "accent2": "#FFC178", "font_title": "Century Gothic", "font_body": "Calibri", "title_upper": True},
    "abyss":     {"name": "Abyss Teal",       "mode": "dark",  "bg": "#04212A", "surface": "#0A3340", "text": "#E6F6F4", "muted": "#8DB8B6", "accent": "#27D2C1", "accent2": "#56B8FF", "font_title": "Century Gothic", "font_body": "Calibri", "title_upper": False},
    "nocturne":  {"name": "Nocturne Violet",  "mode": "dark",  "bg": "#130D2C", "surface": "#1F1745", "text": "#F1ECFF", "muted": "#A99FCB", "accent": "#9A7BFF", "accent2": "#FF8FCB", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": False},
    "forest":    {"name": "Forest Lime",      "mode": "dark",  "bg": "#0B1D15", "surface": "#112C20", "text": "#E9F3EC", "muted": "#92B5A1", "accent": "#3FBF7A", "accent2": "#C4E25F", "font_title": "Trebuchet MS", "font_body": "Calibri", "title_upper": False},
    "verdant":   {"name": "Verdant",          "mode": "light", "bg": "#F5F8F4", "surface": "#FFFFFF", "text": "#152319", "muted": "#566359", "accent": "#1F8A5B", "accent2": "#5FA63C", "font_title": "Georgia",      "font_body": "Calibri", "title_upper": False},
    "indigo":    {"name": "Indigo SaaS",      "mode": "light", "bg": "#F4F4FB", "surface": "#FFFFFF", "text": "#15152E", "muted": "#5C5C78", "accent": "#4F46E5", "accent2": "#0EA5B7", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": False},
    "editorial": {"name": "Editorial Mono",   "mode": "light", "bg": "#FAFAF7", "surface": "#FFFFFF", "text": "#121211", "muted": "#6B6B63", "accent": "#16150F", "accent2": "#C2410C", "font_title": "Georgia",      "font_body": "Calibri", "title_upper": False},
    "terra":     {"name": "Terracotta",       "mode": "light", "bg": "#FBF4EC", "surface": "#FFFFFF", "text": "#2A1D14", "muted": "#7C6A5B", "accent": "#C2683D", "accent2": "#7C8B4F", "font_title": "Trebuchet MS", "font_body": "Calibri", "title_upper": False},
    "slate":     {"name": "Slate Amber",      "mode": "light", "bg": "#F3F6F8", "surface": "#FFFFFF", "text": "#162033", "muted": "#586677", "accent": "#E08A0B", "accent2": "#2563EB", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": True},
    # ── Family 2 (Studio) ──
    "broadsheet": {"name": "Broadsheet",      "mode": "light", "bg": "#F7F5F0", "surface": "#F7F5F0", "text": "#14130F", "muted": "#6F6A5E", "accent": "#8C2F13", "accent2": "#2E4A3C", "font_title": "Georgia",      "font_body": "Calibri", "title_upper": True},
    "monolith":  {"name": "Monolith",         "mode": "dark",  "bg": "#111111", "surface": "#1C1C1C", "text": "#F2F2F0", "muted": "#8E8E8A", "accent": "#E8FF3A", "accent2": "#FF4D1F", "font_title": "Century Gothic", "font_body": "Calibri", "title_upper": True},
    "blueprint": {"name": "Blueprint",        "mode": "dark",  "bg": "#0E1A24", "surface": "#132430", "text": "#DCEAF2", "muted": "#6E8C9E", "accent": "#4FC3F7", "accent2": "#B8E986", "font_title": "Consolas",     "font_body": "Calibri", "title_upper": True},
    "aperture":  {"name": "Aperture",         "mode": "dark",  "bg": "#0A0A0C", "surface": "#16161A", "text": "#FFFFFF", "muted": "#9A9AA2", "accent": "#E5B769", "accent2": "#7FB3C8", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": True},
    "ledger":    {"name": "Ledger",           "mode": "light", "bg": "#FFFFFF", "surface": "#F6F7F8", "text": "#10161C", "muted": "#5C6670", "accent": "#12604A", "accent2": "#9A3412", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": True},
    "atrium":    {"name": "Atrium",           "mode": "light", "bg": "#FCFCFC", "surface": "#FCFCFC", "text": "#1A1A1A", "muted": "#959595", "accent": "#1A1A1A", "accent2": "#B0B0B0", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": False},
    "strata":    {"name": "Strata",           "mode": "light", "bg": "#F4F6F8", "surface": "#FFFFFF", "text": "#131A24", "muted": "#5E6B7A", "accent": "#1D4ED8", "accent2": "#0F766E", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": True},
    "kiosk":     {"name": "Kiosk",            "mode": "light", "bg": "#FFF8E7", "surface": "#FFFFFF", "text": "#16130C", "muted": "#6B6353", "accent": "#E0245E", "accent2": "#1B8AE0", "font_title": "Trebuchet MS", "font_body": "Calibri", "title_upper": False},
    "vellum":    {"name": "Vellum",           "mode": "light", "bg": "#EFE9DF", "surface": "#F7F3EC", "text": "#231C14", "muted": "#7A6E5F", "accent": "#7A4419", "accent2": "#3E5540", "font_title": "Georgia",      "font_body": "Calibri", "title_upper": False},
    "circuit":   {"name": "Circuit",          "mode": "dark",  "bg": "#07090D", "surface": "#0E1219", "text": "#E6EDF5", "muted": "#6B7688", "accent": "#00E5A0", "accent2": "#7C6BFF", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": True},
    # ── Family 3 (Volume 2) ──
    "swiss":     {"name": "Swiss Grid",       "mode": "light", "bg": "#F1EFEA", "surface": "#FFFFFF", "text": "#141414", "muted": "#5E5B55", "accent": "#C4331F", "accent2": "#141414", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": True},
    "gazette":   {"name": "Gazette",          "mode": "dark",  "bg": "#1D2A23", "surface": "#24332B", "text": "#F3ECDF", "muted": "#B9B3A3", "accent": "#E8B23A", "accent2": "#8C2F2A", "font_title": "Georgia",      "font_body": "Calibri", "title_upper": False},
    "billboard": {"name": "Billboard",        "mode": "light", "bg": "#F4F1E8", "surface": "#FFFFFF", "text": "#1B1B1F", "muted": "#57544C", "accent": "#F2C230", "accent2": "#1B1B1F", "font_title": "Trebuchet MS", "font_body": "Calibri", "title_upper": True},
    "bento":     {"name": "Bento",            "mode": "light", "bg": "#F4F2F8", "surface": "#FFFFFF", "text": "#1C1830", "muted": "#4E4865", "accent": "#5B47B8", "accent2": "#3FA796", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": True},
    "boardroom": {"name": "Boardroom",        "mode": "light", "bg": "#FBFBF9", "surface": "#F2F5F7", "text": "#0F2A4A", "muted": "#56606C", "accent": "#1F6F80", "accent2": "#0F2A4A", "font_title": "Georgia",      "font_body": "Calibri", "title_upper": True},
    "console":   {"name": "Console",          "mode": "dark",  "bg": "#0D1117", "surface": "#161B22", "text": "#E6EDF3", "muted": "#8B949E", "accent": "#3DDC97", "accent2": "#58A6FF", "font_title": "Consolas",     "font_body": "Calibri", "title_upper": True},
    "aurora":    {"name": "Aurora",           "mode": "light", "bg": "#FCE9DA", "surface": "#FFFFFF", "text": "#231F3A", "muted": "#554F6B", "accent": "#B42A60", "accent2": "#5B47B8", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": True},
    "drafting":  {"name": "Drafting",         "mode": "dark",  "bg": "#163A6B", "surface": "#1C4680", "text": "#EAF2FB", "muted": "#A9C2E0", "accent": "#FFD166", "accent2": "#7FD1E8", "font_title": "Trebuchet MS", "font_body": "Calibri", "title_upper": True},
    "noir":      {"name": "Noir Luxe",        "mode": "dark",  "bg": "#131313", "surface": "#1C1C1C", "text": "#F2EDE3", "muted": "#A39E93", "accent": "#C9A45C", "accent2": "#F2EDE3", "font_title": "Georgia",      "font_body": "Calibri", "title_upper": True},
    "panelled":  {"name": "Split Panel",      "mode": "light", "bg": "#F6EFE6", "surface": "#FFFFFF", "text": "#12343B", "muted": "#56676A", "accent": "#B8431F", "accent2": "#12343B", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": True},
    # ── Family 4 (Infographic / Volume 3) ──
    "pulse":     {"name": "Data Pulse",       "mode": "dark",  "bg": "#050E1C", "surface": "#0A1628", "text": "#E8F4FF", "muted": "#6B8BAF", "accent": "#00D4FF", "accent2": "#0087FF", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": True},
    "flux":      {"name": "Gradient Flow",    "mode": "dark",  "bg": "#130823", "surface": "#1E1035", "text": "#F0EAFF", "muted": "#9080BA", "accent": "#A855F7", "accent2": "#EC4899", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": False},
    "cobalt":    {"name": "Cobalt",           "mode": "dark",  "bg": "#0D2166", "surface": "#152B85", "text": "#FFFFFF", "muted": "#9FB4FF", "accent": "#FBBF24", "accent2": "#60A5FA", "font_title": "Century Gothic", "font_body": "Calibri", "title_upper": True},
    "amber":     {"name": "Amber Alert",      "mode": "dark",  "bg": "#141414", "surface": "#1E1E1E", "text": "#F5F5F5", "muted": "#9A9A9A", "accent": "#F59E0B", "accent2": "#EF4444", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": True},
    "chrome":    {"name": "Midnight Chrome",  "mode": "dark",  "bg": "#080808", "surface": "#141414", "text": "#F2F2F2", "muted": "#8A8A8A", "accent": "#C0C0C0", "accent2": "#E8E8E8", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": True},
    "atlas":     {"name": "Market Atlas",     "mode": "light", "bg": "#F6FAFE", "surface": "#FFFFFF", "text": "#0E2040", "muted": "#5070A0", "accent": "#1D6FEB", "accent2": "#0DC9B1", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": False},
    "prism":     {"name": "Prismatic",        "mode": "light", "bg": "#FDFCFF", "surface": "#FFFFFF", "text": "#1A1530", "muted": "#6B6585", "accent": "#7C3AED", "accent2": "#F59E0B", "font_title": "Trebuchet MS", "font_body": "Calibri", "title_upper": True},
    "sage":      {"name": "Sage",             "mode": "light", "bg": "#EDF4EC", "surface": "#FFFFFF", "text": "#1A2E1C", "muted": "#5E7860", "accent": "#3B7D3F", "accent2": "#8DAE5A", "font_title": "Segoe UI",     "font_body": "Calibri", "title_upper": False},
    "crimson":   {"name": "Crimson",          "mode": "light", "bg": "#FBF6F6", "surface": "#FFFFFF", "text": "#2A0A0A", "muted": "#7A4040", "accent": "#8B0000", "accent2": "#C9A45C", "font_title": "Georgia",      "font_body": "Calibri", "title_upper": False},
    "rosegold":  {"name": "Rose Gold",        "mode": "light", "bg": "#FFF5F5", "surface": "#FFFFFF", "text": "#2A1A1A", "muted": "#9A6060", "accent": "#C9847A", "accent2": "#D4A5A0", "font_title": "Georgia",      "font_body": "Calibri", "title_upper": False},
}

DEFAULT_THEME_KEY = "meridian"


def get_theme(key: Optional[str]) -> dict:
    """Return the theme tokens for `key`, falling back to the default theme."""
    return THEMES.get(key or DEFAULT_THEME_KEY, THEMES[DEFAULT_THEME_KEY])
