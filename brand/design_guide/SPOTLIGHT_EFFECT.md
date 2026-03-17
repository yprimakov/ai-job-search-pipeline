# Spotlight Glow Effect — Design Brief

## What the effect looks like

Each card on the page has two invisible glowing orbs hidden behind it. When the mouse moves anywhere on the page, both orbs silently track the cursor and become partially visible — creating the illusion that a soft spotlight is shining down from wherever the mouse is, causing each card to subtly illuminate where the light "hits" it. The effect is ambient and diffused, not sharp — more like a light source in a room than a laser pointer.

---

## How it works technically

Three layers work together.

### Layer 1 — Global mouse tracking

A `useMousePosition` hook listens to `window.mousemove` and stores the cursor's `clientX`/`clientY` in state. This gives the entire page a single source of truth for where the mouse is.

### Layer 2 — The Spotlight container

A wrapper `<div>` around the entire card grid. On every mouse move (throttled to ~100ms), it calculates the cursor's position **relative to its own bounding box** (`clientX - rect.left`, `clientY - rect.top`) and writes those values as CSS custom properties (`--mouse-x`, `--mouse-y`) directly onto the container element via `style.setProperty`.

### Layer 3 — The SpotlightCard (the glow itself)

Each card is wrapped in a `<div>` that uses **CSS `::before` and `::after` pseudo-elements** as the actual glow sources. The key mechanics:

- Both pseudo-elements are **large blurred circles** — `::before` is 320×320px, `::after` is 384×384px
- They are **offset so their center starts at the top-left corner** of the card: `left: -160px; top: -160px` (half their size, negative), so position `0,0` means the center of the orb is at the card's top-left corner
- They move using `transform: translate(var(--mouse-x), var(--mouse-y))` — since the CSS vars are set per-card relative to the card's own position, the orb center lands exactly on the cursor
- Each card **independently recalculates** the mouse position relative to its own bounding box and sets its own `--mouse-x`/`--mouse-y` on itself. This means every card tracks the cursor independently — when the cursor is over card A, card A lights up fully; card B also reacts because the mouse position relative to B places the orb near its edge
- The `::before` orb is **white/slate** at ~20% opacity — this creates the white "shine" layer
- The `::after` orb is **violet** at 10–20% opacity — this creates the purple/violet color tint
- Both are blurred with `blur: 100px` — an extreme blur that makes them look like a soft diffused light source, not a circle
- `overflow: hidden` on the card clips both orbs so glow never bleeds outside card boundaries
- Opacity transitions use `transition: opacity 500ms` — the fade in/out is slow enough to feel like light warming up, not a hard toggle

### The card itself

Inside the glow wrapper sits the actual card content at `z-index: 20`, sandwiched between the two glow layers (`::before` at z-index 10, `::after` at z-index 30). The card background is semi-transparent with `backdrop-filter: blur()`, so the glow from behind bleeds through slightly. A subtle inset box shadow (`inset 0px 1px 0px rgba(255,255,255,0.1)`) adds a thin top-edge highlight that makes the card look slightly raised.

---

## Key numbers

| Property | Value |
|---|---|
| `::before` orb size | 320×320px |
| `::after` orb size | 384×384px |
| `::before` offset | `left: -160px; top: -160px` |
| `::after` offset | `left: -192px; top: -192px` |
| Blur radius | `100px` on both orbs |
| `::before` color | white/slate — `rgba(248, 250, 252, 1)` |
| `::after` color | violet — `rgb(139, 92, 246)` dark / `rgb(237, 233, 254)` light |
| `::before` opacity | 20% always-on |
| `::after` opacity | 20% light mode / 10% dark mode on hover |
| Opacity transition | 500ms |
| Mouse update throttle | 100ms |
| Card border-radius | `1.5rem` |
| Outer wrapper border | `1px` padding (glow bleeds through this gap as a rim light) |

---

## The subtle detail that makes it feel special

The `1px` padding on the outer wrapper combined with the card's own background creates a **hairline border effect**. The glow orbs sit in that 1px gap between the outer wrapper and the inner card, making it look like a faint colored rim light appears around the card edge nearest the cursor. This is the detail most people can't quite identify but feel strongly — it makes the card look like it's physically lit from within.

---

## Implementation architecture (React)

```
<Spotlight>                          ← sets --mouse-x/--mouse-y on container (throttled 100ms)
  <SpotlightCard>                    ← ::before (white orb) + ::after (violet orb), tracks per-card
    <div z-20>                       ← actual card content, semi-transparent bg + backdrop-blur
      {children}
    </div>
  </SpotlightCard>
</Spotlight>
```

**Key files in this project:**
- `src/components/Spotlight.tsx` — `Spotlight` wrapper + `SpotlightCard` component
- `src/components/common/Card.tsx` — wraps `SpotlightCard` with hover/scale/active state logic
- `src/lib/utils/useMousePosition.ts` — global mouse position hook
