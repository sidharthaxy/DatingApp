# Design System Document: High-Energy Editorial

## 1. Overview & Creative North Star

### Creative North Star: "The Neon Curator"
This design system moves away from the "standardized" look of modern dating apps to embrace a **High-Energy Editorial** aesthetic. Inspired by the precision of Gluestack UI and the rhythmic nature of premium digital magazines, the system prioritizes intentional asymmetry, high-contrast typography, and a "layered glass" depth model. 

We are not building a library of boxes; we are crafting a signature experience that feels vibrant, electric, and curated. By utilizing a mono-spaced font against a lush, vibrant color palette, we create a tension between "tech-forward precision" and "human connection." 

**Core Design Principles:**
*   **Asymmetric Energy:** Break the horizontal grid. Use overlapping elements and offset typography to create movement.
*   **Tonal Definition:** Eliminate structural lines. Use background color shifts to define space.
*   **Editorial Authority:** Typography isn't just for reading; it’s a primary visual element. Large, mono-spaced displays act as the "hooks" of the UI.

---

## 2. Colors

The palette is anchored by a high-voltage primary blue and supported by a sophisticated range of surface tiers and electric accents.

### Color Strategy
*   **Primary (#3a43e4):** The pulse of the app. Used for high-priority actions and signature brand moments.
*   **Secondary (#5f34e5):** A deep violet used to add tonal depth and variety to active states.
*   **Tertiary (#af270c):** A high-energy "hot" accent used sparingly for destructive actions or urgent notifications.
*   **Neutral (Surface Tiers):** A warm-grey base (#f9f6f5) that keeps the vibrant colors from feeling "cold."

### The Rules of Engagement
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section sitting on a `surface` background provides all the definition needed.
*   **Surface Hierarchy & Nesting:** Treat the UI as physical layers of fine paper. Use the tiers (`Lowest` to `Highest`) to stack information. An inner card should always be a step higher or lower in tone than its parent container to define its importance.
*   **The "Glass & Gradient" Rule:** To achieve a premium polish, use Glassmorphism for floating elements (e.g., navigation bars or profile overlays) using semi-transparent surface colors with a `20px` backdrop-blur. 
*   **Signature Textures:** Main CTAs should utilize a subtle linear gradient transitioning from `primary` to `primary-container` at a 135-degree angle. This adds "soul" and prevents the UI from feeling flat.

---

## 3. Typography

The system utilizes a dual-font approach to balance editorial style with technical precision. 

*   **Space Grotesk (Display & Headlines):** Used for large-scale, high-impact moments. Its geometric quirks provide the "high-energy" editorial feel.
*   **Manrope (Body & Titles):** A highly legible sans-serif used for all functional text, ensuring a smooth reading experience amidst the vibrant visuals.

### Typography Scale
*   **Display-LG (3.5rem):** Reserved for hero welcome screens and major milestones.
*   **Headline-MD (1.75rem):** The standard for profile names and section headers.
*   **Body-LG (1rem):** Default for user bios and messaging.
*   **Label-SM (0.6875rem):** Used for metadata, timestamps, and secondary tags.

---

## 4. Elevation & Depth

We eschew traditional drop shadows for **Tonal Layering**. 

*   **The Layering Principle:** Depth is achieved by stacking. Place a `surface-container-lowest` (#ffffff) card on a `surface-container-low` (#f3f0ef) section to create a soft, natural lift.
*   **Ambient Shadows:** When a floating element is required (e.g., an Action Button), use a shadow with a `24px` blur at `6%` opacity. The shadow color must be a tinted version of `on-surface` (#2f2f2e), never pure black.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline-variant` token at **15% opacity**. This creates a "suggestion" of a boundary without the harshness of a solid line.
*   **Glassmorphism:** Use `surface-container-lowest` at 70% opacity with a `blur(12px)` for overlay menus. This allows the vibrant brand colors to bleed through, softening the layout.

---

## 5. Components

### Buttons
*   **Primary:** Gradient of `primary` to `primary-container`. White text (`on-primary`). Radius: `full`. 
*   **Secondary:** Ghost style. Transparent background with a `Ghost Border`. Text in `primary`.
*   **Tertiary:** No background or border. Underlined `Space Mono` text for a raw, editorial look.

### Input Fields
*   **Container:** `surface-container-high` background. No border.
*   **Label:** `label-md` in `on-surface-variant`.
*   **State:** On focus, the background shifts to `surface-container-lowest` with a 2px `primary` bottom-bar only.

### Profile Cards & Lists
*   **Constraint:** No divider lines. Use `spacing-6` (2rem) of vertical whitespace to separate content.
*   **Image Treatment:** Profile images should use the `xl` (0.75rem) roundedness scale.
*   **Dynamic Tags:** Interest chips use `secondary-container` with `on-secondary-container` text.

### The "Match" Interaction (Signature Component)
Instead of a standard modal, the "Match" screen uses a full-screen `primary` color flash with `display-lg` typography overlapping the two user avatars at 45-degree angles.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use extreme scale. Pair a `display-lg` headline with a `body-sm` caption to create editorial drama.
*   **Do** lean into the mono-spaced aesthetic for "technical" data like age, distance, and time.
*   **Do** use asymmetrical padding (e.g., more padding on the left than the right) for header sections to drive visual interest.

### Don’t:
*   **Don’t** use 1px black or grey borders. They break the fluid, high-end feel of the tonal layers.
*   **Don’t** use standard "Material Design" shadows. Keep them large, diffused, and almost invisible.
*   **Don’t** center-align everything. Editorial design thrives on "Off-Center" balance; try left-aligning headers and right-aligning call-to-actions.
*   **Don’t** clutter. If a screen feels busy, increase the spacing scale rather than adding a divider.