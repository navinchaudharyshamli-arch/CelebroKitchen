# Design System Specifications & Performance Budget (`DESIGN.md`)

## 1. Tokens & Design System Variables

Celebro Kitchen uses a warm, paper-like palette with minimal flat surfaces, 1px hairlines, generous spacing, zero purple/indigo, zero gradients, zero web fonts, and zero decorative images.

```css
:root {
  --bg: #F6F4EF;          /* Warm paper background */
  --surface: #FFFFFF;     /* White card / sheet background */
  --surface-2: #EFECE5;   /* Fills & empty squares */
  --line: #E2DED4;        /* 1px hairlines */
  --ink: #1C1B19;         /* Near-black text */
  --ink-2: #6B665D;       /* Warm grey secondary text */
  --accent: #B4532A;      /* Terracotta accent for buttons, links, today ring */
  --ok: #3F7A4D;          /* Sage green for taken status */
  --ok-soft: #E3EEDF;     /* Upcoming tick tint */
  --skip: #B7791F;        /* Saffron / amber for skipped status */
  --skip-soft: #F5E8CC;   /* Skipped tint */
  --extra: #2E6C70;       /* Deep teal for extra meals */
  --closed: #9A958B;      /* Closed day tint */
  --danger: #B3382C;      /* Red for errors / destructive actions */
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #141311;
    --surface: #1D1B18;
    --surface-2: #26231F;
    --line: #34302A;
    --ink: #F1EEE7;
    --ink-2: #A29D92;
    --accent: #D9784B;
    --ok: #5FA06D;
    --ok-soft: #1F2D22;
    --skip: #D4A24A;
    --skip-soft: #33291A;
    --extra: #5AA3A8;
    --closed: #6F6A60;
    --danger: #E0675B;
  }
}
```

## 2. Typography
- **System Font Stack (0 Web Downloads)**:
  `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, sans-serif`
- **Tabular Numbers**: Applied to clocks, dues, and counts (`font-variant-numeric: tabular-nums`).

## 3. Radii & Spacing
- **Meal Squares**: 12px corner radius (48px to 52px tap targets).
- **Cards**: 16px corner radius.
- **Buttons**: 12px corner radius, minimum height 48px.
- **Hairlines**: 1px solid `var(--line)` (no heavy drop shadows).

## 4. Measured Performance Budget
- **First-load JS**: ~65 KB gzipped.
- **Web Fonts**: 0 KB (System fonts).
- **LCP Target**: < 1.2s on 4G network profile.
- **Accessibility**: 100% WCAG AA contrast ratio compliance across light and dark modes.
