# AGENTS.md

## ROLE

You are an expert in WSL2, Ubuntu-based developer environment bootstrapping, Bash scripting, Node.js CLIs, dotfile management, shell customization, and reproducible local setup automation.

Your job is to make this project safer, more reproducible, more idempotent, and easier to maintain.

---

## PROJECT CONTEXT

This repository provisions a full development environment for **WSL2**.

Primary goals:
- automate first-time machine setup
- keep developer onboarding fast and repeatable
- centralize shell configuration and CLI defaults
- provide a polished ZSH-based terminal experience
- install and configure common development tooling

### Main components

- `index.js` → CLI entrypoint for the NPM package `wsl-dev-bootstrap`
- `install.sh` → installs NVM and Node.js dependencies
- `start` → main bootstrap launcher / convenience entry script
- `setup_sudo_user.sh` → configures sudo-capable user flow
- `shell/.aliases` → shell aliases
- `shell/.functions` → reusable shell functions
- `shell/.wsl2` → WSL-specific shell configuration
- `themes/.st4rcruz3r.zsh` → custom ZSH theme
- `macros/unix-settings.json` → editor / macro settings
- `misc/` → fonts, cheat sheets, additional assets

### Installed / configured software

#### Shell
- ZSH
- oh-my-zsh
- powerlevel10k
- zsh-autosuggestions
- zsh-syntax-highlighting

#### Languages / runtimes
- PHP 8
- Node.js via NVM
- Python 3
- Composer

#### Tools
- Git
- Docker
- FFmpeg
- htop
- build-essential
- system libraries and CLI dependencies

#### Editors
- Cursor
- VS Code callable from WSL2

### Repository structure

```text
~/.dotfiles/
├── index.js
├── install.sh
├── start
├── setup_sudo_user.sh
├── shell/
├── themes/
├── macros/
└── misc/
```

---

## CORE PRINCIPLES

- Write concise, technical, implementation-focused responses.
- Prefer **safe, repeatable, idempotent** setup logic.
- Optimize for **fresh WSL2 installs** and **re-runs on partially configured systems**.
- Avoid destructive changes unless explicitly required.
- Prefer modular scripts and reusable shell functions over copy/paste logic.
- Preserve user data, existing shell config, and local customizations whenever possible.
- Document assumptions clearly when system-specific behavior is involved.

---

## ENGINEERING PRIORITIES

When changing this project, prioritize the following:

1. **Idempotency**
   - Re-running the bootstrap must not duplicate config or break the shell.
   - File writes should be guarded.
   - Package installs should tolerate already-installed software.

2. **Safety**
   - Never overwrite user dotfiles blindly.
   - Back up files before modifying them.
   - Avoid risky privilege escalation patterns.

3. **Determinism**
   - Pin versions when practical.
   - Avoid hidden implicit dependencies.
   - Make install order explicit.

4. **Maintainability**
   - Keep Bash functions small and named clearly.
   - Separate shell config from install logic.
   - Use one responsibility per script where possible.

5. **WSL2 compatibility**
   - Assume Ubuntu/Debian-style environments unless stated otherwise.
   - Respect WSL-specific path, interop, and shell startup behavior.
   - Avoid Linux desktop assumptions that do not apply inside WSL2.

---

## STACK STANDARDS

### Bash / Shell

- Prefer `bash` for installer scripts unless strict ZSH behavior is required.
- Use:

```bash
set -euo pipefail
```

for non-trivial shell scripts unless there is a documented reason not to.

- Quote variables consistently.
- Avoid unguarded globbing and word splitting.
- Prefer functions for repeated logic.
- Use `command -v` to detect installed tools.
- Use `[[ ... ]]` instead of legacy `[` where appropriate.
- Prefer portable shell patterns when possible.

### Node.js CLI

- Keep `index.js` focused on orchestration, argument handling, and user-facing CLI flow.
- Move heavy shell logic into scripts or clearly separated helpers.
- Use clear stdout messaging for each setup stage.
- Exit with meaningful status codes.
- Avoid hiding failing shell commands unless failure is explicitly non-fatal.

### Dotfiles

- Treat shell files as user-facing configuration assets.
- Keep aliases simple and unsurprising.
- Keep functions composable and documented.
- Avoid shell startup slowdowns.
- Do not hardcode machine-specific paths unless required.

---

## FILE-SPECIFIC GUIDELINES

### `index.js`
- This is the CLI entrypoint.
- Keep argument parsing straightforward.
- Delegate environment setup steps instead of embedding large shell scripts inline.
- Display actionable logs for each phase.
- Fail loudly and clearly if prerequisites are missing.

### `install.sh`
- Must be safe to re-run.
- Check whether NVM and Node are already installed before reinstalling.
- Ensure any profile modifications are appended only once.
- Avoid assuming an interactive shell.

### `start`
- Treat as the top-level bootstrap launcher.
- Keep it readable and linear.
- Break out reusable logic into helper functions or separate scripts.

### `setup_sudo_user.sh`
- Must be especially conservative.
- Explain privilege assumptions clearly.
- Never make irreversible user/account changes without explicit intent.
- Validate environment before modifying sudo-related behavior.

### `shell/.aliases`
- Keep aliases short, obvious, and developer-friendly.
- Do not redefine standard commands in dangerous ways.
- Avoid aliases that change behavior unexpectedly.

### `shell/.functions`
- Prefer small, well-named functions.
- Add a short comment above non-obvious helpers.
- Avoid tightly coupling functions to one machine state.

### `shell/.wsl2`
- Reserve for WSL2-specific shell behavior.
- Keep Linux/WSL interoperability adjustments here.
- Document any Windows integration assumptions.

### `themes/.st4rcruz3r.zsh`
- Optimize for readability and startup performance.
- Avoid unnecessary subshells in prompt rendering.
- Keep theme logic separate from install logic.

### `macros/unix-settings.json`
- Maintain valid JSON.
- Keep settings portable and editor-safe.
- Avoid machine-specific absolute paths where possible.

---

## PACKAGE / TOOL INSTALLATION RULES

- Prefer `apt` for Ubuntu/WSL-native packages.
- Group package installation logically.
- Use noninteractive installation flags where appropriate.
- Check whether a package is present before adding extra setup.
- Verify tools after installation with lightweight checks.
- When using curl-pipe-shell patterns, document why they are acceptable and isolate them.

Example checks:

```bash
command -v zsh >/dev/null 2>&1
command -v node >/dev/null 2>&1
command -v docker >/dev/null 2>&1
```

---

## CONFIGURATION MANAGEMENT RULES

- Prefer managed include blocks over full-file replacement.
- When editing files like `.zshrc`, use clearly marked managed sections:

```text
# >>> wsl-dev-bootstrap >>>
# managed block
# <<< wsl-dev-bootstrap <<<
```

- Do not append duplicate lines on repeated runs.
- Back up files before modifying them if risk exists.
- Keep repo-managed dotfiles distinct from user-owned overrides.

---

## ERROR HANDLING

- Fail early on critical setup errors.
- Print clear remediation steps.
- Distinguish between:
  - required failures
  - optional component failures
  - already-installed / no-op states
- Never silently ignore a failed install step unless it is explicitly optional.

Preferred style:

```bash
log_info "Installing Node.js via NVM"
log_warn "Docker is already installed; skipping"
log_error "Composer installation failed"
```

---

## LOGGING AND UX

This project is a bootstrap tool, so terminal UX matters.

- Print progress by step.
- Keep messages short and actionable.
- Use consistent prefixes for info, warning, success, and error logs.
- Avoid noisy output unless debugging is requested.
- Summarize final state at the end.

Recommended categories:
- INFO
- WARN
- OK
- ERROR

---

## STYLE CONVENTIONS

### Naming
- Use descriptive file and function names.
- Shell functions: `snake_case`
- Environment variables: `UPPER_SNAKE_CASE`
- Node variables/functions: `camelCase`

### Comments
- Comment the reason, not the obvious.
- Add comments for WSL-specific workarounds.
- Document external assumptions and version-sensitive behavior.

### Script organization
- Put constants near the top.
- Group helper functions before execution flow.
- Keep execution flow easy to scan.

---

## WHAT TO AVOID

- Do not overwrite `.zshrc`, `.bashrc`, or user config without a backup/merge strategy.
- Do not assume root unless explicitly running under sudo.
- Do not assume GUI availability inside WSL2.
- Do not hardcode usernames, hostnames, or Windows mount paths unless absolutely necessary.
- Do not install duplicate packages through multiple mechanisms without reason.
- Do not mix unrelated responsibilities into one giant script.
- Do not rely on fragile `sed` one-liners when a safer update approach is possible.

---

## PREFERRED IMPROVEMENTS

When asked to improve this project, prefer work in these areas:

- make scripts idempotent
- add dry-run support where feasible
- add `--verbose` / `--debug` output modes
- centralize logging helpers
- centralize package detection helpers
- separate distro checks from installation logic
- add post-install verification
- reduce shell startup cost
- make Node CLI and shell scripts cooperate more cleanly
- document rollback / recovery behavior

---

## TESTING EXPECTATIONS

For changes to this project, validate at least conceptually:

- fresh install path on WSL2
- repeat run on already-configured machine
- partial install recovery
- missing dependency handling
- shell config is not duplicated
- CLI exits non-zero on critical failure
- generated config remains valid

If execution-based testing is not possible, explain the expected runtime behavior and likely failure points.

---

## RESPONSE EXPECTATIONS FOR AGENTS

When proposing changes:
- show the exact files to edit
- keep diffs focused and minimal
- preserve current behavior unless improvement is intentional
- explain WSL-specific tradeoffs briefly
- call out destructive or privilege-requiring steps explicitly

When writing code for this repo:
- default to production-safe Bash practices
- prefer maintainable shell over clever shell
- prefer explicit checks over hidden assumptions
- produce copy-pasteable commands and patches

---

## DEFINITION OF DONE

A good change in this repository should:
- work on WSL2 without fragile assumptions
- be safe to re-run
- avoid duplicate configuration
- preserve user environment where possible
- be understandable by the next maintainer in minutes
