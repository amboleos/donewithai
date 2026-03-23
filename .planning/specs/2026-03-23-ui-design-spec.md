# DoneWithAI UI Design Specification

Version: 2.1
Last Updated: 2026-03-23

## Overview

DoneWithAI is an AI-generated code tracking platform. This document defines a consistent, modern, and professional design language across the entire application.

> **Design System:** Hybrid Neo-Brutalist + Modern Enhancements
> **Tone:** Technical & Data-driven
> **Priority:** Animations & Polish

---

## Design Philosophy

### Hybrid Approach
Uygulama, **Neo-Brutalist foundations** ile **Modern Gradient enhancements**' birleştirir. Bu yaklaşım:

- **Neo-Brutalist temeli:** Sharp corners, subtle brutal shadows, technical aesthetic, monospace fonts
- **Modern enhancements:** Glassmorphism, floating orbs, smooth animations, grid patterns
- **Sonuç:** Profesyonel ve modern, ama aynı zamanda sıcak ve erişilebilir

### Design Tone
- **Technical & Data-driven:** Professional, analytical feel
- **Visual Elements:** Charts, tables, code snippets, terminal-style UI
- **Typography:** Monospace fonts for code, sans-serif for headings
- **Dark Mode:** Essential for developer tools

---

## Color System

### Light Mode

```css
/* Background */
--background: #FDFBF7;        /* Warm cream */
--foreground: #1A1A1A;

/* Primary - Deep Teal */
--primary: #0D9488;
--primary-foreground: #FFFFFF;
--primary-hover: #0F766E;
--primary-light: #CCFBF1;

/* Accent - Vibrant Coral */
--accent: #F97316;
--accent-foreground: #FFFFFF;
--accent-hover: #EA580C;
--accent-light: #FFEDD5;

/* Secondary */
--secondary: #F4F4F5;
--secondary-foreground: #18181B;

/* Muted */
--muted: #F4F4F5;
--muted-foreground: #71717A;

/* Cards & Surfaces */
--card: #FFFFFF;
--card-foreground: #18181B;
--popover: #FFFFFF;
--popover-foreground: #18181B;

/* Borders */
--border: #27272A;
--input: #E4E4E7;
--ring: #0D9488;

/* Status Colors */
--success: #16A34A;
--warning: #CA8A04;
--destructive: #DC2626;

/* Chart Colors */
--chart-1: #0D9488;  /* Teal */
--chart-2: #F97316;  /* Coral */
--chart-3: #8B5CF6;  /* Purple */
--chart-4: #EC4899;  /* Pink */
--chart-5: #06B6D4;  /* Cyan */

/* AI Detection Colors */
--ai-badge: #06B6D4;
--ai-badge-bg: #ECFEFF;
--human-badge: #22C55E;
--human-badge-bg: #F0FDF4;
--agentic-badge: #EF4444;
--agentic-badge-bg: #FEF2F2;

```

### Dark Mode

```css
.dark {
  --background: #18181B;
  --foreground: #FAFAFA;

  --primary: #2DD4BF;
  --primary-foreground: #18181B;
  --primary-hover: #5EEAD4;
  --primary-light: #134E4A;

  --accent: #FB923C;
  --accent-foreground: #18181B;
  --accent-hover: #FDBA74;
  --accent-light: #431407;

  --secondary: #27272A;
  --secondary-foreground: #FAFAFA;

  --muted: #27272A;
  --muted-foreground: #A1A1AA;

  --card: #27272A;
  --card-foreground: #FAFAFA;
  --popover: #27272A;
  --popover-foreground: #FAFAFA;

  --border: #FAFAFA;
  --input: #3F3F46;
  --ring: #2DD4BF;

  /* Dark mode AI badges */
  --ai-badge-bg: #164E63;
  --ai-badge: #67E8F9;
  --human-badge-bg: #14532D;
  --human-badge: #86EFAC;
  --agentic-badge-bg: #450A0A;
  --agentic-badge: #FCA5A5;
}
```

### Gradient System

```css
/* Primary Gradient - Teal to Cyan - For Dashboard background */
--gradient-primary: linear-gradient(135deg, #0D9488 0%, #06B6D4 100%);
/* Usage: Dashboard page background */

/* Accent Gradient - Coral to Orange - For CTAs, highlights */
--gradient-accent: linear-gradient(135deg, #F97316 0%, #FB923C 100%);
/* Usage: Primary buttons, accent elements */

/* Dark Gradient - For dark mode backgrounds */
--gradient-dark: linear-gradient(135deg, #18181B 0%, #27272A 100%);
/* Usage: Dark mode page backgrounds */
```

### Glassmorphism Implementation

```css
/* Glass card - for dashboard stats and repo cards */
.card-glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px); /* Safari */
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
}

.dark .card-glass {
  background: rgba(39, 39, 46, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}

.card-glass:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

/* Tailwind utility classes */
.glass { @apply card-glass; }
```

**Browser Support:**
- `backdrop-filter` supported in all modern browsers
- Fallback: Solid background color for older browsers
```css
@supports not (backdrop-filter) {
  .card-glass {
    background: var(--card);
  }
}
```

## Typography

### Font Stack
- **Primary Font:** `Sora` - Headings, titles, emphasis text
- **Secondary Font:** `JetBrains Mono` - Code, data, technical content
- **Fallback:** System UI stack

### Font Weights
- **Bold:** 700-800 for headings
- **Semibold:** 600 for emphasis
- **Regular:** 400-500 for body text
- **Light:** 300 for muted text

### Font Sizes
```css
--text-xs: 0.75rem;    /* 12px - badges, labels */
--text-sm: 0.875rem;   /* 14px - secondary text */
--text-base: 1rem;     /* 16px - body text */
--text-lg: 1.125rem;  /* 18px - lead text */
--text-xl: 1.25rem;   /* 20px - small headings */
--text-2xl: 1.5rem;   /* 24px - section headings */
--text-3xl: 1.875rem; /* 30px - page titles */
--text-4xl: 2.25rem;  /* 36px - hero titles */
--text-5xl: 3rem;     /* 48px - large hero */
```

## Animation System

### Timing
- **Fast:** 150ms - micro-interactions (hover, focus)
- **Normal:** 300ms - standard transitions
- **Slow:** 500ms - page transitions, modals
- **Slower:** 800ms - complex animations

### Easing
- **Default:** `ease-out` - smooth deceleration
- **Bounce:** `cubic-bezier(0.34, 1.56, 0.64, 1)` - playful feedback
- **Smooth:** `cubic-bezier(0.4, 0, 0.2, 1)` - professional feel

### Animation Types

#### Fade Animations
```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
```

#### Slide Animations
```css
@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slide-down {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slide-left {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slide-right {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}
```

#### Scale Animations
```css
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes pop-in {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
```

#### Floating Orbs Animation
```css
@keyframes float-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

@keyframes float-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-30px, 20px) scale(1.1); }
  66% { transform: translate(20px, -20px) scale(0.9); }
}

@keyframes pulse-slow {
  0%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.3; transform: translate(-50%, -50%) scale(1.1); }
}
```

#### Progress Stripe Animation
```css
@keyframes stripe {
  0% { background-position: 1rem 0; }
  100% { background-position: 0 0; }
}
```

### Animation Utilities
```css
.animate-fade-in { animation: fade-in 0.3s ease-out; }
.animate-slide-up { animation: slide-up 0.4s ease-out; }
.animate-scale-in { animation: scale-in 0.3s ease-out; }
.animate-pop-in { animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.animate-float-1 { animation: float-1 20s ease-in-out infinite; }
.animate-float-2 { animation: float-2 25s ease-in-out infinite; }
.animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
```

### Staggered Animation Delays
```css
.delay-100 { animation-delay: 100ms; }
.delay-200 { animation-delay: 200ms; }
.delay-300 { animation-delay: 300ms; }
.delay-400 { animation-delay: 400ms; }
.delay-500 { animation-delay: 500ms; }
```

## Component Specifications

### Buttons

#### Primary Button
```tsx
<button className="btn-primary">
  {/* Background: var(--primary) */}
  {/* Text: var(--primary-foreground) */}
  {/* Border: 2px solid var(--border) */}
  {/* Shadow: var(--shadow-brutal) */}
  {/* Hover: translate(2px, 2px), shadow reduces */}
  {/* Active: translate(4px, 4px), no shadow */}
  {/* Font: Sora, 600 weight, uppercase, tracking-wide */}
</button>
```

#### Secondary Button
```tsx
<button className="btn-secondary">
  {/* Background: var(--secondary) */}
  {/* Text: var(--secondary-foreground) */}
  {/* Border: 2px solid var(--border) */}
  {/* Shadow: var(--shadow-brutal-sm) */}
</button>
```

#### Ghost Button
```tsx
<button className="btn-ghost">
  {/* Background: transparent */}
  {/* Text: var(--foreground) */}
  {/* Border: 2px solid var(--border) */}
  {/* Hover: var(--muted) background */}
</button>
```

### Cards

#### Standard Card
```tsx
<div className="card">
  {/* Background: var(--card) */}
  {/* Border: 2px solid var(--border) */}
  {/* Shadow: var(--shadow-brutal) */}
  {/* Hover: lift effect (-2px, -2px), shadow grows */}
  {/* Radius: var(--radius) - 4px (sharp) */}
</div>
```

#### Glassmorphism Card
```tsx
<div className="card-glass">
  {/* Background: white/10 backdrop-blur */}
  {/* Border: border-white/20 */}
  {/* Hover: bg-white/15 */}
  {/* Perfect for dashboard cards */}
</div>
```

### Badges

#### Standard Badge
```tsx
<span className="badge">
  {/* Background: var(--card) */}
  {/* Text: var(--foreground) */}
  {/* Border: 2px solid var(--border) */}
  {/* Font: JetBrains Mono, 0.75rem, uppercase, tracking-wide */}
</span>
```

#### AI Badge (Cyan)
```tsx
<span className="ai-badge">
  {/* Background: #ECFEFF light / #164E63 dark */}
  {/* Border: 2px solid #06B6D4 */}
  {/* Text: #0891B2 light / #67E8F9 dark */}
  {/* Icon: Brain/Sparkles icon before text */}
</span>
```

#### Human Badge (Green)
```tsx
<span className="human-badge">
  {/* Background: #F0FDF4 light / #14532D dark */}
  {/* Border: 2px solid #22C55E */}
  {/* Text: #16A34A light / #86EFAC dark */}
</span>
```

#### Agentic Badge (Red)
```tsx
<span className="agentic-badge">
  {/* Background: #FEF2F2 light / #450A0A dark */}
  {/* Border: 2px solid #EF4444 */}
  {/* Text: #DC2626 light / #FCA5A5 dark */}
</span>
```

### Inputs

#### Standard Input
```tsx
<input className="input">
  {/* Background: var(--card) */}
  {/* Text: var(--foreground) */}
  {/* Border: 2px solid var(--border) */}
  {/* Shadow: var(--shadow-brutal-sm) */}
  {/* Focus: border-color changes to var(--primary), shadow disappears */}
  {/* Placeholder: var(--muted-foreground) */}
  {/* Font: Sora, 0.875rem */}
</input>
```

### Tables

#### Data Table
```tsx
<table className="table">
  {/* Header: var(--muted) background, bold text */}
  {/* Rows: var(--card) background, hover: var(--muted) */}
  {/* Borders: 2px solid var(--border) */}
  {/* Font: JetBrains Mono for data, Sora for headers */}
</table>
```

### Modals/Dialogs

```tsx
<div className="modal">
  {/* Backdrop: bg-black/50 backdrop-blur */}
  {/* Content: var(--card) background, var(--shadow-brutal-lg) */}
  {/* Animation: scale-in */}
  {/* Close: fade-out on backdrop click */}
</div>
```

## Background System

### Dot Pattern
```css
.bg-dots {
  background-image: radial-gradient(circle, var(--border) 1px, transparent 1px);
  background-size: 20px 20px;
  opacity: 0.5;
}
```

### Grid Pattern
```css
.bg-grid {
  background-image:
    linear-gradient(to right, var(--border) 1px, transparent 1px),
    linear-gradient(to bottom, var(--border) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.3;
}
```

### Floating Orbs (Dashboard Only)

**Exact Orb Specifications:**

```tsx
{/* Orb 1 - Top Left */}
<div className="absolute top-20 left-20 w-72 h-72 bg-pink-400 rounded-full blur-[100px] opacity-40 animate-float-1" />

{/* Orb 2 - Bottom Right */}
<div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-[120px] opacity-30 animate-float-2" />

{/* Orb 3 - Center (Large) */}
<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-400 rounded-full blur-[150px] opacity-20 animate-pulse-slow" />
```

**Orb Colors (Fixed):**
| Orb | Color | Size | Blur | Opacity | Animation |
|-----|-------|------|------|---------|-----------|
| Orb 1 | `bg-pink-400` (#F472B6) | 288px | 100px | 0.4 | float-1 (20s) |
| Orb 2 | `bg-blue-400` (#60A5FA) | 384px | 120px | 0.3 | float-2 (25s) |
| Orb 3 | `bg-violet-400` (#A78BFA) | 600px | 150px | 0.2 | pulse-slow (4s) |

**Dark Mode Orbs:**
| Orb | Light Mode | Dark Mode |
|-----|-----------|-----------|
| Orb 1 | `bg-pink-400` | `bg-pink-600` (darker) |
| Orb 2 | `bg-blue-400` | `bg-blue-600` (darker) |
| Orb 3 | `bg-violet-400` | `bg-violet-600` (darker) |

## Layout Patterns

### Page Structure
```
┌─────────────────────────────────────┐
│           HEADER (Sticky)              │
│  Logo    Nav    Theme  User          │
├─────────────────────────────────────┤
│                                 │
│         MAIN CONTENT               │
│                                 │
│  ┌─────────────────────────────┐  │
│  │      Stats Cards             │  │
│  └─────────────────────────────┘  │
│                                 │
│  ┌─────────────────────────────┐  │
│  │      Data Section            │  │
│  └─────────────────────────────┘  │
│                                 │
└─────────────────────────────────────┘
```

### Header Component
- **Height:** 64px (desktop), 56px (mobile)
- **Background:** Glassmorphism (bg-white/10 backdrop-blur-lg)
- **Border:** Bottom border only (border-white/20)
- **Sticky:** top: 0, z-index: 40
- **Content:** Logo (left), Navigation (center), User menu (right)

### Content Area
- **Max Width:** 1280px (container)
- **Padding:** 24px horizontal, 32px vertical
- **Background:** Transparent (page bg shows through)

- **Grid:** 12-column grid system

  - Cards: 1/3 width (4 per row on large screens)
  - Tables: Full width

## Page Specifications

### 1. Home Page (`/`)

#### Layout
```
┌─────────────────────────────────────┐
│           HEADER                    │
├─────────────────────────────────────┤
│                                 │
│         HERO SECTION                │
│    Headline + Subheadline + CTA     │
│                                 │
├─────────────────────────────────────┤
│         FEATURE CARDS                │
│   4 cards in a row (responsive)    │
├─────────────────────────────────────┤
│                                 │
│         TERMINAL DEMO               │
│    Mock terminal with animation    │
├─────────────────────────────────────┘
```

#### Components
- **Header:** Standard header with glassmorphism
- **Hero:**
  - Tag badge (top left)
  - Large headline (text-5xl)
  - Subheadline (text-lg, muted)
  - CTA buttons (primary + outline)
- **Feature Cards:** 4 cards in responsive grid
  - Icon + title + description
  - Hover lift effect
- **Terminal Demo:** Card with mock terminal UI
  - Animated typing cursor
- **Footer:** Simple footer with version + tagline

#### Animations
- Hero: `fade-in` on page load
- Feature cards: `slide-up` with stagger (100ms delay each)
- Terminal: `fade-in` with delay
- CTA buttons: Subtle scale on hover

### 2. Login Page (`/login`)

#### Layout
```
         ┌───────────────┐
         │             │
         │    LOGO      │
         │   + Title    │
         │             │
         └───────────────┘
               │
         ┌───────────────┐
         │             │
         │  LOGIN CARD  │
         │  (centered)   │
         │             │
         └───────────────┘
               │
         ┌───────────────┐
         │  Back Link   │
         │  Theme Toggle │
         └───────────────┘
```

#### Components
- **Logo Section:**
  - Icon with brutal shadow
  - App name (Sora, bold)
  - Tagline (JetBrains Mono, small)
- **Login Card:**
  - Tab switcher (Sign In / Sign Up)
  - Form fields with icons
  - Submit button (primary, full width)
  - Switch mode link
- **Footer:**
  - Back to home link
  - Theme toggle

#### Animations
- Card: `scale-in` on page load
- Form fields: Focus glow animation
- Tab switcher: Slide animation
- Button: Loading spinner animation

### 3. Dashboard Page (`/dashboard`)

#### Layout
```
┌─────────────────────────────────────────────────────┐
│                    HEADER                           │
│  Logo    Admin    Theme    Logout    User         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │         GRADIENT BACKGROUND                   │  │
│  │  + Floating Orbs + Grid Pattern             │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │              STATS GRID                        │  │
│  │  Total Repos | GitHub | Bitbucket | Synced │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │              REPO LIST                           │  │
│  │  Grid of repo cards (2-3 columns)            │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Components
- **Background:**
  - Gradient background (teal to cyan)
  - Floating orbs (3 animated orbs)
  - Grid pattern overlay
- **Stats Grid:**
  - 4 stat cards in a row
  - Animated counter
  - Icon + value + label
  - Glassmorphism style
- **Repo Cards:**
  - Provider icon
  - Repo name + owner
  - Sync status badge
  - URL display
  - Action buttons (View, Sync, Admin actions)

#### Animations
- Background orbs: `float-1`, `float-2`, `pulse-slow` (infinite)
- Stats: Counter animation on load
- Cards: `slide-up` with stagger
- Buttons: Lift effect on hover
### 4. Admin Page (`/admin`)
#### Layout
```
┌─────────────────────────────────────────────────────┐
│                    HEADER                           │
│  Back    Logo    Title    Version    Theme        │
├─────────────────────────────────────────────────────┤
│  STATUS BAR (System status, Time, Connection)        │
├─────────────────────────────────────────────────────┘
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │              TAB NAVIGATION                     │  │
│  │  Repos | Mappings | AI Flags | Keywords | Jobs │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │              TAB CONTENT                        │  │
│  │  (Data tables, forms, etc.)                  │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Components
- **Header:**
  - Back button (brutal style)
  - Logo + title
  - Version badge
  - Theme toggle
- **Status Bar:**
  - System status indicator (green dot)
  - Mode indicator
  - Timezone
  - Live clock
  - Connection status
- **Tab Navigation:**
  - 5 tabs in a row
  - Active tab indicator
  - Smooth transitions
- **Tab Content:**
  - Data tables
  - Action buttons
  - Forms
  - Filters/search

#### Animations
- Tabs: Slide animation on switch
- Tables: Fade-in on data load
- Status indicators: Pulse animation
- Clock: Updates every second
### 5. Repo Detail Page (`/repo/[id]`)
#### Layout
```
┌─────────────────────────────────────────────────────┐
│                    HEADER                           │
│  Back    Repo Name    Provider    Last Sync   Theme  │
├─────────────────────────────────────────────────────┘
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │              STATS OVERVIEW                   │  │
│  │  Total Commits | AI % | Lines Changed | Branches│  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │              CHART SECTION                      │  │
│  │  Commit activity timeline                   │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │              TABS (Commits | Branches | Developers) │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │              DATA TABLE                         │  │
│  │  Sortable, filterable, paginated            │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Components
- **Header:** Standard with back button
- **Stats Overview:**
  - 4 stat cards
  - AI percentage highlight
  - Trend indicators
- **Chart Section:**
  - Activity timeline chart
  - Interactive tooltips
  - Responsive sizing
- **Data Tabs:**
  - Commits tab
  - Branches tab
  - Developers tab
- **Data Tables:**
  - Sortable columns
  - AI detection badges
  - Click to expand
  - Pagination

#### Animations
- Stats: Counter animation
- Chart: Draw animation
- Tabs: Slide on switch
- Table rows: Staggered fade-in

- AI badges: Subtle glow effect

## Responsive Design

### Breakpoints
- **Mobile (sm):** < 640px
- **Tablet (md):** 768px - 1024px
- **Desktop (lg):** 1024px - 1280px
- **Large (xl):** > 1280px

### Mobile Adaptations
- **Header:** Reduced height, hamburger menu
- **Cards:** Full width, stacked
- **Tables:** Horizontal scroll or card view
- **Stats:** 2x2 grid instead of 4x1
- **Animations:** Reduced complexity for performance

### Touch Targets
- **Minimum:** 44px for tappable elements
- **Buttons:** 48px height
- **Form inputs:** 48px height
- **Table rows:** 48px height

## Accessibility

### Color Contrast
- **Normal text:** 4.5:1 minimum contrast ratio
- **Large text:** 3.1 minimum contrast ratio
- **Muted text:** Acceptable but readable
- **Interactive elements:** Clear focus indicators

- **AI badges:** High contrast for visibility

### Keyboard Navigation
- **Tab order:** Logical tab sequence
- **Focus indicators:** Visible focus rings
- **Skip links:** Skip to content sections
- **Escape:** Close modals/dropdowns
- **Enter:** Submit forms

- **Arrow keys:** Navigate lists/tables

### Screen Readers
- **Alt text:** Descriptive text for icons and images
- **Status indicators:** Announce state changes
- **Error messages:** Clear, actionable
- **Loading states:** Announce data fetching

## Implementation Notes

### File Organization
```
src/
├── components/
│   ├── ui/                 # Shared UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── index.ts
│   ├── dashboard/
│   │   ├── repo-list.tsx
│   │   └── add-repo-dialog.tsx
│   ├── admin/
│   │   ├── admin-tabs.tsx
│   │   ├── repos-tab.tsx
│   │   ├── mappings-tab.tsx
│   │   ├── ai-flags-tab.tsx
│   │   ├── keywords-tab.tsx
│   │   └── jobs-tab.tsx
│   └── repo-detail/
│       ├── commits-table.tsx
│       ├── branches-table.tsx
│       └── developer-stats.tsx
├── app/
│   ├── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── admin/
│   │   └── page.tsx
│   └── repo/[id]/
│       └── page.tsx
└── lib/
    └── styles/         # Shared styles
        └── globals.css
```

### CSS Architecture
- **CSS Variables:** All colors, spacing, shadows in `:root`
- **Utility Classes:** Animation helpers, status colors
- **Component Classes:** Button, card, badge variants
- **Page-specific:** Only when significantly different

### Performance Considerations
- **Font Loading:** Use `font-display: swap` for custom fonts
- **Animation Performance:** Use `will-change` for expensive animations
- **Bundle Size:** Tree-shake components where possible
- **Image Optimization:** Use Next.js Image component
- **Code Splitting:** Separate page components

## Migration Guide

### Phase 1: Dashboard Redesign
1. Update background system (gradient + orbs)
2. Redesign stat cards with glassmorphism
3. Update repo cards with new design
4. Add smooth animations
5. Ensure dark mode consistency

### Phase 2: Other Pages
1. Apply consistent header design
2. Update card styles to match dashboard
3. Add floating orbs to backgrounds
4. Ensure animation consistency
5. Test responsive design

### Phase 3: Polish & Test
1. Add micro-interactions
2. Test accessibility
3. Verify dark mode
4. Performance audit
5. Cross-browser testing

---

## Resolved Design Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Icon preferences? | **Lucide Icons** - Standard set. Brain/Sparkles for AI, GitBranch for repos, Shield for admin |
| 2 | Loading state preference? | **Skeleton loading** for data tables + **Spinner** for buttons + **Progress bar** for sync operations |
| 3 | Chart library? | **Recharts** - Already in use. Supports custom animations via `isAnimationActive` prop |
| 4 | Toast positioning? | **Bottom-right** (fixed), Sonner library (already installed) |
| 5 | Mobile nav pattern? | **Hamburger menu** with slide-in drawer (matches existing pattern) |

---

## Additional Component Specifications

### Loading States

#### Skeleton Loader
```tsx
<div className="skeleton">
  {/* Background: var(--muted) */}
  {/* Animation: pulse (2s infinite) */}
  {/* Border-radius: var(--radius) */}
</div>
```

**Skeleton Variants:**
- `.skeleton-text` - 1rem height, full width
- `.skeleton-avatar` - 40x40px, rounded-full
- `.skeleton-card` - 200x120px, full card shape
- `.skeleton-table-row` - Full width row

```css
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton {
  background: var(--muted);
  animation: skeleton-pulse 2s ease-in-out infinite;
  border-radius: var(--radius);
}
```

#### Spinner
```tsx
<div className="spinner">
  {/* Size: 16px (sm), 24px (md), 32px (lg) */}
  {/* Color: var(--primary) by default */}
  {/* Animation: spin 1s linear infinite */}
</div>
```

#### Progress Bar
```tsx
<div className="progress-bar">
  {/* Background: var(--muted) */}
  {/* Fill: var(--primary) */}
  {/* Height: 8px */}
  {/* Animation: stripe animation for indeterminate state */}
</div>
```

### Toast/Notification System

**Position:** Bottom-right (fixed positioning)
**Library:** Sonner (already installed)
**Duration:** 4000ms (default), persistent for errors

#### Toast Variants
```tsx
// Success - Green accent
toast.success('Operation completed')

// Error - Destructive color
toast.error('Operation failed', { duration: Infinity }) // Persistent

// Warning - Warning color
toast.warning('This action cannot be undone')

// Info - Primary color
toast.info('Sync started')

// Loading - With spinner
toast.loading('Processing...')
```

#### Toast Styling
```css
/* Sonner toast customization */
[data-sonner-toast] {
  background: var(--card) !important;
  border: 2px solid var(--border) !important;
  box-shadow: var(--shadow-brutal) !important;
  font-family: 'Sora', sans-serif !important;
  border-radius: var(--radius) !important;
}

[data-sonner-toast][data-type="success"] {
  border-color: var(--success) !important;
}

[data-sonner-toast][data-type="error"] {
  border-color: var(--destructive) !important;
}
```

### Dropdown/Select Component

```tsx
<div className="dropdown">
  {/* Trigger: Button with chevron icon */}
  {/* Content: Card-style container with options */}
  {/* Animation: scale-in from trigger */}
</div>

<select className="select">
  {/* Same styling as input */}
  {/* Custom chevron icon */}
  {/* Focus: border-primary */}
</select>
```

### Pagination Component

```tsx
<div className="pagination">
  {/* Container: flex gap-2 */}
  {/* Button: Ghost button style */}
  {/* Active: Primary background */}
  {/* Disabled: opacity-50, cursor-not-allowed */}
</div>
```

**Pagination Styling:**
```css
.pagination {
  display: flex;
  gap: 0.5rem;
}

.pagination-btn {
  min-width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--border);
  background: var(--card);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--muted);
}

.pagination-btn.active {
  background: var(--primary);
  color: var(--primary-foreground);
  border-color: var(--primary);
}
```

### Tooltip Component

```tsx
<div className="tooltip">
  {/* Background: var(--card) */}
  {/* Border: 2px solid var(--border) */}
  {/* Shadow: var(--shadow-brutal-sm) */}
  {/* Font: JetBrains Mono, 0.75rem */}
  {/* Max-width: 250px */}
</div>
```

### Confirmation Dialog

```tsx
<ConfirmDialog>
  {/* Title: Bold, uppercase */}
  {/* Message: Body text */}
  {/* Confirm button: Destructive variant */}
  {/* Cancel button: Ghost variant */}
</ConfirmDialog>
```

**For destructive actions:**
- Title: "Delete [Item]?"
- Message: Explain consequences
- Confirm: "Delete" (destructive button)
- Cancel: "Cancel" (ghost button)

### Error States

#### Form Validation Error
```tsx
<input className="input error" />
<p className="error-message">
  {/* Color: var(--destructive) */}
  {/* Font: 0.75rem */}
  {/* Icon: AlertCircle before text */}
</p>
```

```css
.input.error {
  border-color: var(--destructive);
}

.error-message {
  color: var(--destructive);
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  margin-top: 0.5rem;
}
```

#### Empty State
```tsx
<div className="empty-state">
  {/* Icon: Large, muted color */}
  {/* Title: Bold text */}
  {/* Description: Muted text */}
  {/* Action: Primary button (optional) */}
</div>
```

```css
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-state-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1.5rem;
  color: var(--muted-foreground);
}

.empty-state-title {
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.empty-state-description {
  color: var(--muted-foreground);
  font-size: 0.875rem;
  max-width: 400px;
  margin: 0 auto 1rem;
}
VIEW EMOTOROLA
```

### Theme Toggle Component

```tsx
<button className="theme-toggle">
  {/* Icon: Sun (light) / Moon (dark) */}
  {/* Position: Header right side */}
  {/* Animation: Rotate on switch */}
</button>
```

```css
.theme-toggle {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--border);
  background: var(--card);
  border-radius: var(--radius);
  transition: all 0.2s ease;
}

.theme-toggle:hover {
  background: var(--muted);
}

.theme-toggle svg {
  transition: transform 0.3s ease;
}

.theme-toggle:hover svg {
  transform: rotate(15deg);
}
```

---

## Accessibility Additions

### prefers-reduced-motion Support
```css
@media (prefers-reduced-motion) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Focus Visible
```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

### Skip Links
```tsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary);
  color: var(--primary-foreground);
  padding: 0.5rem 1rem;
  z-index: 100;
  transition: top 0.15s ease;
}

.skip-link:focus {
  top: 0;
}
```

---

## Staggered Animation Pattern

For list items with staggered animations:

```tsx
// Utility function for stagger delay
const getStaggerDelay = (index: number): string => {
  const delays = ['', 'delay-100', 'delay-200', 'delay-300', 'delay-400'];
  return delays[index % delays.length];
};

// Usage in component
{items.map((item, index) => (
  <div
    key={item.id}
    className={`animate-slide-up ${getStaggerDelay(index)}`}
  >
    {item.content}
  </div>
))}
```

