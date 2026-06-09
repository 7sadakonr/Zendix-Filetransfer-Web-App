---
name: Zendix Design System
description: Liquid glass P2P interface optimized for high-speed direct sharing.
colors:
  primary: "#06b6d4"
  primary-glow: "#67e8f9"
  neutral-bg: "#1a1a1a"
  neutral-surface: "#2a2a2a"
  neutral-border: "#ffffff26"
  neutral-ink: "#e5e5e5"
  neutral-muted: "#a3a3a3"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "8px"
  md: "18px"
  lg: "32px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "#ffffff"
    textColor: "#1f2937"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "#f9fafb"
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: Zendix

## 1. Overview

**Creative North Star: "The Liquid Capsule"**

Zendix utilizes a modern, dark "liquid glass" visual philosophy designed to mimic the feeling of high-speed fluid connectivity. Interactive panels resemble translucent glass containers holding floating, animated fluid cores (QR codes, state pulses, and loading shimmers) that shift dynamically to represent direct WebRTC connection states. The interface feels premium, highly-engineered, and extremely fast, avoiding any unnecessary steps or heavy cloud metaphors.

In compliance with the product register, Zendix rejects cluttered utilities, generic light-themed SaaS cards, and slow decorative motion that gets in the way of a user's task. Instead, the design maintains strict density, high-contrast text, clear visual cues, and 150-250ms transitions that prioritize instant execution.

**Key Characteristics:**
- **Refractive Depth**: Radial background glows and translucent panels with blur filters (`backdrop-blur-2xl`) emulate premium glass layers.
- **Dynamic Fluidity**: Continuous, low-intensity keyframe animations (`liquidFloat`, `liquidSheen`) represent an active, live peer-to-peer circuit.
- **Tactile Feedback**: Interactive states react instantly with subtle scaling up (scale-102), brightness increases, and drop-shadow expansion.
- **Tighter Information Density**: Clear layout hierarchy that comfortably lists multiple recent connections, transfer speeds, and progress tracks.

## 2. Colors

Zendix relies on a highly restrained, dark-mode-first color scheme with one core active cyan accent and high-contrast neutral inks.

### Primary
- **Liquid Cyan** (#06b6d4 / oklch(63% 0.22 230)): Used strictly for active connections, successful handshakes, primary interactive focus, and direct WebRTC data transfer tracks.
- **Aqua Glow** (#67e8f9 / oklch(86% 0.16 215)): High-intensity cyan used for core animations, highlight sheens, and loading shimmer sweeps.

### Neutral
- **Deep Charcoal** (#1a1a1a / oklch(20% 0.00 0)): The canvas background. Provides an elegant, zero-fatigue dark base suitable for high ambient or low-light situations.
- **Glass Charcoal** (#2a2a2a / oklch(28% 0.00 0)): Translucent card surface fill (applied with opacity, e.g., 70%).
- **Translucent Border** (#ffffff26 / oklch(100% 0.00 0 / 15%)): White-15 stroke used for glassy card panels and subtle dividers.
- **Ice White** (#e5e5e5 / oklch(92% 0.00 0)): The main body ink, offering exceptional contrast against charcoal glass.
- **Ash Gray** (#a3a3a3 / oklch(71% 0.00 0)): Secondary text, metadata, and placeholder ink.

### Named Rules
**The Restrained Accent Rule.** The active Liquid Cyan accent must never exceed 10% of any screen's surface area. Its rarity guarantees that it instantly guides the eye to the connection status and transfer progress.
**The No-Faded-Ink Rule.** Muted gray text on any dark background must maintain a contrast ratio of at least 4.5:1. Never drop opacity below 60% for body copy or form labels.

## 3. Typography

Zendix leverages a single, robust typographic family to preserve speed and avoid visual indecision.

**Body & UI Font:** Inter (with system-ui, Avenir, Helvetica, Arial sans-serif fallbacks)

**Character:** Clean, objective, geometric, and technical. The weight contrast behaves as the primary axis of hierarchy, creating structure without the noise of multiple typefaces.

### Hierarchy
- **Display** (SemiBold (600), 20px-24px (1.25rem-1.5rem), line-height: 1.2): Used for primary page/card section titles (e.g., "Your Identity", "Connect to Peer").
- **Headline** (Medium (500), 16px-18px (1rem-1.125rem), line-height: 1.3): Used for sub-sections, panel titles, and device names.
- **Body** (Regular (400), 14px-15px (0.875rem-0.9375rem), line-height: 1.5): Used for general UI text, status alerts, and long-form descriptions. Max line length: 65ch.
- **Label** (Medium (500), 10px-12px (0.625rem-0.75rem), letter-spacing: 0.1em, uppercase): Used for eyebrows, metadata tags, and input labels (e.g., "DEVICE ID", "PEER ID").

### Named Rules
**The Tighter Ratio Rule.** Keep font steps between 1.125 and 1.2. Product interfaces require dense information hierarchy; oversized displays distract from the workspace.

## 4. Elevation

Depth is conveyed through a hybrid of translucent glass layers, backdrop filters, and soft, natural shadows instead of flat, solid borders.

### Shadow Vocabulary
- **Glass Rest Shadow** (`0 8px 32px rgba(0, 0, 0, 0.4)`): Soft ambient shadow that establishes a card's visual layer above the background canvas.
- **Active Lift Shadow** (`0 14px 34px rgba(0, 0, 0, 0.32)`): Expanded shadow triggered during hover or active modal focus to simulate physical elevation.

### Named Rules
**The Glass Stack Rule.** Glass layers are layered sequentially. The base background holds the ambient glow, the panels hover with backdrop-blur-2xl, and dropdowns/modals sit on the absolute top with a dark backdrop-mask.

## 5. Components

### Buttons
- **Shape:** Medium rounded corners (8px (0.5rem)).
- **Primary:** Crisp white background (#ffffff) with charcoal text (#1f2937). Padding: `10px 20px`. Hover triggers scale up (102%) and subtle white shadow glow.
- **Secondary / Ghost:** Translucent background (`rgba(255, 255, 255, 0.05)`) with a white-10 border. Hover increases opacity to 10% and sharpens the border stroke.

### Cards / Containers
- **Corner Style:** Highly rounded capsules (18px-24px (1.125rem-1.5rem) on small panels, 32px (2rem) on large desktop cards).
- **Background:** Semi-translucent Glass Charcoal (`rgba(42, 42, 42, 0.7)`) backed by `backdrop-blur-2xl`.
- **Border:** 1px solid white-15 (`rgba(255, 255, 255, 0.15)`), showing a subtle top-to-bottom opacity gradient.

### Inputs / Fields
- **Style:** Clean solid white background with neutral-700 text. Rounded 8px (0.5rem).
- **Focus:** Triggers a 3px wide white shadow glow (`rgba(255, 255, 255, 0.15)`) and slight scale up (101%).

### Navigation
- **Tabs:** Inline toggle tabs using simple background highlights (e.g., bg-white/5 active indicator). Fast 150ms crossfade between active states.

### Signature: AnimatedQRCode
- **Style:** White rounded capsule container (32px (2rem) corner radius) holding a dynamic QR code paired with fluid background animations (`liquidFloat` and `liquidFloatReverse`) representing instant WebRTC connection capability.

## 6. Do's and Don'ts

### Do:
- **Do** use strict dark-mode-first styling (deep slate background, translucent glass cards) to sustain a premium, technical aesthetic.
- **Do** verify text contrast of ash-gray labels (#a3a3a3) against dark container surfaces, ensuring contrast hits at least 4.5:1.
- **Do** implement fast transition timings of 150-250ms for hover, focus, and state switches to maintain high utility.
- **Do** include screen-reader-only text (`sr-only`) on non-prose buttons and indicators.

### Don't:
- **Don't** use colored side-stripe borders (e.g., `border-left-4`) as accents on cards or notifications; use full boundaries or glow states instead.
- **Don't** use gradient text under any circumstances; rely on bold weighting or size contrast for typographic emphasis.
- **Don't** animate `<img>` elements or their direct wrappers on hover; apply transitions strictly to container backgrounds, borders, or shadows.
- **Don't** let text overflow grids or container cards; test clamp hierarchies and line-clamp parameters meticulously.
