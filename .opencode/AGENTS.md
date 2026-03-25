# AGENTS.md

## Default Working Style

- Prefer backend work by default unless the user explicitly asks for frontend/UI work.
- For UI-related tasks, do not rely only on markup inspection or successful rendering; verify changes visually.

## Verification Rules

- Before claiming a task is done, run the smallest relevant verification first.
- Expand verification only as needed based on the scope of the change.
- Do not claim completion without checking the affected behavior directly.
- For UI work, include a visual check whenever feasible.

## UI and Screenshot Rules

- Prefer Playwright MCP for browser inspection, interaction, and screenshots.
- Use Playwright MCP as the default visual verification tool before any fallback method.
- If Playwright MCP is unavailable, broken, or blocked by the runtime environment, fall back to system Chrome/Chromium headless.
- For headless fallback screenshots, use `--no-sandbox` when required by the environment, together with explicit window sizing and a sufficient virtual time budget.
- Prefer targeted viewport screenshots over naive full-page captures on pages with lazy reveal, scroll-triggered effects, or observer-based rendering.
- Do not treat an incomplete full-page screenshot alone as proof of a broken layout without checking whether the page behavior is reveal-driven.
- Save temporary visual verification artifacts in a project-local output folder and do not commit them unless explicitly requested.

## Browser Screenshot Fallback

- Default tool: Playwright MCP
- Fallback tool: system Chrome/Chromium headless

Example pattern:

`google-chrome --headless --no-sandbox --disable-gpu --hide-scrollbars --window-size=1440,14000 --virtual-time-budget=6000 --screenshot="<project-local-output-file>" "<local-url>"`

## Code Quality and Formatting

- Use the project’s existing formatter, linter, and test conventions.
- For language/framework-specific changes, run the narrowest relevant formatter/linter first.
- Preserve the project’s established patterns unless the user asks for refactoring.

## Git and Commit Workflow

- Before committing, clean temporary verification artifacts such as screenshots and Playwright outputs unless the user explicitly wants them versioned.
- When the user says `commite`, interpret it as: clean temporary artifacts, `git add .`, commit, and push.
- For new projects, prefer ignoring transient automation folders such as `.playwright-cli` and output folders unless the user wants them tracked.

## Project Memory

- Keep project-specific state, stack details, routes, accounts, file hotspots, and feature status in a project-local memory file, not here.