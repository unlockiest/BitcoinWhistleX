#!/bin/bash
# This script is used to launch the BitcoinWhistleX application on macOS.
cd "$HOME/Desktop/github/BitcoinWhistleX"
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 20.16.0
npm run start
exec $SHELL
