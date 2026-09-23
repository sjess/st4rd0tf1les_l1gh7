#!/usr/bin/env bash
# Installs Claude Code + Codex and deploys the configuration stored in ai/
# (created by scripts/export_ai_config.sh).
#
# Safe to re-run:
#   - CLIs are only installed when missing
#   - skills/agents/prompts are synced; replaced files are backed up,
#     files that only exist locally are kept
#   - settings.json / config.toml are only written when missing
#     (use --force to replace them; the old version is backed up)
#
# Credentials are not part of the repo: run `claude` and `codex login` afterwards.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AI_DIR="${REPO_DIR}/ai"
CLAUDE_DIR="${HOME}/.claude"
CODEX_DIR="${HOME}/.codex"
BACKUP_DIR="${HOME}/.local/state/wsl-dev-bootstrap/backups/$(date +%Y%m%d-%H%M%S)"
FETCH_MCP_VENV="${HOME}/.local/share/mcp/fetch/venv"

FORCE=0
SKIP_CLI=0

log_info()  { printf '[ INFO ] %s\n' "$*"; }
log_ok()    { printf '[ OK ] %s\n' "$*"; }
log_warn()  { printf '[ WARN ] %s\n' "$*" >&2; }
log_error() { printf '[ ERROR ] %s\n' "$*" >&2; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [--force] [--skip-cli]
  --force     settings.json und config.toml ueberschreiben (mit Backup)
  --skip-cli  Claude Code / Codex nicht installieren, nur Konfiguration
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --force) FORCE=1 ;;
      --skip-cli) SKIP_CLI=1 ;;
      -h|--help) usage; exit 0 ;;
      *) log_error "Unbekannte Option: $1"; usage; exit 2 ;;
    esac
    shift
  done
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log_error "$1 fehlt. $2"
    exit 1
  fi
}

# When started standalone, npm from NVM is not on PATH yet
load_nvm() {
  if ! command -v npm >/dev/null 2>&1 && [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
    # shellcheck disable=SC1091
    . "${HOME}/.nvm/nvm.sh"
  fi
}

install_claude_cli() {
  if command -v claude >/dev/null 2>&1; then
    log_ok "Claude Code bereits installiert ($(claude --version 2>/dev/null || echo '?'))"
    return 0
  fi
  log_info "Installiere Claude Code (nativer Installer nach ~/.local/bin)"
  # Official installer; it updates itself afterwards, so no version pin here
  curl -fsSL https://claude.ai/install.sh | bash
  export PATH="${HOME}/.local/bin:${PATH}"
}

install_codex_cli() {
  if command -v codex >/dev/null 2>&1; then
    log_ok "Codex bereits installiert ($(codex --version 2>/dev/null || echo '?'))"
    return 0
  fi
  require_cmd npm "Erst install.sh ausfuehren (NVM/Node)."
  log_info "Installiere Codex via npm"
  npm install -g @openai/codex
}

# Sync a repo directory into place. No --delete: local-only skills survive.
sync_dir() {
  local src="$1" dest="$2"
  shift 2
  if [[ ! -d "$src" ]]; then
    log_warn "${src#"${REPO_DIR}/"} fehlt im Repo; uebersprungen"
    return 0
  fi
  mkdir -p "$dest"
  rsync -a --checksum --backup --backup-dir="${BACKUP_DIR}${dest#"${HOME}"}" "$@" "${src}/" "${dest}/"
  log_ok "${dest}"
}

# Write a file that the CLI may also modify itself (settings, config.toml).
# $3 is an optional filter command that renders the file (e.g. templating).
install_config_file() {
  local src="$1" dest="$2" render="${3:-cat}"
  if [[ ! -f "$src" ]]; then
    log_warn "${src#"${REPO_DIR}/"} fehlt im Repo; uebersprungen"
    return 0
  fi

  local rendered
  rendered="$(mktemp)"
  "$render" <"$src" >"$rendered"

  if [[ -f "$dest" ]] && cmp -s "$rendered" "$dest"; then
    log_ok "${dest} unveraendert"
  elif [[ -f "$dest" && "$FORCE" -eq 0 ]]; then
    log_warn "${dest} existiert und weicht ab; behalten (mit --force ersetzen)"
  else
    if [[ -f "$dest" ]]; then
      mkdir -p "${BACKUP_DIR}$(dirname "${dest#"${HOME}"}")"
      cp -p "$dest" "${BACKUP_DIR}${dest#"${HOME}"}"
    fi
    mkdir -p "$(dirname "$dest")"
    install -m 600 "$rendered" "$dest"
    log_ok "${dest} geschrieben"
  fi
  rm -f "$rendered"
}

# Fills in $HOME and drops MCP servers whose command is not available here
render_codex_config() {
  local drop_dart=0
  command -v dart >/dev/null 2>&1 || drop_dart=1

  sed "s#__HOME__#${HOME}#g" | awk -v drop_dart="$drop_dart" '
    /^\[/ { skip = (drop_dart && $0 ~ /^\[mcp_servers\.dart[.\]]/) }
    !skip
  '
}

# Installs Claude plugins listed in ai/claude/plugins.tsv
# ("plugin@marketplace<TAB>github-repo"); marketplaces are added when missing.
install_claude_plugins() {
  local list="${AI_DIR}/claude/plugins.tsv"
  [[ -f "$list" ]] || return 0
  if ! command -v claude >/dev/null 2>&1; then
    log_warn "claude fehlt; Plugins uebersprungen"
    return 0
  fi

  local installed markets id repo market
  installed="$(claude plugin list --json)"
  markets="$(claude plugin marketplace list --json)"

  while IFS=$'\t' read -r id repo; do
    [[ -n "$id" ]] || continue
    market="${id#*@}"
    if ! grep -q "\"name\": \"${market}\"" <<<"$markets"; then
      if [[ -z "$repo" ]]; then
        log_warn "Marketplace '${market}' unbekannt; ${id} uebersprungen"
        continue
      fi
      claude plugin marketplace add "$repo" >/dev/null
      markets="$(claude plugin marketplace list --json)"
    fi
    if grep -q "\"id\": \"${id}\"" <<<"$installed"; then
      log_ok "Plugin ${id} bereits installiert"
    else
      claude plugin install "$id" >/dev/null
      log_ok "Plugin ${id} installiert"
    fi
  done <"$list"
}

# The fetch MCP server in config.toml runs from its own venv
install_fetch_mcp() {
  if [[ -x "${FETCH_MCP_VENV}/bin/python" ]] \
    && "${FETCH_MCP_VENV}/bin/python" -c 'import mcp_server_fetch' 2>/dev/null; then
    log_ok "MCP fetch bereits installiert"
    return 0
  fi
  require_cmd python3 "sudo apt-get install -y python3 python3-venv"
  log_info "Installiere MCP fetch nach ${FETCH_MCP_VENV}"
  python3 -m venv "$FETCH_MCP_VENV"
  "${FETCH_MCP_VENV}/bin/pip" install -q -U pip
  "${FETCH_MCP_VENV}/bin/pip" install -q mcp-server-fetch
  log_ok "MCP fetch installiert"
}

verify() {
  local ok=1
  for cmd in claude codex; do
    if command -v "$cmd" >/dev/null 2>&1; then
      log_ok "${cmd}: $("$cmd" --version 2>/dev/null | head -n1)"
    else
      log_warn "${cmd} nicht im PATH (neues Terminal oeffnen?)"
      ok=0
    fi
  done
  command -v dart >/dev/null 2>&1 || log_warn "dart fehlt; MCP-Server 'dart' wurde nicht eingetragen"
  [[ "$ok" -eq 1 ]]
}

main() {
  parse_args "$@"
  require_cmd rsync "sudo apt-get install -y rsync"
  require_cmd curl "sudo apt-get install -y curl"
  load_nvm

  if [[ "$SKIP_CLI" -eq 0 ]]; then
    install_claude_cli
    install_codex_cli
  fi

  log_info "Claude Code Konfiguration"
  install_config_file "${AI_DIR}/claude/settings.json" "${CLAUDE_DIR}/settings.json"
  [[ -f "${AI_DIR}/claude/CLAUDE.md" ]] && sync_dir "${AI_DIR}/claude" "$CLAUDE_DIR" \
    --include 'CLAUDE.md' --exclude '*'
  sync_dir "${AI_DIR}/claude/agents" "${CLAUDE_DIR}/agents"
  sync_dir "${AI_DIR}/claude/get-shit-done" "${CLAUDE_DIR}/get-shit-done"
  sync_dir "${AI_DIR}/claude/skills" "${CLAUDE_DIR}/skills"
  install_claude_plugins

  log_info "Codex Konfiguration"
  install_config_file "${AI_DIR}/codex/config.toml.template" "${CODEX_DIR}/config.toml" render_codex_config
  sync_dir "${AI_DIR}/codex" "$CODEX_DIR" --include 'AGENTS.md' --exclude '*'
  sync_dir "${AI_DIR}/codex/agents" "${CODEX_DIR}/agents"
  sync_dir "${AI_DIR}/codex/prompts" "${CODEX_DIR}/prompts"
  sync_dir "${AI_DIR}/codex/gsd" "${CODEX_DIR}/gsd"
  sync_dir "${AI_DIR}/codex/skills" "${CODEX_DIR}/skills"

  log_info "MCP-Voraussetzungen"
  install_fetch_mcp

  [[ -d "$BACKUP_DIR" ]] && log_warn "Ersetzte Dateien gesichert unter ${BACKUP_DIR}"

  if verify; then
    log_ok "Fertig. Anmelden mit: claude  bzw.  codex login"
  else
    log_error "Nicht alle CLIs verfuegbar"
    exit 1
  fi
}

main "$@"
