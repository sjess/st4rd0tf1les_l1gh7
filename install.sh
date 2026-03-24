#!/usr/bin/env bash
set -euo pipefail

clear

# Install libatomic for Node.js
sudo apt-get update -y && sudo apt-get install -y libatomic1

# Install NVM and Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"

nvm install node
nvm alias default node

node -v
npm -v

npm install
exec node index.js
