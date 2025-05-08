#!/usr/bin/env node
'use strict';

// Core Dependencies
const chalk = require('chalk');
const dim = chalk.dim;
const inquirer = require('inquirer');
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

/**
 * Installs an array of packages displaying a progress bar.
 */
async function installPackages(title, pkgs) {
    console.log(chalk.blue(`\n[ START ] ${title}`));
    runCommand('sudo apt-get update -y', { ignoreOutput: true });

    const bar = new cliProgress.SingleBar(
        { format: `${chalk.green(title)} |{bar}| {value}/{total}`, hideCursor: true }
    );

    bar.start(pkgs.length, 0);
    const start = Date.now();

    for (const pkg of pkgs) {
        runCommand(`sudo apt-get install -y ${pkg}`, { ignoreOutput: true });
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
    checkNode('>=10.0.0');

    // 0c. Prompt all user options at once
    const answers = await inquirer.prompt([
        { type: 'confirm', name: 'php', message: 'PHP 8 installieren?' },
        { type: 'list', name: 'distro', message: 'Ubuntu oder Debian?', choices: ['Ubuntu', 'Debian'], when: a => a.php },
        { type: 'confirm', name: 'ppa', message: 'PPA:ondrej/php hinzufügen?', when: a => a.php && a.distro === 'Ubuntu' },
        { type: 'confirm', name: 'zsh', message: 'Installiere oh-my-zsh?' },
        { type: 'confirm', name: 'npm', message: 'Globale NPM-Pakete installieren?' },
        { type: 'confirm', name: 'git', message: 'GIT konfigurieren?' },
        { type: 'confirm', name: 'ssh', message: 'SSH-Key generieren?' }
    ]);

    // 1. System update & upgrade
    console.log(chalk.blue(`\n[ START ] System aktualisieren & upgraden`));
    let t0 = Date.now();
    runCommand(
        'sudo apt-get update -y && sudo apt-get upgrade -y && sudo apt-get dist-upgrade -y',
        { ignoreOutput: true }
    );
    console.log(chalk.green(`[ DONE ] System aktualisieren ... ${Math.round((Date.now() - t0) / 1000)}s`));

    // 2. Install common requirements
    await installPackages('Common Requirements', [
        'software-properties-common', 'build-essential', 'apt-transport-https', 'git', 'curl',
        'unzip', 'libssl-dev', 'ca-certificates', 'ffmpeg', 'htop'
    ]);

    // 3. PHP installation
    if (answers.php) {
        if (answers.distro === 'Ubuntu' && answers.ppa) {
            runCommand('sudo add-apt-repository ppa:ondrej/php -y');
        } else if (answers.distro === 'Debian') {
            runCommand(
                "echo 'deb https://packages.sury.org/php/ $(lsb_release -sc) main' | sudo tee /etc/apt/sources.list.d/php.list"
            );
            runCommand(
                'wget -qO - https://packages.sury.org/php/apt.gpg | sudo apt-key add -',
                { ignoreOutput: true }
            );
        }

        await installPackages('PHP 8 & Extensions', [
            'php', 'php-cli', 'php-json', 'php-common', 'php-mysql', 'php-zip', 'php-gd', 'php-imagick',
            'php-mbstring', 'php-curl', 'php-xml', 'php-xmlrpc', 'php-pear', 'php-bcmath', 'php-intl'
        ]);
    }

    // 4. Python3 & Pip3
    await installPackages('Python3 & Pip3', ['python3', 'python3-pip']);

    // 5. Miscellaneous libraries
    await installPackages('Misc Libraries', [
        'libatk1.0-0', 'libatk-bridge2.0-0', 'libcairo2', 'libcups2', 'libdbus-1-3', 'libexpat1',
        'libfontconfig1', 'libgcc1', 'libgdk-pixbuf2.0-0', 'libglib2.0-0', 'libgtk-3-0', 'libnspr4',
        'libpango-1.0-0', 'libstdc++6', 'libx11-6', 'libxext6', 'libxrender1', 'libxss1', 'libxtst6',
        'lsb-release', 'xdg-utils', 'wget', 'fzf', 'fontconfig'
    ]);

    // 6. Oh-My-Zsh & plugins
    if (answers.zsh) {
        console.log(chalk.blue(`\n[ START ] ZSH installieren`));
        t0 = Date.now();

        runCommand('sudo apt-get install -y zsh', { ignoreOutput: true });
        runCommand('sudo chsh -s /usr/bin/zsh', { ignoreOutput: true });
        runCommand('rm -rf ~/.oh-my-zsh', { ignoreOutput: true });
        runCommand(
            'curl -L https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh | sh',
            { ignoreOutput: true }
        );

        console.log(chalk.yellow('[ Additional ] Powerlevel10k installieren'));
        runCommand(
            'git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ~/.oh-my-zsh/custom/themes/powerlevel10k',
            { ignoreOutput: true }
        );

        console.log(chalk.yellow('[ Additional ] Powerline-Symbols installieren'));
        runCommand('sudo apt-get install -y fontconfig', { ignoreOutput: true });
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

    // 7. WSL config
    if (fs.existsSync(path.join(process.env.HOME, '.dotfiles/shell/wsl.conf'))) {
        runCommand('sudo cp ~/.dotfiles/shell/wsl.conf /etc/wsl.conf', { ignoreOutput: true });
    }

    // 8. Nerd Fonts installer
    if (!fs.existsSync('getnf')) {
        runCommand(
            'git clone https://github.com/ronniedroid/getnf.git && cd getnf && ./install.sh',
            { ignoreOutput: true }
        );
    }

    // 9. Composer installation
    console.log(chalk.blue(`\n[ START ] Composer installieren`));
    t0 = Date.now();
    runCommand("php -r \"copy('https://getcomposer.org/installer','composer-setup.php');\"", { ignoreOutput: true });
    runCommand(
        "php -r \"if(hash_file('sha384','composer-setup.php')==='dac665fdc30fdd8ec78b38b9800061b4150413ff2e3b6f88543c636f7cd84f6db9189d43a81e5503cda447da73c7e5b6'){echo 'Installer verified';}else{echo 'Installer corrupt';unlink('composer-setup.php');}echo PHP_EOL;\"",
        { ignoreOutput: false }
    );
    runCommand('php composer-setup.php', { ignoreOutput: true });
    runCommand("php -r \"unlink('composer-setup.php');\"", { ignoreOutput: true });
    runCommand('sudo mv composer.phar /usr/local/bin/composer', { ignoreOutput: true });
    console.log(chalk.green(`[ DONE ] Composer installieren in ${Math.round((Date.now() - t0) / 1000)}s`));

    // 10. Laravel installer
    console.log(chalk.blue(`\n[ START ] Laravel Global Installer installieren`));
    t0 = Date.now();
    runCommand('composer global require laravel/installer', { ignoreOutput: true });
    console.log(chalk.green(`[ DONE ] Laravel Installer in ${Math.round((Date.now() - t0) / 1000)}s`));

    // 11. Global NPM
    if (answers.npm) {
        console.log(chalk.blue(`\n[ START ] Globale NPM Packages`));
        t0 = Date.now();
        runCommand('npm install -g ffmpeg-progressbar-cli', { ignoreOutput: true });
        console.log(chalk.green(`[ DONE ] Globale NPM Packages in ${Math.round((Date.now() - t0) / 1000)}s`));
    }

    // 12. Git configuration
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

    // 13. SSH key generation
    if (answers.ssh) {
        console.log(chalk.blue(`\n[ START ] SSH-Key generieren`));
        t0 = Date.now();
        runCommand('ssh-keygen -t rsa -b 4096 -C "$USER@$HOSTNAME"', { ignoreOutput: true });
        console.log(chalk.green(`[ DONE ] SSH-Key generiert in ~/.ssh in ${Math.round((Date.now() - t0) / 1000)}s`));
    }

    // 14. Cleanup
    console.log(chalk.blue('[ START ] Säubern'));
    t0 = Date.now();
    runCommand('sudo apt-get autoremove -y && sudo apt-get autoclean -y && sudo apt-get clean -y', { ignoreOutput: true });
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

    // Change shell or source bashrc
    if (answers.zsh) {
        runCommand('chsh -s $(which zsh)');
        runCommand('zsh');
    } else {
        runCommand('source ~/.bashrc');
    }
})();
