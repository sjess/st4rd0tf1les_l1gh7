#!/usr/bin/env bash
set -euo pipefail

clear

# Install NVM and Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"

nvm install node
nvm alias default node

node -v
npm -v

# Install opencode
curl -fsSL https://opencode.ai/install | bash

# Copy opencode config from dotfiles
if [ -d "$HOME/.dotfiles/.opencode" ]; then
    cp -r "$HOME/.dotfiles/.opencode"/* "$HOME/.opencode/"
fi

npm install
exec node index.js
