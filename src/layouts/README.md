# JDP-002 — Global Application Shell

## Overview

The application shell (`src/layouts/`) is the premium layout foundation for Jan Darpan V3. It wraps all reader surfaces with consistent navigation, search, and responsive containers — without modifying page content or business logic.

Built on top of **JDP-001 Design System** tokens (`--jds-*`). Does not modify the design system.

---

## Structure

```
src/layouts/
├── AppShell/           # Root shell composition + ShellProvider
├── TopBar/             # Sticky header (56px mobile / 64px desktop)
├── BottomNavigation/   # 5-tab mobile dock with scroll-hide
├── DesktopSidebar/     # Collapsible, resizable sidebar (lg+)
├── CommandPalette/     # Cmd+K / Ctrl+K global search
├── SearchOverlay/      # Mobile search sheet
├── QuickActions/       # FAB search + AI shortcuts
├── PageContainer/      # Semantic main + max-width
├── ContentContainer/   # Width-constrained content
├── SafeArea/           # iOS safe-area insets
├── ResponsiveGrid/     # Breakpoint-aware grid
├── ScrollArea/         # Scroll container with reduced-motion
├── hooks/              # Scroll, sidebar, top bar hooks
├── styles/shell.css    # Shell styles (jdp-* classes)
└── index.ts            # Barrel export
```

---

## Integration (production — Atlas Phase 1)

`AppLayout` delegates to `AppShell`. Production reader chrome is the Atlas
global app shell: Header / Content / ContextBar slot / BottomNav.

```tsx
// src/components/layout/AppLayout.tsx — current production bridge
import { AppShell } from "@/layouts";
import { HOME_STACK_SLOT_ID } from "@/lib/layout/stack-heights";

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <AppShell
      homeStackSlot={/* #home-stack-slot on homepage */}
    >
      {children}
    </AppShell>
  );
}
```

**Rollback:** restore `MainHeader` + `BottomMobileNav` + `CategoryNavbar`
from git history (removed in Atlas Phase 1 as dead/deprecated chrome).

**Preserved contracts:**
- `.app-feed` — main content slot
- `#app-sticky-stack` — sticky chrome stack
- `#main-content` — available via `PageContainer`
- Story mode hides bottom nav automatically

---

## Components

### AppShell
Root wrapper. Provides `ShellProvider`, composes sidebar + top bar + feed + bottom nav + overlays.

### TopBar
| Viewport | Height | Contents |
|----------|--------|----------|
| Mobile | 56px | Logo, district, search, notifications |
| Desktop | 64px | Logo, district, search bar (⌘K), notifications, avatar |

- Sticky with blurred background
- Shadow only while scrolling (`useTopBarScrolled`)

### BottomNavigation
Five items: **Home · District · AI · Alerts · You**

- Animated active indicator
- Safe-area padding
- Hides on scroll down, reveals on scroll up
- Hidden on `/story/*` routes

### DesktopSidebar
- Collapsed (72px) / expanded (260px default)
- Drag resize handle (200–360px)
- State persisted to `localStorage` (`jdp-sidebar-state`)
- Keyboard accessible toggle

### CommandPalette
- **Cmd+K** / **Ctrl+K** globally
- Searches: articles (API), districts, topics, commands, recent
- Arrow keys + Enter + Escape
- Lazy-loaded article results with debounce

### SearchOverlay
- Mobile sheet triggered via `setSearchOpen(true)` from `ReaderPreferencesProvider`
- Reuses existing `SearchPanel` — no API changes

### Containers

| Component | Max width |
|-----------|-----------|
| `ContentContainer width="article"` | 760px |
| `ContentContainer width="homepage"` | 1280px |
| `ContentContainer width="dashboard"` | 1440px |

---

## Breakpoints

| Token | Value |
|-------|-------|
| sm | 480px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

---

## Accessibility

- WCAG AA focus rings via JDS `--jds-focus-ring`
- `role="banner"`, `role="navigation"`, `role="dialog"` landmarks
- Command palette: `aria-activedescendant`, keyboard listbox pattern
- Search overlay: focus trap, Escape to close
- `prefers-reduced-motion`: disables scroll-hide animation and smooth scroll

---

## Performance

- `CommandPalette`, `SearchOverlay`, `SuperMenuDrawer` — dynamic import (`ssr: false`)
- Scroll handlers use `requestAnimationFrame` + passive listeners
- Sidebar state debounced to localStorage on change
- No layout shift: fixed chrome heights, safe-area padding pre-calculated

---

## What NOT to change

Per JDP-002 scope:
- Backend, APIs, database, auth, AI pipeline, editorial workflow
- Homepage and article page components
- JDP-001 design system files

---

## Usage examples

```tsx
import {
  AppShell,
  PageContainer,
  ContentContainer,
  ResponsiveGrid,
} from "@/layouts";

// Page-level wrapper
<PageContainer width="article">
  <article>{/* existing article content */}</article>
</PageContainer>

// Grid layout
<ResponsiveGrid columns={3}>
  {items.map(...)}
</ResponsiveGrid>

// Shell context
import { useShell } from "@/layouts";
const { openCommandPalette, toggleSidebar } = useShell();
```
