![GitHub repo size](https://img.shields.io/github/languages/code-size/sjess/st4rd0tf1les_l1gh7?style=for-the-badge)
![GitHub last commit](https://img.shields.io/github/last-commit/sjess/st4rd0tf1les_l1gh7?style=for-the-badge)

# st4rd0tf1les

Bootstrap for a WSL2 development environment on Windows 11: ZSH with powerlevel10k, PHP, Node.js, Python, Claude Code, Codex and opencode, including shell aliases and functions. The AI tools and their configuration come from the separate repo [ai-setup](https://github.com/sjess/ai-setup).

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

`install.sh` installs NVM and the current Node.js LTS, then starts the interactive setup (`index.js`). The repository must live in `~/.dotfiles`, the shell config references that path.

### Always installed

- System update, build tools, git, curl, ffmpeg, htop, rsync, fzf
- Python 3 with pip and venv
- Libraries for headless browsers (Playwright)
- Nerd Fonts via [getnf](https://github.com/ronniedroid/getnf)
- Claude Code, Codex and opencode with skills, MCP servers and plugins via [ai-setup](https://github.com/sjess/ai-setup) (see below)
- `/etc/wsl.conf` from `shell/wsl.conf` (**replaces the existing file**)

### Optional (asked at start)

| Prompt | Installs |
| --- | --- |
| PHP 8 | PHP with common extensions, Composer, Laravel installer; on Ubuntu optionally `ppa:ondrej/php` |
| oh-my-zsh | ZSH as login shell, oh-my-zsh, powerlevel10k, zsh-autosuggestions, zsh-syntax-highlighting |
| NPM packages | global `ffmpeg-progressbar-cli` |
| Git | `user.name` and `user.email` |
| SSH key | new key in `~/.ssh` |

When the setup is done, open a new terminal.

## AI tools

Claude Code, Codex and opencode are set up by the separate private repo [ai-setup](https://github.com/sjess/ai-setup). As the last step, `index.js` clones it via SSH to `~/repositories/ai-setup` (or pulls it if it exists) and runs its `install.sh`. Instructions, skills, MCP servers, plugins and mods live there.

Cloning needs an SSH key known to GitHub. If GitHub doesn't accept the key yet, the setup shows the public key and waits until you have added it at https://github.com/settings/ssh/new, or lets you skip the step.

Log in after the setup:

```bash
claude
codex login
opencode auth login
```

Keep the AI configuration in sync on any machine with `ai-sync`; see the ai-setup README.

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
├── shell/                # .wsl2 (zshrc), .aliases, .functions, wsl.conf
├── themes/               # powerlevel10k theme
└── misc/                 # fonts, cheat sheet
```
