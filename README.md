![GitHub repo size](https://img.shields.io/github/repo-size/sjess/st4rd0tf1les?style=for-the-badge)
![GitHub last commit](https://img.shields.io/github/last-commit/sjess/st4rd0tf1les?style=for-the-badge)

#### st4rd0tf1les

# WSL aktivieren

Powershell mit Adminrechten

```
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

[Updatepaket für den WSL2-Linux-Kernel für x64-Computer](https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi)

# WSL

Install `Debian` or `Ubuntu` from the Microsoft Store and run it.

## Switching to WSL 2

> WSL 2 is only available in Windows 10 builds 18917 or higher

- To make sure you are using build 18917 or higher please join the [Windows Insider Program](https://insider.windows.com/en-us/) and select the 'Fast' ring or the 'Slow' ring.
- You can check your Windows version by opening Command Prompt and running the `ver` command.
- Enable the 'Virtual Machine Platform' optional component
- Set a distro to be backed by WSL 2 using the command line
- Verify what versions of WSL your distros are using

To set a distro please run:

`wsl --set-version <Distro> 2`

Additionally, if you want to make WSL 2 your default architecture you can do so with this command:

`wsl --set-default-version 2`

This will make any new distro that you install be initialized as a WSL 2 distro.

To verify what versions of WSL each distro is using use the following command (only available in Windows Build 18917 or higher):

`wsl --list --verbose` or `wsl -l -v`

The distro that you've chosen above should now display a '2' under the 'version' column. Now that you're finished feel free to start using your WSL 2 distro!

---

## Export, Import WSL

Export a clean version to duplicate it, if something fails (switch to windows downloads folder first e.g.):

```
wsl --export {DISTRO} {ANYNAME}.tar`
e.g. wsl --export Ubuntu-20.04 ubuntu.tar
```

Import to a certain location, switch to WSL 2 and add a user, since imports only have root:

```
wsl --import {NAME_OF_NEW_DISTRO} {LOCATION} {ANYNAME}.tar
e.g. wsl --import UbuntuDev d:\UbuntuDev ubuntu.tar
wsl --set-version UbuntuDev 2
```

Open new WSL Shell and add User, if it is a fresh install and you are root

```
useradd {USERNAME}
passwd {PASSWORD}
usermod -aG sudo {USERNAME}
```

To start WSL with that new username: `wsl --distribution UbuntuDev --user {USERNAME}`

Settings in Microsoft Terminal e.g.: `wsl.exe -d UbuntuDev -u sjess`

# What is used

## Terminal
- [youtube-dl](https://youtube-dl.org/)
- [htop](https://htop.dev/)
- [ranger](https://github.com/ranger/ranger)
- [neofetch](https://github.com/dylanaraps/neofetch)
- [ncdu](https://github.com/rofl0r/ncdu)

- [oh-my-zsh](https://github.com/robbyrussell/oh-my-zsh)
- [powerlevel10k](https://github.com/romkatv/powerlevel10k)

Script installs ZSH, Composer, Node, NPM, PHP7.4, Python3 & PIP

# Misc

## SUDO

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

# Installation

You can install it by cloning the repository as `.dotfiles` in your home directory and running the bootstrap script.

```batch
git clone https://github.com/sjess/st4rd0tf1les_l1gh7.git ~/.dotfiles
cd ~/.dotfiles
./start
```

# Microsoft Terminal

Download: [Windows Terminal](https://github.com/microsoft/terminal/releases)

To use WSL with WT put the following into the profile settings (watch the DISTRO, GUID and USERNAME) and don't forget to install the Font `FiraMono Nerd Font Mono` found under `~/.dotfiles/misc` in Windows.

```json
{
  "guid": "{YOUR_GUID}",
  "hidden": false,
  "name": "{YOUR_DISTRO}",
  "source": "Windows.Terminal.Wsl",
  "acrylicOpacity": 0.7,
  "closeOnExit": true,
  "colorScheme": "Campbell",
  "commandline": "wsl.exe -d {YOUR_DISTRO}",
  "cursorColor": "#FFFFFF",
  "cursorShape": "bar",
  "fontFace": "FiraMono Nerd Font Mono",
  "fontSize": 14,
  "historySize": 9001,
  "icon": "ms-appx:///ProfileIcons/{9acb9455-ca41-5af7-950f-6bca1bc9722f}.png",
  "name": "Ubuntu",
  "padding": "0, 10, 0, 10",
  "snapOnInput": true,
  "useAcrylic": true,
  "startingDirectory": "//wsl$/{YOUR_DISTRO}/home/{USERNAME}"
}
```

# Move WSL to another Drive

You can move the distribution to another drive using [lxRunOffline](https://github.com/DDoSolitary/LxRunOffline). Use an elevated Powershell for the following tasks.

Set permissions to the target folder. First, I think you must set some permissions to the folder where the distribution will be moved. But first create the destination folder.

```bash
C:\> whoami
test\**THENAME**

C:\> icacls D:\wsl /grant "**THENAME**:(OI)(CI)(F)"
```

[Read the Wiki for installing or moving a distro](https://github.com/DDoSolitary/LxRunOffline/wiki)

Move the distribution. Using lxrunoffline move.

```bash
C:\wsl> lxrunoffline move -n Ubuntu-18.04 -d d:\wsl\installed\Ubuntu-18.04
```

You may check the installation folder using

```bash
C:\wsl> lxrunoffline get-dir -n Ubuntu-18.04
d:\wsl\installed\Ubuntu-18.04
```

Run the distribution.

[StackOverflow](https://stackoverflow.com/questions/38779801/move-wsl-bash-on-windows-root-filesystem-to-another-hard-drive)
