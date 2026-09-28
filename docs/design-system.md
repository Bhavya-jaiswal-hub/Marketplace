# Multi-Vendor Marketplace - Frontend Design System & UI Specification

**Version:** 1.0.0  
**Status:** Approved Design Baseline  
**Scope:** Customer Web Storefront, Seller Portal, and Super Admin Dashboards  

---

## 1. Design Philosophy & Visual Language

The design system establishes a **modern, high-performance, and visually captivating** e-commerce experience. It combines sleek modern minimalism with subtle glassmorphism, rich tactile micro-interactions, and high-density information architecture.

### Core Principles
1. **Visual Distinction**: Avoid generic template styling. Use bespoke gradients, soft layered shadows, and crisp typography to create an immediate impression of luxury and quality.
2. **Predictable Consistency**: Every button, input, product card, status badge, and price display must follow strict shared tokens across all views.
3. **Frictionless Trust**: Clear verification indicators for independent sellers, transparent stock indicators (*"Only 8 left"*), and distinct financial summaries (MRP vs Discounted Price vs GST).

---

## 2. Typography System

The typography is built on Google Fonts:
- **Heading & Display Font**: `Plus Jakarta Sans` (Geometric, clean, modern, high impact)
- **Body, UI & Forms Font**: `Inter` (Exceptional readability, balanced x-height at all sizes)
- **Data & Monospace Font**: `JetBrains Mono` (SKUs, Order IDs, PIN Codes, Tracking Numbers)

### Type Scale & Hierarchy

| Token | Size | Line Height | Weight | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `font-display-2xl` | 48px / 3rem | 1.1 | 800 (ExtraBold) | -0.025em | Main Hero headings, Marketing titles |
| `font-display-xl` | 36px / 2.25rem | 1.2 | 700 (Bold) | -0.02em | Section titles, Hero subtitles |
| `font-heading-lg` | 30px / 1.875rem | 1.25 | 700 (Bold) | -0.015em | Category titles, Product names (PDP) |
| `font-heading-md` | 24px / 1.5rem | 1.3 | 600 (SemiBold) | -0.01em | Modal headers, Card section headers |
| `font-heading-sm` | 20px / 1.25rem | 1.35 | 600 (SemiBold) | 0 | Sub-headers, Product grid card titles |
| `font-body-lg` | 18px / 1.125rem | 1.5 | 400 / 500 | 0 | Lead paragraphs, Featured summaries |
| `font-body-md` | 16px / 1rem | 1.5 | 400 / 500 | 0 | Standard body text, Form inputs, Buttons |
| `font-body-sm` | 14px / 0.875rem | 1.45 | 400 / 500 | 0 | Secondary descriptions, Table data |
| `font-caption` | 12px / 0.75rem | 1.4 | 500 / 600 | +0.01em | Badges, Timestamps, Helper text |
| `font-mono-sm` | 13px / 0.8125rem| 1.4 | 500 | +0.02em | Order numbers (`#ORD-2026-8800`), SKUs |

---

## 3. Color Tokens & Palette

### 3.1 Primary Brand Tokens (Electric Indigo & Champagne Luxe)
- **Primary / Brand**: `#4F46E5` (`indigo-600`)
- **Primary Hover**: `#4338CA` (`indigo-700`)
- **Primary Active / Dark**: `#3730A3` (`indigo-800`)
- **Primary Subdued / Glow**: `rgba(79, 70, 229, 0.12)`
- **Accent Gold (Luxury / Verified)**: `#D97706` / `#F59E0B` (Amber / Gold)

### 3.2 Neutral Palette (Clean Light Mode & Dark Surfaces)

```css
:root {
  /* Surface & Background */
  --bg-app: #F8FAFC;              /* Crisp slate canvas */
  --bg-surface: #FFFFFF;          /* Pure white card canvas */
  --bg-surface-elevated: #FFFFFF; /* High elevation modal/dropdown */
  --bg-surface-subtle: #F1F5F9;   /* Muted container / pill background */
  
  /* Borders & Dividers */
  --border-subtle: #E2E8F0;       /* Light border */
  --border-default: #CBD5E1;      /* Standard card border */
  --border-focus: #6366F1;        /* Focused ring border */

  /* Text & Typography */
  --text-primary: #0F172A;        /* Deep slate black (highest contrast) */
  --text-secondary: #475569;      /* Slate neutral body text */
  --text-muted: #94A3B8;          /* Light caption / placeholder text */
  --text-inverse: #FFFFFF;        /* White text on dark elements */
}
```

### 3.3 Semantic & Feedback Status Tokens

| Semantic Role | Background | Text / Icon | Border | Example Context |
|---|---|---|---|---|
| **Success / Verified** | `#ECFDF5` (`emerald-50`) | `#059669` (`emerald-600`) | `#A7F3D0` | In Stock, Verified Seller, Return Approved |
| **Warning / Urgency** | `#FFFBEB` (`amber-50`) | `#D97706` (`amber-600`) | `#FDE68A` | Low Stock Alert (*"8 left"*), Pending Review |
| **Danger / Destructive** | `#FEF2F2` (`rose-50`) | `#E11D48` (`rose-600`) | `#FECDD3` | Out of Stock, Order Cancelled, Form Error |
| **Info / Progress** | `#EFF6FF` (`blue-50`) | `#2563EB` (`blue-600`) | `#BFDBFE` | Shipped, Processing, KYC in progress |

---

## 4. Spacing, Radii, and Elevation

### 4.1 Base 4px Spacing System
`4px` (`xs`), `8px` (`sm`), `12px` (`md`), `16px` (`lg`), `20px` (`xl`), `24px` (`2xl`), `32px` (`3xl`), `48px` (`4xl`), `64px` (`5xl`).

### 4.2 Border Radii
- **`rounded-sm`**: `4px` (Tags, small pills)
- **`rounded-md`**: `8px` (Inputs, buttons, small dropdowns)
- **`rounded-lg`**: `12px` (Product cards, cart item containers)
- **`rounded-xl`**: `16px` (Modals, banners, large feature cards)
- **`rounded-full`**: `9999px` (Badges, avatar rings, floating pills)

### 4.3 Shadows & Elevation
- **Elevation 1 (Card Default)**: `0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)`
- **Elevation 2 (Card Hover / Dropdown)**: `0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)`
- **Elevation 3 (Modal / Cart Drawer)**: `0 20px 40px -15px rgba(0, 0, 0, 0.16)`
- **Glow Shadow (Primary Accent)**: `0 0 20px -2px rgba(79, 70, 229, 0.35)`

---

## 5. Reusable Component Guidelines

### 5.1 Buttons
- **Primary Button**: Solid `#4F46E5` background, white text, bold font, subtle hover scale (`scale-[1.02]`) and active tap effect (`scale-[0.98]`).
- **Secondary Button**: Crisp `#F1F5F9` background, `#0F172A` text, hover `#E2E8F0`.
- **Outline Button**: `#FFFFFF` background, 1.5px `#E2E8F0` border, `#0F172A` text, hover border `#CBD5E1`.
- **Ghost Button**: Transparent background, text `#475569`, hover `#F8FAFC`.

### 5.2 Form Inputs & Indian PIN Code Fields
- Height: `44px` with `12px` horizontal padding.
- Crisp border with smooth transition to `ring-2 ring-indigo-500/20 border-indigo-600`.
- Integrated helper labels with automatic 6-digit Indian PIN code state/city autocomplete.

### 5.3 Product Grid Cards
- **Aspect Ratio**: 1:1 image container with smooth `scale-105` zoom transition on hover.
- **Badges**:
  - Discount Pill (e.g. `"-35% OFF"` in bold rose badge).
  - Verified Seller Pill with shield icon.
  - Low Stock Indicator (*"Only 5 left"* in amber).
- **Price Format**: High-contrast bold current price (`₹4,999`) with muted strikethrough MRP (`₹7,999`) and savings amount.
- **Quick Action**: 1-click `"Add to Cart"` button that triggers visual cart ripple and drawer slide-out.

### 5.4 Slide-Over Cart Drawer
- Multi-seller grouping with clear store name dividers.
- Per-item quantity controls (`+` / `-`) with instantaneous optimistic price recalculation.
- Free delivery progress meter and direct checkout button.

---

## 6. Micro-Interactions & Animation Specs

```typescript
export const transitions = {
  snappy: { type: 'spring', stiffness: 400, damping: 25 },
  smooth: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  fade: { duration: 0.15, ease: 'easeInOut' },
};
```

- **Hover States**: All clickable elements must have a transition of `150ms ease-in-out`.
- **Cart & Notification Badges**: Pulse animation on new item added.
- **Skeletons & Loading**: Shimmer effect on placeholder boxes (`gradient-to-r from-slate-100 via-slate-200 to-slate-100`).
