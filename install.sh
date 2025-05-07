#!/usr/bin/env bash
set -euo pipefail

# Ensure figlet is installed
if ! command -v figlet &> /dev/null; then
    echo "Installing figlet for banner generation..."
    sudo apt-get update -y && sudo apt-get install -y figlet
fi

# Clear screen and display banner in magenta
clear

echo -e "\e[1;35m"
figlet -f big -c NOVAGRAPHIX

echo -e "\e[0m"

# Install or update NVM and Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash && \
export NVM_DIR="$HOME/.nvm" && \
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && \
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion" && \

# Install latest Node.js and set as default
nvm install node && \
 nvm alias default node

# Verify installation
node -v
npm -v

# Install dependencies and start CLI
npm install
exec node index.js
