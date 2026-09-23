# Design Critic Rubric

Use this reference to keep scoring strict and repeatable.

## Score anchors

### 9.0-10.0 — Exceptional

Use sparingly. Require a distinctive, coherent, product-specific visual identity with excellent hierarchy, typography, spacing, responsiveness, interaction clarity, and execution. Major decisions must feel deliberate rather than inherited from defaults.

### 8.0-8.9 — Strong

Require a clearly intentional visual system, very good craft, and few meaningful weaknesses. The design may use familiar patterns, but composition and execution must feel specific to the product rather than interchangeable.

### 7.0-7.9 — Good but conventional

Use for competent, usable, visually coherent work that still relies on familiar patterns, lacks a strong signature, or contains several noticeable craft issues. Do not treat 7.x as failure; treat it as solid but not distinctive.

### 6.0-6.9 — Generic or uneven

Use when the interface works but feels templated, overly dependent on component-library defaults, visually repetitive, weakly hierarchical, or inconsistently crafted.

### 5.0-5.9 — Needs redesign

Use when visual identity is weak, composition is unconvincing, multiple hierarchy or spacing problems are visible, or decorative decisions actively distract from usability.

### Below 5.0 — Fundamentally weak

Use when the interface has major visual, structural, usability, responsiveness, or coherence problems.

## Dimension rubric

### Design quality — 30%

Judge:
- overall composition and balance,
- visual hierarchy,
- typography as a system,
- color relationships,
- density and whitespace,
- shape language,
- coherence across sections and components,
- appropriateness for product and audience.

Do not reward mere cleanliness as high design quality.

### Originality and product specificity — 30%

Judge:
- whether the interface has a recognizable point of view,
- whether visual decisions derive from product context,
- whether the design survives the "remove the logo" test,
- whether the component library has been transformed into a product language,
- whether layout structure differs meaningfully from generic templates where appropriate.

Do not require novelty for novelty's sake. Familiar controls are desirable when they improve usability.

### Craft — 20%

Judge:
- typographic hierarchy and line length,
- alignment precision,
- spacing rhythm,
- border and radius discipline,
- icon sizing and optical alignment,
- contrast,
- grouping,
- responsive adaptation,
- visual treatment of states,
- consistency without mechanical sameness.

### Usability and clarity — 20%

Judge:
- immediate understanding of page purpose,
- obvious primary actions,
- navigation clarity,
- information prioritization,
- affordances,
- readability,
- responsive behavior,
- discoverability of interactive elements,
- error/loading/empty-state clarity when visible.

## AI-template signals

Treat these as signals, not automatic failures. Penalize them when they appear without product-specific reasoning or when several combine into a recognizable template aesthetic.

### Composition signals

- centered hero with generic eyebrow, large headline, paragraph, and two CTAs,
- predictable hero -> logo cloud -> three feature cards -> testimonials -> pricing -> CTA sequence,
- three identical cards used because the content happens to fit three columns,
- every section centered with the same vertical rhythm,
- dashboard made from a uniform grid of interchangeable cards,
- excessive nesting of cards inside cards,
- sections separated only by background-color changes rather than composition.

### Surface signals

- excessive rounded rectangles,
- identical large border radius on nearly every component,
- decorative pills or badges with no semantic purpose,
- indiscriminate glassmorphism,
- gradients used only to make an interface look "premium",
- glow, blur, or noise effects without conceptual reason,
- shadows used to make every surface float,
- default component-library styling left visibly unchanged.

### Typography signals

- default Inter/system-font look with no typographic point of view,
- oversized marketing headline disconnected from the rest of the hierarchy,
- repeated tiny uppercase labels used decoratively everywhere,
- weak contrast between headings, body text, metadata, and controls,
- identical text treatment across conceptually different content.

### Content and iconography signals

- generic sparkle, rocket, lightning, shield, brain, magic-wand, or chart icons used as decoration,
- empty slogans that could describe any software product,
- metric cards containing large numbers without meaningful context,
- arbitrary illustration or 3D blobs unrelated to product domain,
- icon badges placed before every heading by default.

### Interaction signals

- hover animations added uniformly whether meaningful or not,
- motion that only demonstrates technical capability,
- excessive hover lift or scale on every card,
- hidden interaction states caused by visual minimalism,
- desktop composition simply stacked on mobile without re-prioritization.

## Evidence rules

For every major criticism, cite a visible element, component, section, or repeated pattern.

Prefer statements such as:

"The three KPI cards in the first viewport have identical weight, so no metric reads as primary."

Avoid statements such as:

"The hierarchy could be better."

Prefer statements such as:

"The hero, feature grid, and testimonial block all use the same centered max-width container and vertical spacing, creating a repetitive page rhythm."

Avoid statements such as:

"The page feels generic."

## Anti-bias rules

- Do not praise the interface before establishing evidence.
- Do not assume implementation complexity implies design quality.
- Do not reward additional decoration as improvement by default.
- Do not soften a finding because the reviewer or builder previously suggested the same design.
- Do not lower standards because the target score is difficult to reach.
- Do not fabricate screenshot observations when only source code is available.
