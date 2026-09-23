#!/usr/bin/env bash
# Copies the global Claude Code and Codex configuration of THIS machine into
# the repo (ai/). Run it whenever skills, agents or MCPs changed, then commit.
#
# Never exported: credentials (.credentials.json, auth.json), history,
# sessions, sqlite state, caches, account-synced skills and plugins.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AI_DIR="${REPO_DIR}/ai"
CLAUDE_SRC="${HOME}/.claude"
CODEX_SRC="${HOME}/.codex"

# Junk that ends up in skill folders (Windows downloads, Python caches, archives)
RSYNC_EXCLUDES=(
  --exclude '*:Zone.Identifier'
  --exclude '__pycache__/'
  --exclude '*.pyc'
  --exclude '*.zip'
  --exclude '.DS_Store'
)

log_info() { printf '[ INFO ] %s\n' "$*"; }
log_ok()   { printf '[ OK ] %s\n' "$*"; }
log_warn() { printf '[ WARN ] %s\n' "$*" >&2; }

# Mirror a directory; --delete keeps the repo copy in sync with the source
export_dir() {
  local src="$1" dest="$2"
  shift 2
  if [[ ! -d "$src" ]]; then
    log_warn "${src} fehlt; uebersprungen"
    return 0
  fi
  mkdir -p "$dest"
  rsync -a --delete "${RSYNC_EXCLUDES[@]}" "$@" "${src}/" "${dest}/"
  log_ok "${src} -> ${dest#"${REPO_DIR}/"}"
}

export_file() {
  local src="$1" dest="$2"
  if [[ ! -f "$src" ]]; then
    log_warn "${src} fehlt; uebersprungen"
    return 0
  fi
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  log_ok "${src} -> ${dest#"${REPO_DIR}/"}"
}

# Strips machine-local tables from config.toml and replaces $HOME with a
# placeholder. Only the trust entry for ~/repositories is kept.
export_codex_config() {
  local src="${CODEX_SRC}/config.toml" dest="${AI_DIR}/codex/config.toml.template"
  if [[ ! -f "$src" ]]; then
    log_warn "${src} fehlt; uebersprungen"
    return 0
  fi

  awk -v keep="[projects.\"${HOME}/repositories\"]" '
    /^\[/ {
      skip = 0
      if ($0 ~ /^\[(projects|tui|notice)[.\]]/ && $0 != keep) skip = 1
    }
    !skip
  ' "$src" \
    | sed "s#${HOME}#__HOME__#g" >"$dest"

  if grep -qiE '(api[_-]?key|token|secret|password|bearer)[[:space:]]*=' "$dest"; then
    log_warn "config.toml.template enthaelt moegliche Secrets; bitte vor dem Commit pruefen"
  fi
  log_ok "${src} -> ${dest#"${REPO_DIR}/"}"
}

# Writes installed Claude plugins as "plugin@marketplace<TAB>github-repo"
export_claude_plugins() {
  local dest="${AI_DIR}/claude/plugins.tsv"
  if ! command -v claude >/dev/null 2>&1; then
    log_warn "claude fehlt; Plugins nicht exportiert"
    return 0
  fi

  node -e '
    const [plugins, markets] = process.argv.slice(1).map(s => JSON.parse(s));
    const repo = Object.fromEntries(markets.map(m => [m.name, m.repo || ""]));
    for (const p of plugins.filter(p => p.enabled && p.scope === "user")) {
      console.log(`${p.id}\t${repo[p.id.split("@")[1]] || ""}`);
    }
  ' "$(claude plugin list --json)" "$(claude plugin marketplace list --json)" >"$dest"
  log_ok "Claude Plugins -> ${dest#"${REPO_DIR}/"} ($(wc -l <"$dest") Stueck)"
}

main() {
  command -v rsync >/dev/null 2>&1 || { echo "[ ERROR ] rsync fehlt: sudo apt-get install -y rsync" >&2; exit 1; }

  log_info "Claude Code"
  export_file "${CLAUDE_SRC}/settings.json" "${AI_DIR}/claude/settings.json"
  export_file "${CLAUDE_SRC}/CLAUDE.md" "${AI_DIR}/claude/CLAUDE.md"
  export_dir "${CLAUDE_SRC}/agents" "${AI_DIR}/claude/agents"
  export_dir "${CLAUDE_SRC}/commands" "${AI_DIR}/claude/commands"
  export_dir "${CLAUDE_SRC}/get-shit-done" "${AI_DIR}/claude/get-shit-done"
  # skills/synced is managed by claude.ai account sync
  export_dir "${CLAUDE_SRC}/skills" "${AI_DIR}/claude/skills" --exclude 'synced/'
  export_claude_plugins

  log_info "Codex"
  export_file "${CODEX_SRC}/AGENTS.md" "${AI_DIR}/codex/AGENTS.md"
  export_codex_config
  export_dir "${CODEX_SRC}/agents" "${AI_DIR}/codex/agents"
  export_dir "${CODEX_SRC}/prompts" "${AI_DIR}/codex/prompts"
  export_dir "${CODEX_SRC}/gsd" "${AI_DIR}/codex/gsd"
  # .system skills are bundled with Codex itself
  export_dir "${CODEX_SRC}/skills" "${AI_DIR}/codex/skills" --exclude '.system/'

  log_ok "Export fertig. Aenderungen pruefen: git -C \"${REPO_DIR}\" status ai/"
}

main "$@"
