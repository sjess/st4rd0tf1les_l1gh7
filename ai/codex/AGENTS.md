# AGENTS.md

## Default Working Style

- Default to backend work only when the task is ambiguous.
- If the user asks for UI, frontend, layout, styling, screenshots, or UX work, prioritize frontend investigation and verification.
- For UI-related tasks, do not rely only on markup inspection or successful rendering; verify changes visually whenever feasible.

## Verification Rules

- Before claiming a task is done, run the smallest relevant verification first.
- Expand verification only as needed based on the scope of the change.
- Do not claim completion without checking the affected behavior directly.
- For UI work, include a visual check whenever feasible.

## UI and Screenshot Rules

- Prefer Playwright MCP for browser inspection, interaction, and screenshots.
- Use Playwright MCP as the default visual verification tool before any fallback method.
- If Playwright MCP is unavailable, broken, or blocked by the runtime environment, fall back to system Chrome/Chromium headless.
- For headless fallback screenshots, use explicit window sizing, sufficient render time, and `--no-sandbox` when required by the environment.
- Prefer targeted viewport screenshots over naive full-page captures on pages with lazy reveal, scroll-triggered effects, or observer-based rendering.
- Do not treat an incomplete full-page screenshot alone as proof of a broken layout without checking whether the page behavior is reveal-driven.
- Save temporary visual verification artifacts in a project-local output folder and do not commit them unless explicitly requested.

## Code Quality and Formatting

- Use the project’s existing formatter, linter, and test conventions.
- Run the narrowest relevant formatter, linter, or test first.
- Preserve the project’s established patterns unless the user asks for refactoring.

## Git and Commit Workflow

- Before committing, clean temporary verification artifacts such as screenshots and Playwright outputs unless the user explicitly wants them versioned.
- When the user says `commite`, interpret it as: clean temporary artifacts, stage the intended changes, commit, and push.
- For new projects, prefer ignoring transient automation folders such as `.playwright-cli` and output folders unless the user wants them tracked.

## Task Isolation

- Use subagents or subtasks for side investigations, code reviews, broad searches, and multi-step analysis when this helps keep the main context small.
- Return concise findings from side investigations instead of full transcripts.
- Keep the primary thread focused on the current task.

## File Access Discipline

- Start with the smallest relevant scope.
- Inspect filenames, directories, or search results before opening files.
- Read only the specific files and line ranges needed for the current step.
- For logs, read narrow slices or tail output first.
- Do not reopen large unchanged files unless necessary.

## Project Memory

- Keep project-specific state, stack details, routes, accounts, file hotspots, and feature status in a project-local memory file, not here.

## Token Discipline

- Keep context as small as possible.
- Never scan the whole repository unless explicitly required.
- Avoid repeating unchanged context, logs, or instructions.
- Use concise summaries and short outputs.
- Expand scope only when the current evidence is insufficient.
