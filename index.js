#!/usr/bin/env node
'use strict';

// Core Dependencies
const chalk = require('chalk');
const dim = chalk.dim;
const cliProgress = require('cli-progress');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Startup Utilities
const checkNode = require('cli-check-node');
const unhandled = require('cli-handle-unhandled');
const pkgJSON = require('./package.json');
const clearConsole = require('clear-any-console');
const CFonts = require('cfonts');

// inquirer v9 is ESM-only; require() of ESM needs Node >= 20.19
const MIN_NODE_VERSION = '>=20.19.0';

// sudo resets the environment, so the frontend must be passed inline
const APT = 'sudo DEBIAN_FRONTEND=noninteractive apt-get';
const APT_KEEP_CONFIGS = '-o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold';

const APT_SOURCES_DIR = '/etc/apt/sources.list.d';
const APT_SOURCES_BACKUP_DIR = '/var/backups/wsl-dev-bootstrap';

/**
 * Displays a styled welcome banner.
 */
function welcomeBanner(options = {}) {
    const defaults = {
        title: 'ADD A HEADING',
        tagLine: '',
        description: '',
        bgColor: '#ffffff',
        color: '#000000',
        bold: true,
        version: ''
    };
    const cfg = { ...defaults, ...options };
    const { title, tagLine, description, bgColor, color, bold, version } = cfg;

    const bg = bold ? chalk.hex(bgColor).inverse.bold : chalk.hex(bgColor).inverse;
    const fg = bold ? chalk.hex(color).bold : chalk.hex(color);

    console.log();
    console.log(`${fg(`${bg(` ${title} `)}`)} v${version} ${dim(tagLine)}`);
    console.log(dim(description));
    console.log();
}

/**
 * Runs a shell command with optional output suppression.
 */
function runCommand(cmd, opts = {}) {
    const stdio = opts.ignoreOutput ? ['inherit', 'ignore', 'ignore'] : 'inherit';
    execSync(cmd, { stdio, ...opts });
}

function getUbuntuCodename() {
    if (fs.existsSync('/etc/os-release')) {
        const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
        const match = osRelease.match(/^VERSION_CODENAME=(.+)$/m);
        if (match) {
            return match[1].replace(/^"|"$/g, '').trim();
        }
    }

    try {
        return execSync('lsb_release -sc', { encoding: 'utf8' }).trim();
    } catch {
        return '';
    }
}

function isOndrejSupportedUbuntuCodename(codename) {
    return ['bionic', 'focal', 'jammy', 'noble', 'oracular', 'plucky'].includes(codename);
}

function isUbuntu() {
    if (!fs.existsSync('/etc/os-release')) {
        return false;
    }
    return /^ID=("?)ubuntu\1$/m.test(fs.readFileSync('/etc/os-release', 'utf8'));
}

/**
 * Disables leftover ppa:ondrej/php source files. After a release upgrade they
 * point to a codename without a Release file, which makes every
 * `apt-get update` fail. Files are moved to a backup dir instead of deleted.
 */
function removeOndrejPhpRepo() {
    if (!fs.existsSync(APT_SOURCES_DIR)) {
        return;
    }

    const stale = fs.readdirSync(APT_SOURCES_DIR)
        .filter(f => /^ondrej-ubuntu-php-.*\.(list|sources)$/.test(f));

    if (stale.length === 0) {
        return;
    }

    runCommand(`sudo mkdir -p ${APT_SOURCES_BACKUP_DIR}`);
    for (const file of stale) {
        runCommand(`sudo mv "${path.join(APT_SOURCES_DIR, file)}" "${APT_SOURCES_BACKUP_DIR}/"`);
        console.log(chalk.yellow(`[ WARN ] ${file} deaktiviert (Backup: ${APT_SOURCES_BACKUP_DIR})`));
    }
}

/**
 * Renders a config template (__HOME__ -> $HOME). Only writes when the target is
 * missing, because the tool may have changed its own config since.
 */
function installTemplate(src, dest) {
    if (!fs.existsSync(src)) {
        return;
    }
    const rendered = fs.readFileSync(src, 'utf8').replaceAll('__HOME__', process.env.HOME);

    if (!fs.existsSync(dest)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, rendered);
        console.log(chalk.green(`[ OK ] ${dest} geschrieben`));
    } else if (fs.readFileSync(dest, 'utf8') !== rendered) {
        console.log(chalk.yellow(`[ WARN ] ${dest} weicht von ${path.basename(src)} ab; behalten`));
    }
}

/**
 * Installs an array of packages displaying a progress bar.
 */
async function installPackages(title, pkgs) {
    console.log(chalk.blue(`\n[ START ] ${title}`));
    runCommand(`${APT} update -y`, { ignoreOutput: true });

    const bar = new cliProgress.SingleBar(
        { format: `${chalk.green(title)} |{bar}| {value}/{total}`, hideCursor: true }
    );

    bar.start(pkgs.length, 0);
    const start = Date.now();

    for (const pkg of pkgs) {
        runCommand(`${APT} install -y ${pkg}`, { ignoreOutput: true });
        bar.increment();
    }

    bar.stop();
    console.log(chalk.green(`[ DONE ] ${title} in ${Math.round((Date.now() - start) / 1000)}s`));
}

(async () => {
    // 0. Display ASCII Art Banner
    clearConsole();
    CFonts.say('NOVAGRAPHIX', {
        font: 'block', align: 'left', colors: ['green', 'white'], background: 'transparent',
        letterSpacing: 1, lineHeight: 1, space: true, maxLength: '0',
        gradient: ['green', 'white'], independentGradient: true, transitionGradient: true
    });

    // 0b. Welcome and Node check
    unhandled();
    welcomeBanner({
        title: '🚀 WSL Bootstrapper CLI',
        tagLine: `von ${pkgJSON.author}`,
        description: pkgJSON.description,
        version: pkgJSON.version,
        bgColor: '#6937FF',
        color: '#000000',
        bold: true
    });
    checkNode(MIN_NODE_VERSION);
    const inquirer = require('inquirer').default;

    // 0c. Prompt all user options at once
    const answers = await inquirer.prompt([
        { type: 'confirm', name: 'php', message: 'PHP 8 installieren?' },
        { type: 'list', name: 'distro', message: 'Ubuntu oder Debian?', choices: ['Ubuntu', 'Debian'], when: a => a.php },
        { type: 'confirm', name: 'ppa', message: 'PPA:ondrej/php hinzufügen?', when: a => a.php && a.distro === 'Ubuntu' },
        { type: 'confirm', name: 'zsh', message: 'Installiere oh-my-zsh?' },
        { type: 'confirm', name: 'npm', message: 'Globale NPM-Pakete installieren?' },
        { type: 'confirm', name: 'opencode', message: 'Opencode installieren?' },
        { type: 'confirm', name: 'git', message: 'GIT konfigurieren?' },
        { type: 'confirm', name: 'ssh', message: 'SSH-Key generieren?' }
    ]);

    // 0d. Stale PPA entries would break the first apt-get update below
    const ubuntuCodename = isUbuntu() ? getUbuntuCodename() : '';
    const ondrejSupported = isOndrejSupportedUbuntuCodename(ubuntuCodename);
    if (ubuntuCodename && !ondrejSupported) {
        removeOndrejPhpRepo();
    }

    // 1. System update & upgrade
    console.log(chalk.blue(`\n[ START ] System aktualisieren & upgraden`));
    let t0 = Date.now();
    runCommand(
        `${APT} update -y && ${APT} upgrade -y ${APT_KEEP_CONFIGS} && ${APT} dist-upgrade -y ${APT_KEEP_CONFIGS}`,
        { ignoreOutput: true }
    );
    console.log(chalk.green(`[ DONE ] System aktualisieren ... ${Math.round((Date.now() - t0) / 1000)}s`));

    // 1b. Create repositories directory
    runCommand('mkdir -p ~/repositories', { ignoreOutput: true });

    // 2. Install common requirements
    await installPackages('Common Requirements', [
        'software-properties-common', 'build-essential', 'apt-transport-https', 'git', 'curl',
        'unzip', 'libssl-dev', 'ca-certificates', 'ffmpeg', 'htop', 'rsync'
    ]);

    // 3. PHP installation
    if (answers.php) {
        if (answers.distro === 'Ubuntu' && answers.ppa) {
            if (ondrejSupported) {
                runCommand('sudo add-apt-repository ppa:ondrej/php -y', { ignoreOutput: true });
            } else {
                console.log(chalk.yellow(`\n[ SKIP ] ppa:ondrej/php wird fuer Ubuntu '${ubuntuCodename || 'unknown'}' nicht aktiviert.`));
                console.log(chalk.yellow('[ INFO ] Verwende stattdessen die offiziellen Ubuntu-Pakete fuer PHP.'));
            }
        }

        await installPackages('PHP 8 & Extensions', [
            'php', 'php-cli', 'php-json', 'php-common', 'php-mysql', 'php-zip', 'php-gd', 'php-imagick',
            'php-mbstring', 'php-curl', 'php-xml', 'php-xmlrpc', 'php-pear', 'php-bcmath', 'php-intl'
        ]);
    }

    // 4. Python3 & Pip3
    await installPackages('Python3 & Pip3', ['python3', 'python3-pip', 'python3-venv']);

    // 4b. MCP fetch server
    runCommand('python3 -m venv ~/.venvs/mcp-fetch', { ignoreOutput: true });
    runCommand('~/.venvs/mcp-fetch/bin/pip install -U pip', { ignoreOutput: true });
    runCommand('~/.venvs/mcp-fetch/bin/pip install mcp-server-fetch', { ignoreOutput: true });

    // 5. Miscellaneous libraries
    await installPackages('Misc Libraries', [
        'libatk1.0-0', 'libatk-bridge2.0-0', 'libcairo2', 'libcups2', 'libdbus-1-3', 'libexpat1',
        'libfontconfig1', 'libgcc1', 'libgdk-pixbuf-2.0-0', 'libglib2.0-0', 'libgtk-3-0', 'libnspr4',
        'libpango-1.0-0', 'libstdc++6', 'libx11-6', 'libxext6', 'libxrender1', 'libxss1', 'libxtst6',
        'libatomic1', 'lsb-release', 'xdg-utils', 'wget', 'fzf', 'fontconfig'
    ]);

    // 7. Oh-My-Zsh & plugins
    if (answers.zsh) {
        console.log(chalk.blue(`\n[ START ] ZSH installieren`));
        t0 = Date.now();

        runCommand(`${APT} install -y zsh`, { ignoreOutput: true });
        // Without a username, chsh would change root's shell
        runCommand('sudo chsh -s "$(command -v zsh)" "$USER"', { ignoreOutput: true });
        runCommand('rm -rf ~/.oh-my-zsh', { ignoreOutput: true });
        // Unattended: otherwise the installer ends with `exec zsh` and blocks this process
        runCommand(
            'curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh | RUNZSH=no CHSH=no sh -s -- --unattended',
            { ignoreOutput: true }
        );

        console.log(chalk.yellow('[ Additional ] Powerlevel10k installieren'));
        runCommand(
            'git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ~/.oh-my-zsh/custom/themes/powerlevel10k',
            { ignoreOutput: true }
        );

        console.log(chalk.yellow('[ Additional ] Powerline-Symbols installieren'));
        runCommand(`${APT} install -y fontconfig`, { ignoreOutput: true });
        runCommand(
            'wget https://github.com/powerline/powerline/raw/develop/font/PowerlineSymbols.otf',
            { ignoreOutput: true }
        );
        runCommand(
            'wget https://github.com/powerline/powerline/raw/develop/font/10-powerline-symbols.conf',
            { ignoreOutput: true }
        );
        runCommand('mkdir -p ~/.local/share/fonts/ ~/.config/fontconfig/conf.d/', { ignoreOutput: true });
        runCommand(
            'mv PowerlineSymbols.otf ~/.local/share/fonts/ && sudo fc-cache -vf ~/.local/share/fonts/ && mv 10-powerline-symbols.conf ~/.config/fontconfig/conf.d/',
            { ignoreOutput: true }
        );

        console.log(chalk.yellow('[ Additional ] zsh-autosuggestions installieren'));
        runCommand(
            'git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions',
            { ignoreOutput: true }
        );

        console.log(chalk.yellow('[ Additional ] zsh-syntax-highlighting installieren'));
        runCommand(
            'git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting',
            { ignoreOutput: true }
        );

        runCommand('rm -f ~/.zshrc', { ignoreOutput: true });
        runCommand('ln -s ~/.dotfiles/shell/.wsl2 ~/.zshrc', { ignoreOutput: true });

        console.log(chalk.green(`[ DONE ] ZSH installieren in ${Math.round((Date.now() - t0) / 1000)}s`));
    }

    // 8. WSL config
    if (fs.existsSync(path.join(process.env.HOME, '.dotfiles/shell/wsl.conf'))) {
        runCommand('sudo cp ~/.dotfiles/shell/wsl.conf /etc/wsl.conf', { ignoreOutput: true });
    }

    // 9. Nerd Fonts installer
    if (!fs.existsSync('getnf')) {
        runCommand(
            'git clone https://github.com/ronniedroid/getnf.git && cd getnf && ./install.sh',
            { ignoreOutput: true }
        );
    }

    // 10. opencode installation
    if (answers.opencode) {
        console.log(chalk.blue(`\n[ START ] opencode installieren`));
        t0 = Date.now();
        runCommand('curl -fsSL https://opencode.ai/install | bash');
        const dotfilesOpencode = path.join(__dirname, '.opencode');
        if (fs.existsSync(dotfilesOpencode)) {
            // "dir/." instead of "dir/*" so dot entries like skills/.system are included;
            // replaced files are backed up, local-only files are kept
            const backupDir = path.join(process.env.HOME, '.local/state/wsl-dev-bootstrap/backups/opencode');
            runCommand(`rsync -a --backup --backup-dir="${backupDir}" --exclude '*.template' "${dotfilesOpencode}/." "${process.env.HOME}/.opencode/"`);
            installTemplate(
                path.join(dotfilesOpencode, 'opencode.json.template'),
                path.join(process.env.HOME, '.opencode/opencode.json')
            );
        }
        console.log(chalk.green(`[ DONE ] opencode installieren in ${Math.round((Date.now() - t0) / 1000)}s`));
    }

    // 10b. Claude Code & Codex with the config exported to ai/ (always installed)
    console.log(chalk.blue(`\n[ START ] Claude Code & Codex installieren`));
    t0 = Date.now();
    runCommand(`bash "${path.join(__dirname, 'scripts/install_ai_tools.sh')}"`);
    console.log(chalk.green(`[ DONE ] Claude Code & Codex in ${Math.round((Date.now() - t0) / 1000)}s`));

    // 11. + 12. Composer & Laravel installer require PHP
    if (answers.php) {
        console.log(chalk.blue(`\n[ START ] Composer installieren`));
        t0 = Date.now();
        runCommand("curl -sS https://getcomposer.org/installer -o composer-setup.php");
        runCommand("sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer");
        runCommand("rm composer-setup.php");
        console.log(chalk.green(`[ DONE ] Composer installieren in ${Math.round((Date.now() - t0) / 1000)}s`));

        console.log(chalk.blue(`\n[ START ] Laravel Global Installer installieren`));
        t0 = Date.now();
        runCommand('composer global require laravel/installer', { ignoreOutput: true });
        console.log(chalk.green(`[ DONE ] Laravel Installer in ${Math.round((Date.now() - t0) / 1000)}s`));
    } else {
        console.log(chalk.yellow('\n[ SKIP ] Composer & Laravel Installer (PHP nicht gewaehlt)'));
    }

    // 13. Global NPM
    if (answers.npm) {
        console.log(chalk.blue(`\n[ START ] Globale NPM Packages`));
        t0 = Date.now();
        runCommand('npm install -g ffmpeg-progressbar-cli', { ignoreOutput: true });
        console.log(chalk.green(`[ DONE ] Globale NPM Packages in ${Math.round((Date.now() - t0) / 1000)}s`));
    }

    // 14. Git configuration
    if (answers.git) {
        console.log(chalk.blue(`\n[ START ] GIT konfigurieren`));
        t0 = Date.now();
        const { name, email } = await inquirer.prompt([
            { type: 'input', name: 'name', message: 'Name:' },
            { type: 'input', name: 'email', message: 'Email:' }
        ]);
        runCommand(`git config --global user.name "${name}"`);
        runCommand(`git config --global user.email "${email}"`);
        console.log(chalk.green(`[ DONE ] GIT konfigurieren in ${Math.round((Date.now() - t0) / 1000)}s`));
    }

    // 15. SSH key generation
    if (answers.ssh) {
        console.log(chalk.blue(`\n[ START ] SSH-Key generieren`));
        t0 = Date.now();
        // Output stays visible: ssh-keygen prompts for path and passphrase
        runCommand('ssh-keygen -t rsa -b 4096 -C "$USER@$HOSTNAME"');
        console.log(chalk.green(`[ DONE ] SSH-Key generiert in ~/.ssh in ${Math.round((Date.now() - t0) / 1000)}s`));
    }

    // 16. Cleanup
    console.log(chalk.blue('[ START ] Säubern'));
    t0 = Date.now();
    runCommand(`${APT} autoremove -y && ${APT} autoclean -y && ${APT} clean -y`, { ignoreOutput: true });
    console.log(chalk.green(`[ DONE ] Säubern in ${Math.round((Date.now() - t0) / 1000)}s`));

    // Final message
    console.log(chalk.green.bold('Setup abgeschlossen!'));

    // Insert dotfiles sourcing into bashrc
    runCommand(`cat << 'EOF' >> ~/.bashrc
for file in ~/.dotfiles/shell/.{exports,aliases,functions}; do
  [ -r "$file" ] && [ -f "$file" ] && source "$file"
done
unset file
EOF`);

    // A child process cannot change or reload the calling shell, so tell the user
    if (answers.zsh) {
        console.log(chalk.yellow('[ INFO ] Neues Terminal oeffnen oder `exec zsh` ausfuehren.'));
    } else {
        console.log(chalk.yellow('[ INFO ] Neues Terminal oeffnen oder `source ~/.bashrc` ausfuehren.'));
    }
})();
