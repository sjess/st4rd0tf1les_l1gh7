![GitHub repo size](https://img.shields.io/github/languages/code-size/sjess/st4rd0tf1les_l1gh7?style=for-the-badge)
![GitHub last commit](https://img.shields.io/github/last-commit/sjess/st4rd0tf1les_l1gh7?style=for-the-badge)

# st4rd0tf1les

Bootstrap for a WSL2 development environment on Windows 11: ZSH with powerlevel10k, PHP, Node.js, Python, Claude Code, Codex and opencode, including shell aliases, functions and AI tool configuration.

## Requirements

- Windows 11 with WSL2
- Ubuntu (24.04 or newer) or Debian

## 1. Install WSL

PowerShell with admin rights:

```powershell
wsl --install -d Ubuntu
```

Start the distribution and create your user when asked.

## 2. Sudo user (only if you are root)

If the distribution starts as `root` (e.g. after `wsl --import`), create a user first:

```bash
git clone https://github.com/sjess/st4rd0tf1les_l1gh7.git ~/.dotfiles
cd ~/.dotfiles
./setup_sudo_user.sh
```

The script creates the user, adds it to `sudo`, enables passwordless sudo for the `sudo` group and sets it as the WSL default user. Afterwards run `wsl --shutdown` in PowerShell and start the distribution again.

## 3. Installation

```bash
git clone https://github.com/sjess/st4rd0tf1les_l1gh7.git ~/.dotfiles
cd ~/.dotfiles
./install.sh
```

`install.sh` installs NVM and the current Node.js, then starts the interactive setup (`index.js`). The repository must live in `~/.dotfiles`, the shell config references that path.

### Always installed

- System update, build tools, git, curl, ffmpeg, htop, rsync, fzf
- Python 3 with pip and venv, MCP fetch server
- Libraries for headless browsers (Playwright)
- Nerd Fonts via [getnf](https://github.com/ronniedroid/getnf)
- [Claude Code](https://docs.claude.com/en/docs/claude-code) and [Codex](https://github.com/openai/codex) with skills, agents and MCP servers (see below)
- `/etc/wsl.conf` from `shell/wsl.conf` (**replaces the existing file**)

### Optional (asked at start)

| Prompt | Installs |
| --- | --- |
| PHP 8 | PHP with common extensions, Composer, Laravel installer; on Ubuntu optionally `ppa:ondrej/php` |
| oh-my-zsh | ZSH as login shell, oh-my-zsh, powerlevel10k, zsh-autosuggestions, zsh-syntax-highlighting |
| NPM packages | global `ffmpeg-progressbar-cli` |
| opencode | [opencode](https://opencode.ai) with the config from `.opencode/` |
| Git | `user.name` and `user.email` |
| SSH key | new key in `~/.ssh` |

When the setup is done, open a new terminal.

## AI tools

The global configuration of Claude Code and Codex lives in `ai/`:

- `ai/claude/`: `settings.json`, agents, GSD (get-shit-done)
- `ai/codex/`: `AGENTS.md`, `config.toml` (as template), agents, prompts, skills

Credentials are not part of the repository. Log in after the setup:

```bash
claude
codex login
```

Update the repository after changing skills, agents or MCP servers on your machine:

```bash
./scripts/export_ai_config.sh
git status ai/
```

Apply the configuration without running the full setup:

```bash
./scripts/install_ai_tools.sh             # install CLIs and config
./scripts/install_ai_tools.sh --skip-cli  # config only
./scripts/install_ai_tools.sh --force     # also replace existing settings.json / config.toml
```

`settings.json`, `config.toml` and `opencode.json` are only written when missing, because the tools change them themselves. `__HOME__` in the templates is replaced with your home directory. Replaced files are backed up to `~/.local/state/wsl-dev-bootstrap/backups/`.

## Windows Terminal

Profile settings for the distribution:

- Command line: `wsl.exe -d Ubuntu`
- Starting directory: `\\wsl.localhost\Ubuntu\home\<USERNAME>\repositories`
- Font: a Nerd Font, e.g. from `misc/` (install it on Windows), otherwise the powerlevel10k icons are missing

Use the distribution name shown by `wsl -l -v`.

## Repository structure

```text
~/.dotfiles/
├── install.sh            # NVM + Node.js, starts index.js
├── index.js              # interactive setup
├── setup_sudo_user.sh    # create sudo user (as root)
├── scripts/              # export / install AI tool config
├── ai/                   # Claude Code and Codex config
├── .opencode/            # opencode config and skills
├── shell/                # .wsl2 (zshrc), .aliases, .functions, wsl.conf
├── themes/               # powerlevel10k theme
└── misc/                 # fonts, cheat sheet
```
