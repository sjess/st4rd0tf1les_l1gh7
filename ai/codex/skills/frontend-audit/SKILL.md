---
name: frontend-audit
description: Orchestrate a strict anti-generic frontend design review and improvement loop for an existing web page or web app. Use when Codex must inspect a rendered interface, establish a product-specific art direction with frontend-design, audit the baseline independently with design-critic, apply critic-driven frontend-design changes, and re-review the result until a hard quality gate passes or three redesign iterations are exhausted. Prefer rendered browser evidence over source-only judgment and protect existing functionality while redesigning.
---

# Frontend Audit

Run a disciplined `frontend-design -> design-critic -> frontend-design` workflow for an existing interface. Optimize for product-specific visual identity, not fashionable decoration or generic AI-generated frontend patterns.

## Required dependencies

Require both skills to be available before starting:

- `$frontend-design`
- `$design-critic`

Treat browser or Playwright tooling as strongly preferred but optional. If either required skill is unavailable, stop and name the missing dependency instead of silently imitating it.

## Operating rules

- Prefer the running application and rendered screenshots over source code.
- Inspect source only to understand behavior, design tokens, component reuse, responsive logic, and implementation constraints.
- Preserve product behavior, content meaning, accessibility, and existing user flows unless the user explicitly requests functional changes.
- Keep `design-critic` independent. Do not let the builder's self-evaluation replace or bias the critic review.
- Do not mark the work complete because it looks cleaner. Require the quality gate below.
- Do not chase novelty at the cost of usability.
- Do not add visual effects merely to improve the score.
- Avoid unrelated refactors.
- Stop after at most three redesign passes.

## Step 1: Establish the audit target

Determine the page, route, URL, or screen to review from the user's request and repository context.

Before changing code:

1. Read project instructions such as `AGENTS.md`, repository documentation, and relevant frontend conventions.
2. Identify the framework, component system, styling approach, and current dev/test commands.
3. Identify the target user, primary task, business purpose, brand context, and expected emotional character of the interface.
4. Record the current git status and avoid overwriting unrelated user changes.
5. Start or reuse the local application when needed to inspect the target page.

Do not ask the user for information that can be resolved from the repository, running app, or supplied URL.

## Step 2: Capture baseline evidence

Inspect the current rendered interface before any visual redesign.

Prefer these viewport widths when practical:

- 375 px mobile
- 768 px tablet
- 1440 px desktop
- 1920 px wide desktop

Capture enough evidence to judge:

- first viewport and overall page composition,
- navigation and primary actions,
- typography and hierarchy,
- spacing rhythm and density,
- component repetition and shape language,
- responsive reprioritization,
- important hover/focus/active states when available,
- empty/loading/error states when relevant,
- console or obvious rendering errors.

If rendered browser evidence is unavailable, continue only as a code-informed audit and state that limitation in the final report. Never invent visual observations.

## Step 3: Run the first `$frontend-design` pass as art direction only

Invoke `$frontend-design` before the critic, but do not modify application code in this pass.

Ask it to derive a concise, product-specific **Design Direction Brief** from the product context and baseline evidence. Require:

- product character and visual point of view,
- composition and page rhythm,
- typography direction,
- color behavior,
- shape language,
- imagery or illustration behavior when relevant,
- motion language when relevant,
- one or two recognizable signature motifs grounded in the product,
- explicit anti-patterns to avoid.

Reject vague directions such as `modern`, `premium`, `clean`, or `beautiful` unless translated into concrete visual decisions.

Do not let this pass score the existing interface or claim that implementation changes are required. Its job is to define an appropriate direction, not judge its own work.

## Step 4: Run the independent baseline `$design-critic` audit

Invoke `$design-critic` on the untouched baseline using the strongest rendered evidence available.

Provide the product context and Design Direction Brief as context, but require the critic to judge the actual interface independently.

Require its normal report, including:

- weighted design score,
- AI-template signal,
- design identity,
- observed AI-template patterns,
- what to preserve,
- ranked problems,
- concrete improvement guidance,
- responsive/state findings,
- frontend-design handoff.

Do not soften the critic's score because a redesign loop will follow.

## Step 5: Evaluate the hard quality gate

Treat the design as passing only when all conditions are met:

- overall weighted score >= 8.5,
- design quality >= 8.5,
- originality and product specificity >= 8.5,
- craft >= 8.0,
- usability and clarity >= 8.0,
- AI-template signal is `NONE` or `SLIGHT`,
- no unresolved high-impact design problem remains,
- no major responsive regression remains,
- no redesign change has broken an existing user flow.

If the untouched baseline already passes, stop without redesigning it. Do not change a strong interface merely to demonstrate activity.

## Step 6: Build the redesign brief

When the gate fails, combine only these inputs:

1. the Design Direction Brief from the first `$frontend-design` pass,
2. the current `$design-critic` findings and handoff,
3. repository and functional constraints.

Prioritize structural changes before cosmetic polish:

1. composition and information hierarchy,
2. product-specific identity,
3. typography and density,
4. section rhythm and component variety,
5. responsive behavior,
6. interaction craft,
7. restrained visual polish.

Explicitly reject generic fixes such as adding more gradients, glass panels, pills, shadows, decorative blobs, or icon cards when they do not arise from the product concept.

## Step 7: Run `$frontend-design` to implement the critic-driven pass

Invoke `$frontend-design` with the redesign brief and allow code changes now.

Require it to:

- preserve the strongest existing decisions named by `design-critic`,
- address the highest-impact critic findings first,
- follow the Design Direction Brief rather than inventing a new unrelated style,
- transform component-library defaults into a product-specific system,
- vary composition intentionally rather than repeating identical card/section templates,
- avoid decorative novelty without conceptual reason,
- preserve functionality and accessibility,
- keep changes scoped to the audited interface and shared design primitives that genuinely need adjustment.

After implementation, run the project's relevant build, lint, typecheck, and tests when available.

## Step 8: Re-render and re-audit

Capture fresh rendered evidence at the same useful viewport widths.

Invoke `$design-critic` again from scratch. Provide the new rendered state, not the builder's self-evaluation. Ask it to compare against unresolved previous findings only after it has independently scored the new version.

Re-evaluate the hard quality gate.

## Step 9: Iterate with a hard cap

Allow at most three frontend-design implementation passes.

For each failed pass:

1. preserve improvements the new critic explicitly validates,
2. carry forward unresolved high-impact findings,
3. avoid reworking areas that already pass without evidence,
4. invoke `$frontend-design` with the updated handoff,
5. re-render,
6. invoke `$design-critic` again,
7. re-run verification.

Never inflate the score or weaken the gate to finish.

After the third redesign pass, stop even if the gate still fails. Report the remaining blockers and the best next design move instead of continuing indefinitely.

## Anti-generic design checks

Treat combinations of these as warning signals unless the product clearly justifies them:

- centered eyebrow + huge headline + paragraph + two CTA hero formula,
- hero -> logo cloud -> three feature cards -> testimonials -> pricing -> CTA sequence,
- repeated three-card grids without content-driven reason,
- uniform card dashboards with no hierarchy,
- cards nested inside cards,
- identical large border radius everywhere,
- decorative pills and badges with no semantic purpose,
- gradient text used as a shortcut for visual interest,
- glassmorphism, glow, blur, or noise without conceptual reason,
- shadows making every surface float,
- unmodified component-library defaults,
- default Inter/system-font appearance with no typographic point of view,
- repeated tiny uppercase labels as decoration,
- generic sparkle, rocket, shield, brain, lightning, or wand iconography,
- decorative icon badge before every heading,
- arbitrary 3D blobs or illustrations unrelated to the product,
- uniform hover lift/scale on every card,
- desktop sections merely stacked on mobile without reprioritization.

Do not penalize familiar controls when they are the clearest usability choice. Penalize interchangeable composition and styling, not conventions by themselves.

## Regression protection

Before declaring a pass successful:

- inspect the final git diff,
- confirm no unrelated files changed without reason,
- run relevant project verification commands,
- check the target page for console/runtime errors when browser tooling permits,
- verify primary interactions still work,
- verify responsive layouts do not overflow or collapse incorrectly,
- compare before/after evidence for the critic's highest-impact findings.

If visual quality improves but functionality regresses, treat the iteration as failed.

## Final response format

Return a concise audit summary containing:

### Verdict
- final score,
- final AI-template signal,
- `PASS` or `NOT PASSED`,
- number of redesign passes used.

### What changed
Summarize the highest-impact implemented design moves, not every CSS edit.

### Evidence
List the viewport/state coverage and verification commands actually used.

### Remaining issues
Include only unresolved meaningful issues. Omit when the gate passes cleanly.

### Gate
Show the final dimension scores against the required thresholds.

Do not claim visual verification when only source code was available.
