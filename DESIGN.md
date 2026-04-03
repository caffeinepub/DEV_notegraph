# Design Brief

**Purpose**: Personal knowledge base — a thinking tool for capturing, organizing, and linking ideas. Minimal, editorial interface that prioritizes typography and whitespace over decoration.

**Aesthetic**: Refined editorial minimalism (Linear, Notion, Bear). Warm neutral base, generous margins, single muted accent, zero ornamentation. Content-forward, calm, focused.

**Key Decisions**: Desaturated warm off-white light mode (#f9f7f4 ~ `0.98 0.005 70`), near-black foreground, muted teal-blue accent (used sparingly for links/active states). Fraunces serif headlines, DM Sans body. Reduced shadows, minimal borders, 8px vertical rhythm throughout.

## Palette

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| **background** | `0.98 0.005 70` | `0.08 0.008 70` | Main page base; warm neutral |
| **card** | `0.97 0.005 70` | `0.15 0.015 70` | Elevated surfaces; warm card layer |
| **foreground** | `0.15 0.01 70` | `0.95 0.01 70` | Body text; near-black to off-white |
| **muted** | `0.9 0.002 70` | `0.22 0.005 70` | Dividers, subtle backgrounds |
| **primary/accent** | `0.52 0.08 185` | `0.58 0.1 185` | Links, active states (muted teal-blue) |
| **secondary** | `0.7 0.05 70` | `0.5 0.06 185` | Secondary actions, subtle emphasis |
| **destructive** | `0.62 0.18 15` | `0.62 0.18 15` | Delete/remove states |

## Typography

| Role | Font | Size | Weight | Usage |
| --- | --- | --- | --- | --- |
| **h1 (titles)** | Fraunces | 32px | 600–700 | Note titles, section heads |
| **h2 (subheads)** | Fraunces | 24px | 600 | Subsection titles |
| **body** | DM Sans | 16px | 400 | Note content, descriptions |
| **label** | DM Sans | 13px | 500 | UI labels, sidebar sections |
| **code** | Geist Mono | 13px | 400 | Code blocks, inline code |
| **caption** | DM Sans | 12px | 400 | Metadata, timestamps, hints |

## Structural Zones

| Zone | Background | Border | Shadow | Details |
| --- | --- | --- | --- | --- |
| **Header** | `bg-card` | `border-b` (2px) | subtle | App title, theme toggle, search |
| **Sidebar** | `bg-sidebar` | `border-r` (1px) | none | Folders, tags, note list; scrollable |
| **Editor** | `bg-background` | none | none | Rich text, max-width 900px, 48px gutters |
| **Right Panel** | `bg-sidebar` | `border-l` (1px) | none | Metadata, backlinks, graph; drawer on mobile |
| **Graph** | `bg-background` | `border` (1px) | subtle | Node/link visualization, SVG canvas |

## Spacing & Rhythm

- **Horizontal gutters**: Editor 48px left/right (`.editor-gutter` class)
- **Vertical rhythm**: 8px base unit — all spacing multiples of 8px (`my-2`=4px, `my-4`=8px, `my-6`=12px, etc.)
- **Section spacing**: Sidebar sections 20px `mt`, 2px separator lines
- **Line height**: Body 1.6, display 1.2

## Component Patterns

- **Buttons**: No background by default; text + icon. Hover: subtle background lift + text accent color. Active: `bg-primary/10 text-primary`.
- **Cards**: `bg-card rounded-md border border-border shadow-subtle`. Hover: `shadow-elevated transition-smooth`.
- **Inputs**: `bg-input border-border rounded-sm focus:ring-1 focus:ring-primary`. Minimal visual weight.
- **Links**: Underlined, `text-primary`, no decoration on hover (underline remains).
- **Tags**: `bg-muted/40 text-foreground rounded-sm px-2 py-0.5 text-xs font-medium`.
- **Separators**: `border-t border-muted/40`, 2px height, no shadows.

## Motion

- **Interaction**: `transition-fast` (0.15s) for hover/focus states.
- **Panel slides**: `transition-smooth` (0.3s) for sidebar collapse, graph drawer.
- **No load animations**: Content fades in via fade-in opacity only (no scale, no translate).

## Responsive

- **Desktop** (≥1024px): 3-column layout (280px | flex | 320px)
- **Tablet** (640–1023px): 2-column (240px | flex); graph as drawer
- **Mobile** (<640px): 1-column; sidebar & graph as drawers

## Signature Detail

Muted teal accent sparingly applied to links and active indicators. Note connections visualized via graph with subtle line opacity. No visual flare or decoration — every pixel serves information clarity.

## Dark Mode Priority

Dark mode is primary design target. Light mode supports full accessibility & contrast. Both modes use desaturated, warm OKLCH values (low chroma) for reduced eye strain.

## Constraints

- **No decorative gradients** on page backgrounds (productivity tool focus)
- **No load animations** (content clarity > spectacle)
- **Monospace restricted** to code only
- **Minimal border usage**: Dividers as subtle muted borders (1px), section borders as 2px only where necessary
- **No elevation abuse**: Shadows used only where surface layering is functionally necessary
- **Radius consistency**: All interactive elements use `rounded-md` (default 0.5rem); separators/dividers use `rounded-sm`
