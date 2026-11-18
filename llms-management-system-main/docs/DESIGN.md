
# Design System Specification

Goal: a modern, sleek, minimal dashboard. Compact (not bulky), calm, high readability, lots of whitespace, subtle borders instead of heavy shadows. Built only with shadcn/ui components and Tailwind design tokens.

## 1. Two Color Palettes (60 / 30 / 10)

### Palette A: Cream (called "cream")
Clotted Cream 60 percent (backgrounds and surfaces), Spruce Velvet 30 percent (sidebar, primary actions, text), Heirloom Tomato 10 percent (accent and highlights). The color names are not standard hex values, so these are close approximations. Tell the designer if a different exact shade is wanted.

| Role | Share | Hex |
|---|---|---|
| Clotted Cream | 60% | #F4EDDC |
| Spruce Velvet | 30% | #1E4035 |
| Heirloom Tomato | 10% | #C8412B |

### Palette B: Navy (called "navy"), your color table
Mapping: 60 percent light neutral surfaces made from tints of #CDD5DB; 30 percent structure and text from #071739 and #4B6382; 10 percent accent from #A68868 and #E3C39D. #A4B5C4 is used for muted icons, dividers and dark-mode secondary text.

| Role | Share | Hex |
|---|---|---|
| Surfaces (tints of #CDD5DB) | 60% | #F4F6F8 |
| Deep navy (sidebar, primary, text) | 30% | #071739 |
| Slate blue (secondary text, chart 1) | 30% | #4B6382 |
| Blue grey (muted icons, dark text) | support | #A4B5C4 |
| Pale grey (borders, inputs) | 60% | #CDD5DB |
| Bronze (active indicator, focus, highlights) | 10% | #A68868 |
| Sand (soft highlight, dark primary) | 10% | #E3C39D |

### Which one is better for this project? Recommendation: Palette B (Navy)

| Criterion | Cream (A) | Navy (B) | Notes |
|---|---|---|---|
| Medical and lab trust feeling | 3 | 5 | Navy and blue read as clinical and reliable; green is also healthy but the cream base feels more lifestyle |
| Data readability (tables, charts) | 3 | 5 | Cool neutrals keep tables crisp; blue tints give a natural chart range. Cream tint slightly muddies white-on-cream tables |
| Dark mode | 3 | 5 | Navy darkens naturally. Cream needs a separate green-black scheme |
| Semantic colors | 2 | 4 | Tomato is close to the error color, so error and accent can be confused. Navy has no red or green, so no conflict |
| Distinct identity | 5 | 3 | Cream and spruce looks unique and friendly. Navy is more common in SaaS |
| Accessibility (contrast) | 4 | 4 | Both pass for text. Bronze on white is only about 3:1, so it is for non-text accents in B |
| Total (out of 30) | 20 | 26 | |

Recommendation: use Navy as the default for a professional lab system that manager and doctors will use daily. Keep Cream available as a second palette. The tokens are CSS variables, so switching is one attribute (data-palette) and no component changes. If the manager wants a more distinctive brand, Cream is a valid second choice; in that case never use Heirloom Tomato for errors (see section 2).

## 2. Design Tokens
Implement as CSS variables in app/globals.css using the shadcn names, one block per palette and mode: `:root[data-palette="navy"]`, `:root[data-palette="navy"].dark`, `:root[data-palette="cream"]`, `:root[data-palette="cream"].dark`. Default is navy and light. Components must use token classes (bg-background, text-muted-foreground, border-border) and never raw hex.

| Token | Navy light | Navy dark | Cream light | Cream dark |
|---|---|---|---|---|
| background | #F4F6F8 | #050E24 | #F4EDDC | #0F1B17 |
| foreground | #071739 | #E8EDF2 | #1B2B26 | #F4EDDC |
| card | #FFFFFF | #0A1A3C | #FBF7EC | #15251F |
| popover | #FFFFFF | #0A1A3C | #FBF7EC | #15251F |
| primary | #071739 | #E3C39D | #1E4035 | #F4EDDC |
| primary-foreground | #FFFFFF | #071739 | #F4EDDC | #14302A |
| secondary | #E6EBEF | #12264D | #E8DFC8 | #1E3129 |
| muted | #E6EBEF | #12264D | #E8DFC8 | #1E3129 |
| muted-foreground | #4B6382 | #A4B5C4 | #5B6B64 | #A9B5AC |
| accent (hover surface) | #F1E7D8 | #14284F | #E4E8D8 | #1F3A31 |
| accent-foreground | #071739 | #E8EDF2 | #1E4035 | #F4EDDC |
| brand (highlight) | #A68868 | #A68868 | #C8412B | #E5604A |
| border | #CDD5DB | #1B2F57 | #D9CFB5 | #24382F |
| input | #CDD5DB | #1B2F57 | #D9CFB5 | #24382F |
| ring | #A68868 | #A68868 | #C8412B | #E5604A |
| destructive | #B42318 | #F04438 | #A61B1B | #F2665B |
| success | #1F7A5A | #3FB68B | #2F7D4F | #4CB27A |
| warning | #B7791F | #E0A93B | #B7791F | #E0A93B |
| sidebar | #071739 | #040B1D | #1E4035 | #0B1613 |
| sidebar-foreground | #CDD5DB | #A4B5C4 | #E9E2CF | #C9D1C6 |
| sidebar-accent (active item) | #173060 | #0F2250 | #2C5A4B | #1A3028 |
| sidebar-border | #14264D | #0F1D3F | #2A4D41 | #1A2B24 |
| chart-1 | #4B6382 | #A4B5C4 | #1E4035 | #6E9C88 |
| chart-2 | #A68868 | #E3C39D | #C8412B | #E5604A |
| chart-3 | #A4B5C4 | #4B6382 | #6E9C88 | #D9C9A0 |
| chart-4 | #071739 | #A68868 | #D9A441 | #D9A441 |
| chart-5 | #E3C39D | #CDD5DB | #8C7B5A | #8FB5A3 |

Palette switching: next-themes controls light, dark and system through the class. A small PaletteSwitcher (inside the user menu) sets data-palette on the html element and stores it in a cookie or localStorage, with navy as the default and no flash on load.

## 3. Typography
- Fonts through next/font: Inter (variable) for all UI text; JetBrains Mono for patient codes, IDs and numeric codes.
- Base size 14 px (text-sm) for the whole app. Tables 13 to 14 px. Helper and label text 12 px.
- Page title: 24 px, semibold, tracking-tight. Section or card title: 16 px, semibold. Stat value: 28 px, semibold, tabular-nums. Labels: 12 px, medium, muted-foreground.
- Line height 1.5 for body, 1.25 for headings. Use font-medium and font-semibold only; avoid bold. Maximum two font weights per view.
- Numbers in tables and stat cards use tabular-nums. Do not use ALL CAPS except tiny table headers (12 px, tracking-wide, optional).
- Copy style: short sentences, sentence case, verbs on buttons (Add patient, Save changes).

## 4. Spacing, Radius, Elevation
- 4 px grid. Page padding 24 px (16 px on mobile). Gap between cards 16 px. Card padding 16 to 20 px.
- Radius: 8 px for inputs and buttons (rounded-md), 12 px for cards and dialogs (rounded-xl).
- Elevation: cards use a 1 px border and no shadow; popovers and dialogs use a soft shadow. No gradients except optional subtle ones on charts.
- Content max width 1280 px, centered, with generous whitespace.
- Control heights: buttons and inputs h-9; small buttons h-8; icon buttons 36 px square. Icons 16 px (lucide).

## 5. Layout
- **Sidebar** (shadcn Sidebar, collapsible="icon"): 256 px expanded, 56 px collapsed (icons only with tooltips). Toggle with the SidebarTrigger in the header and the keyboard shortcut Ctrl or Cmd + B. State is persisted (the shadcn sidebar cookie) so there is no flash. Below the md breakpoint it becomes a Sheet drawer. Header of the sidebar shows the logo mark and lab name. Footer shows NavUser (avatar, name, role, menu). The active item has the sidebar-accent background and a 2 px brand-colored indicator on the left.
- **Header** (56 px, border-bottom, sticky): SidebarTrigger, Breadcrumbs, spacer, ThemeToggle, avatar dropdown.
- **Page**: PageHeader (title, one-line description, primary action on the right), then content. One primary action per page.

## 6. Component Styling Rules
- **Cards**: bg-card, border, rounded-xl. Stat cards show the label (12 px muted), value (28 px), and a small icon in a muted rounded square at the top right. No heavy colored backgrounds.
- **Tables**: shadcn Table inside a bordered rounded-xl container. Header row bg-muted/50, 12 px medium muted text. Row height 44 px, hover bg-muted/50, no zebra stripes, last row without border. Actions in a kebab DropdownMenu. Pagination footer: "Showing 1 to 20 of 240", Previous and Next, and a rows-per-page Select (10, 20, 50).
- **Badges**: subtle style (tinted background, same-hue text, optional 6 px dot). Active uses success, inactive uses muted, roles use neutral tints. Never saturated solid badges.
- **Buttons**: primary solid, secondary outline, ghost for icon buttons, destructive only inside AlertDialog confirmations.
- **Forms**: label above input, helper text 12 px, inline error in destructive color, two-column grid inside dialogs on desktop, dialog width max-w-lg.
- **Avatars**: shadcn Avatar (Avatar, AvatarImage, AvatarFallback) through the shared UserAvatar component. Fallback shows initials (first letter of first and last name). Background color is picked from a small fixed set of muted token-based tints using a hash of the name, so the same person always has the same color. Sizes: 32 px in header and sidebar, 28 px in tables, 40 px in profile blocks. Avatars also appear in the Recent Patients table.
- **Charts** (shadcn Chart, built on Recharts): bar chart with rounded top corners (radius 4), thin horizontal grid lines only, no vertical grid, axis text 12 px muted, tooltip using the shadcn ChartTooltip, colors from chart-1 and chart-2, fixed height 260 to 300 px. Horizontal bars for breakdowns are simple shadcn Progress-style bars (label, bar, value) using chart tokens. Each chart sits in a ChartCard with title, description and optional period label.
- **Tooltips**: only on icon-only controls (collapsed sidebar, icon buttons).
- **Motion**: 150 ms ease-out transitions on hover, focus, sidebar width and dialog. Respect prefers-reduced-motion. No decorative animations.

## 7. Empty, Loading and Error States
- **Empty state** (shadcn Empty): centered in the table body or chart card. Anatomy: a muted lucide icon inside a rounded square (EmptyMedia), a short title (EmptyTitle, for example "No patients found"), one line of help (EmptyDescription), and optionally a primary action button (EmptyContent). The shared EmptyState component wraps this with props icon, title, description and action. Use different copy for "no data yet" (with an Add button) and "no results for your search" (with a Clear search button). Charts use the same component at a smaller size ("No registrations in the last 7 days").
- **Loading**: Skeleton shapes that match the final layout (stat cards, table rows, chart blocks). Spinners only inside buttons or as a small indicator next to an input. Never a full-page spinner.
- **Error**: shadcn Alert with an icon, a short message and a Retry button. Page-level failures use error.tsx with the same visual language.

## 8. Dashboard Composition
Row 1: 2 to 3 StatCards (grid, 1 column on mobile, 3 on desktop). Row 2: the bar chart (about two thirds width) next to the breakdown bars (one third). Row 3: Recent patients table (5 rows, avatar plus name, code in mono font, relative time). Everything has skeleton and empty states.

## 9. Accessibility
Visible focus ring (ring token), minimum 4.5:1 contrast for text, bronze and sand accents are never used for small text, keyboard navigation everywhere (shadcn and Radix defaults), aria-labels on icon buttons, color is never the only status signal (badges also have text).
