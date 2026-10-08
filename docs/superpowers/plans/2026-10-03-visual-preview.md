# 深海蓝·琥珀安全视觉预览 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone visual preview page that demonstrates the full system visual language across login, dashboard, hazard closure, field devices, reports, analytics, and knowledge pages before production route integration.

**Architecture:** Keep the current production app untouched. Add a second Vite HTML entry at `/visual-preview.html` with a focused React preview component under `src/design/`. The preview uses a shared navigation frame plus page-specific visual compositions, using only local assets under `public/brand/` and `public/ui-backgrounds/`.

**Tech Stack:** React 18, TypeScript, Vite, lucide-react, CSS, generated PNG assets.

## Global Constraints

- Keep existing business routes, data, and backend behavior unchanged.
- Use local generated images only; do not add external image URLs or services.
- Do not bake Chinese text, labels, metrics, or logos into raster assets.
- Mark the page clearly as a visual design preview and do not treat it as production authentication.
- Preserve responsive behavior down to narrow mobile widths and respect reduced motion.

---

### Task 1: Register the visual preview entry

**Files:**
- Create: `visual-preview.html`
- Modify: `vite.config.ts` input map

**Interfaces:**
- Produces the `/visual-preview.html` entry consumed by the Vite dev server and production build.

- [ ] **Step 1: Add the HTML entry**

Create a minimal document with `lang=zh-CN`, viewport metadata, a descriptive title, and `<script type="module" src="/src/design/visual-preview-main.tsx"></script>`.

- [ ] **Step 2: Register the entry in Vite**

Add `visual: "visual-preview.html"` beside the existing `app` and `design` inputs without removing the existing entries.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: Vite emits `dist/visual-preview.html` and TypeScript reports no new errors.

- [ ] **Step 4: Commit**

```bash
git add visual-preview.html vite.config.ts
git commit -m "feat: add visual preview entry"
```

### Task 2: Build the visual preview component

**Files:**
- Create: `src/design/VisualPreview.tsx`
- Create: `src/design/visual-preview-main.tsx`

**Interfaces:**
- `VisualPreview` renders the full preview with no production state or persistence.
- `visual-preview-main.tsx` mounts `VisualPreview` and imports its stylesheet.

- [ ] **Step 1: Create the React entry**

Mount `<VisualPreview />` with `React.StrictMode` and import `./VisualPreview.css`.

- [ ] **Step 2: Define local asset data**

Use exact paths:

```ts
const assets = {
  mark: "/brand/brand-mark.png",
  markLight: "/brand/brand-mark-light.png",
  hero: "/ui-backgrounds/login-hero.png",
  dashboard: "/ui-backgrounds/dashboard-atmosphere.png",
  hazard: "/ui-backgrounds/hazard-amber.png",
  helmet: "/ui-backgrounds/helmet-field.png",
  report: "/ui-backgrounds/report-evidence.png",
  park: "/ui-backgrounds/park-overview.png",
  knowledge: "/ui-backgrounds/knowledge-grid.png",
  texture: "/ui-backgrounds/card-texture.png"
} as const;
```

- [ ] **Step 3: Render the login composition**

Render a two-column `section` with the hero image and a dark login card. Include HTML text for the product name, the sentence “每一处风险，都有迹可循”, demo account fields, and a non-submitting “进入演示预览” button that updates a small inline status message.

- [ ] **Step 4: Render the system page previews**

Render seven page states: login, dashboard, hazard closure, field devices, reports, analytics, and knowledge center. Reuse shared shell components for sidebar, topbar, metric cards, image panels, and evidence strips so the visual language is visibly consistent.

- [ ] **Step 5: Add a page switcher**

Render a small bottom control with one button per page state. Switching state changes the preview focus without URL state or persistence. Add a compact asset legend in the dashboard state so each generated background's intended use is visible.

### Task 3: Style the preview page

**Files:**
- Create: `src/design/VisualPreview.css`

**Interfaces:**
- Defines all `.visual-preview-*` selectors and does not change production selectors.

- [ ] **Step 1: Add the design tokens**

Use deep navy `#071B31`, steel blue `#356B9B`, amber `#F1B65C`, cool white `#F5F8FB`, and muted slate text. Add layered gradients over image backgrounds so text remains readable.

- [ ] **Step 2: Style the login split layout**

Use a 12-column CSS grid with the hero spanning 7 columns and the login panel spanning 5 columns on desktop. Use `minmax(0, 1fr)` and `overflow: hidden` for all repeated cards.

- [ ] **Step 3: Style shared workspace and page cards**

Use a compact dark sidebar, pale content canvas, 12-column content grid, fixed image frames, `object-fit: cover`, dark bottom gradients, and visible focus styles. Keep page-specific layouts balanced: dashboard metrics and evidence, hazard timeline and risk cards, device status cards, report evidence, analytics map image, and knowledge graph image.

- [ ] **Step 4: Add responsive and reduced-motion rules**

At widths below 900px switch to one column; at widths below 560px reduce padding and make the login panel full width. Under `prefers-reduced-motion: reduce`, disable image transforms and transitions.

### Task 4: Validate the design preview

**Files:**
- Test: generated build output and browser view of `/visual-preview.html`

**Interfaces:**
- No production API or backend dependency.

- [ ] **Step 1: Run the build**

Run: `npm run build`
Expected: `dist/visual-preview.html` exists and build exits with code 0.

- [ ] **Step 2: Open the preview in the local browser**

Run the frontend dev server and open `http://127.0.0.1:5173/visual-preview.html` (or the port reported by Vite). Check the login composition, logo contrast, card image loading, and no horizontal overflow.

- [ ] **Step 3: Check narrow layout**

Resize or use a narrow viewport and verify the login panel and material gallery stack cleanly without clipped text or images.

- [ ] **Step 4: Capture the design decision**

Record the chosen preview state and any requested adjustments in the follow-up implementation task before integrating into `App.tsx`.
