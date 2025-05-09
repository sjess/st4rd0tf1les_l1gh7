![GitHub repo size](https://img.shields.io/github/languages/code-size/sjess/st4rd0tf1les_l1gh7?style=for-the-badge)
![GitHub last commit](https://img.shields.io/github/last-commit/sjess/st4rd0tf1les_l1gh7?style=for-the-badge)

# st4rd0tf1les

## Install WSL

Powershell with admin rights

```
wsl --install
```

## WSL Distribution

Install `Debian` or `Ubuntu` from the Microsoft Store and run it.

## What is used

### Terminal

- [oh-my-zsh](https://github.com/robbyrussell/oh-my-zsh)
- [powerlevel10k](https://github.com/romkatv/powerlevel10k)

Script installs ZSH, Composer, Node, NPM, NVM, PHP, Python3 & PIP 3

## Misc

### SUDO

For ease of use, make sure your user is in group sudo

```batch
sudo usermod -aG sudo {USERNAME}
```

and edit the following line in `sudoers` with `sudo nano /etc/sudoers` or `sudo vi /etc/sudoers`

```batch
# Allow members of group sudo to execute any command
%sudo   ALL=(ALL:ALL) NOPASSWD: ALL
```

**Now you can sudo without password.**

## Installation

You can install it by cloning the repository as `.dotfiles` in your home directory and running the bootstrap script. If you started your distribution and you are root, start with point 2 and follow instructions.

### 1.
```batch
git clone https://github.com/sjess/st4rd0tf1les_l1gh7.git ~/.dotfiles
cd ~/.dotfiles
./start
```

### 2.
```batch
cd ~/.dotfiles
./setup_sudo_user.sh
```

## Microsoft Terminal

Change commandline for example to `C:\Windows\System32\wsl.exe -d Ubuntu-24.04`

and startdirectory to `\\wsl$\Ubuntu-24.04\home\{USERNAME}\repositories` according to your distribution after you made the directory with `mkd repositories`.
