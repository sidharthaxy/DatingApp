# Design System Strategy: The Digital Kineticist

This design system is built to transform a dating experience from a transactional utility into a vibrant, editorial journey. We move away from the "generic app" aesthetic by embracing **Digital Kineticism**—a philosophy that relies on high-contrast typography scales, depth through tonal layering rather than lines, and a deliberate tension between monospace precision and organic color transitions.

## 1. Creative North Star: The Digital Kineticist
The goal is to feel energetic yet profoundly trustworthy. We achieve this by blending the "Brutalist-Lite" sharpness of monospace typography with sophisticated, glass-like layering. This system avoids the "flat web" trap by using depth to imply physical presence. Every element should feel like a piece of data floating in a curated, high-end digital environment.

- **Intentional Asymmetry:** Avoid perfectly centered layouts for hero sections. Use the Spacing Scale to create "breathing pockets" that guide the eye.
- **Authority Through Type:** The use of `Space Mono` for headlines provides a "hacker-chic" precision that suggests the matching algorithm is intentional and technical, while `Manrope` provides the human, readable warmth needed for personal bios.

---

## 2. Color & Atmospheric Depth

We leverage a palette of vibrant blues and electric purples, anchored by a sophisticated neutral foundation.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are prohibited for sectioning. 
Structure must be defined through:
- **Background Color Shifts:** Use `surface-container-low` (#f3f0ef) to define a section against a `background` (#f9f6f5).
- **Tonal Transitions:** Separate vertical content groups using the Spacing Scale (specifically `8` or `10`) rather than a horizontal rule.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked sheets.
- **Level 0 (Base):** `surface` (#f9f6f5)
- **Level 1 (Sections):** `surface-container-low` (#f3f0ef)
- **Level 2 (Interactive Cards):** `surface-container-lowest` (#ffffff)
- **Level 3 (Floating Overlays):** `surface-bright` (#f9f6f5) with glassmorphism.

### The "Glass & Gradient" Rule
To add "soul," use subtle gradients for primary CTAs and profile highlights:
- **Signature Gradient:** `primary` (#3a43e4) to `secondary` (#5f34e5) at a 135-degree angle.
- **Glassmorphism:** For floating nav bars or profile cards, use `surface-container-lowest` at 70% opacity with a `20px` backdrop-blur.

---

## 3. Typography: The Editorial Engine

This system uses a high-contrast pairing to balance technical energy with readable storytelling.

| Role | Font Family | Style | Usage |
| :--- | :--- | :--- | :--- |
| **Display** | `Space Grotesk` | Bold/Regular | Massive numbers or impact statements (e.g., "98% Match"). |
| **Headline** | `Space Grotesk` | Regular | Page titles and section headers. High-end editorial feel. |
| **Title** | `Manrope` | Semi-Bold | User names, card titles, and primary navigation items. |
| **Body** | `Manrope` | Regular | User bios and chat messages. Optimized for readability. |
| **Label/Mono** | `Space Mono` | Regular | Metadata, timestamps, and algorithm tags (e.g., "Active Now"). |

---

## 4. Elevation & Tonal Layering

We move away from traditional drop shadows to create a more integrated, "ambient" sense of depth.

- **The Layering Principle:** Depth is achieved by placing a "Bright" element on a "Low" background. For example, a user's chat bubble in `surface-container-lowest` on a `surface-container` background creates a natural lift.
- **Ambient Shadows:** When a shadow is required (e.g., a floating Action Button), use:
    - **Blur:** 32px
    - **Opacity:** 6%
    - **Color:** `on-surface` (#2f2f2e)
- **The "Ghost Border":** For input fields or cards that require high accessibility, use `outline-variant` (#afadac) at **15% opacity**. This creates a suggestion of a container without breaking the "No-Line" rule.

---

## 5. Signature Components

### Primary Buttons
- **Style:** Sharp corners (`DEFAULT`: 0.25rem). 
- **Color:** `primary` (#3a43e4) background with `on-primary` (#f3f1ff) text.
- **Interaction:** On hover, shift to the Signature Gradient (`primary` to `secondary`).

### Selection Chips
- **Style:** `full` (9999px) roundedness for a friendly, pill-like feel.
- **Inactive:** `surface-container-high` background with `on-surface-variant` text.
- **Active:** `primary-container` background with `on-primary-container` text.

### Discovery Cards (Dating Profile)
- **Structure:** No borders. Content is housed in a `surface-container-lowest` card.
- **Typography:** Name in `headline-sm` (Space Grotesk), Bio in `body-md` (Manrope).
- **Spacing:** Use `3` (1rem) for internal padding to ensure the profile feels premium and uncrowded.

### Interactive Input Fields
- **Base:** `surface-container-lowest` background.
- **Indicator:** Instead of a full border, use a `2px` thick line at the bottom in `primary` only when focused.
- **Error State:** Use `error` (#b41340) for helper text and a 20% opacity `error-container` background tint.

---

## 6. Do’s and Don'ts

### Do
- **Do** use `Space Mono` for all data-driven text (dates, distances, percentages).
- **Do** allow content to bleed off-edge in horizontal scrolls to imply continuity.
- **Do** use `20` (7rem) or `24` (8.5rem) spacing for major section breaks to create a high-end, editorial "galleries" feel.

### Don’t
- **Don’t** use black (#000000) for text. Always use `on-surface` (#2f2f2e) to keep the vibe soft and premium.
- **Don’t** use standard 1px dividers between chat messages; use `1.5` (0.5rem) vertical white space.
- **Don’t** use "pill" shapes for buttons. Keep them slightly rounded (`md`: 0.375rem) to maintain the modern, sharp aesthetic inspired by Gluestack UI.