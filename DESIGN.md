# DESIGN.md - Kivara Luxury Travel Platform

## 1. Brand Identity & Foundation

**Product Domain:** Luxury romance travel across Africa's most intimate destinations<br>
**User Persona:** Affluent couples seeking bespoke, private journeys with exceptional service<br>
**Emotional Goal:** Evoke romance, exclusivity, and transformative experiences<br>
**Visual Language:** Premium, refined, timeless elegance with African craftsmanship

## 2. Color Palette (Design System Tokens)

### Primary Colors
- `brand-deep-black`: #050505 (near-black for depth)
- `brand-rich-cream`: #FDFBF7 (warm off-white)
- `brand-luxury-gold`: #C9A96E (primary accent)
- `brand-luxury-gold-light`: #D4BC8A (lighter gold)
- `brand-luxury-gold-dark`: #B8944A (darker gold)
- `brand-sage-green`: #8B7D6B (earthy complement)

### Secondary Colors
- `bg-primary`: var(--brand-deep-black)
- `bg-secondary`: var(--brand-rich-cream)
- `surface-light`: var(--brand-rich-cream)
- `surface-dark`: var(--brand-deep-black)
- `text-primary`: #1E1B16 (deep charcoal)
- `text-secondary`: #7A6F5D (warm gray)
- `border-subtle`: rgba(0,0,0,0.05)

## 3. Typography System

### Headings
- `font-display`: "Clash Display", "Trajan Pro", serif
  - Weights: 300, 400, 600
  - Letter spacing: -0.02em
  - Line height: 1.1

### Body Text
- `font-body`: "Geist", "Inter", sans-serif
  - Weights: 300, 400
  - Line height: 1.6
  - Letter spacing: 0

### Special Elements
- `font-caption`: "Geist Mono", monospace
  - Used for airport codes, metadata

## 4. Spacing & Layout

### Base Unit
- 4px (multiples of 4 for consistency)
- `space-0`: 0px, `space-1`: 4px, `space-2`: 8px, `space-3`: 12px
- `space-4`: 16px, `space-5`: 24px, `space-6`: 32px, `space-7`: 48px
- `space-8`: 64px, `space-9`: 96px, `space-10`: 128px

### Layout Patterns
- Container max-width: 1280px (desktop), 100% (mobile)
- Section padding: `py-24` to `py-40`
- Grid columns: 12-column grid with gutters of 24px
- Content gutters: `px-4` to `px-8`

## 5. Component Library

### Navigation
- Navbar height: 80px (desktop), 72px (mobile)
- Z-index hierarchy: header (50), dropdown (60), mobile overlay (70)
- Background: `backdrop-blur-2xl` with subtle border

### Cards & Containers
- Outer shell: `rounded-[2rem]` with `ring-1 ring-black/5`
- Inner core: distinct background, `rounded-[calc(2rem-0.375rem)]`
- Depth: `shadow-sm` for primary elevation, soft nested shadows

### Buttons
- Primary: `rounded-full px-6 py-3` with trailing icon circle
- States: hover scale 0.98, active transform

### Forms
- Inputs: `rounded-full border border-sand-light/50`
- Focus: ring-2 ring-gold/30
- Error states: border `border-error/50`

## 6. Motion & Animation

### Duration & Easing
- Standard: `duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]`
- Fast: `duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]`
- Stagger: `delay-100` between sequential elements

### Animation Types
- Entry: fade-up `translate-y-16 blur-md opacity-0` to `translate-y-0 blur-0 opacity-100`
- Hover: scale and transform effects
- Scroll: IntersectionObserver-based reveal animations

### Micro-interactions
- Hamburger morph: lines to X with rotation
- Dropdown: slide-up with opacity and scale
- CTA buttons: icon circles translate diagonally on hover

## 7. Visual Guidelines

### Anti-Patterns
- NO emojis in UI (use Phosphor/Remix icons)
- NO edge-to-edge sticky navbars
- NO generic sans-serif fonts (Inter, Roboto, Arial)
- NO harsh drop shadows
- NO static element appearances (all animated)

### Best Practices
- All containers use Double-Bezel architecture (outer shell + inner core)
- Motion uses `transform` and `opacity` only
- `backdrop-blur` only on fixed/sticky elements
- Grid collapses to single column below 768px with generous gaps
- Touch targets minimum 44px
- High contrast: AA accessibility for text

## Mobile Design System

### Breakpoints
- `sm`: 640px
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)

### Mobile Specifics
- Grid: `grid-cols-1`
- Navigation: full-width with `px-4 py-4`
- Cards: `rounded-[1.5rem]` (smaller radius)
- Font sizes: body text `text-sm`, headings `text-2xl`
- Touch targets: 44px minimum
- Spacing: `px-4`, `py-16` (more breathing room)

### Mobile-First Approach
1. **Foundation**: Establish core tokens and base styles
2. **Components**: Build cards, buttons, navigation
3. **Desktop**: Layer desktop-specific overrides with `hover` states
4. **Interactions**: Ensure mobile and desktop motion systems work identically

### Device-Specific Considerations
- iOS Safari: Use `min-h-[100dvh]` instead of `h-screen`
- Touch feedback: clear affordances with scale and shadow
- Scroll behavior: smooth scrolling with momentum
- Visual hierarchy: stack items vertically with clear visual separation

### Design Validation
Each component must pass:
- Design system compliance (all tokens reference DESIGN.md)
- Mobile presentation testing (375px, 768px, 1280px)
- Touch interaction testing (tap targets, swipe gestures)
- Accessibility verification (screen reader, keyboard navigation)
- Performance testing (60fps animations, minimal layout shifts)

---
*Last Updated: Current iteration*
*Designer: AI System* 
*Version: 1.0*