#!/bin/bash

# Benutzername abfragen
read -rp "Gib den Namen des neuen Benutzers ein: " USERNAME

# 1. Benutzer erstellen, wenn er noch nicht existiert
if id "$USERNAME" &>/dev/null; then
    echo "Benutzer '$USERNAME' existiert bereits."
else
    echo "Erstelle Benutzer '$USERNAME'..."
    adduser --gecos "" "$USERNAME"
fi

# 2. Zur sudo-Gruppe hinzufügen
usermod -aG sudo "$USERNAME"

# 3. sudoers: %sudo Gruppe für passwortloses sudo anpassen
echo "Aktualisiere /etc/sudoers ..."
sed -i 's/^%sudo\s\+ALL=(ALL:ALL)\s\+ALL/%sudo ALL=(ALL:ALL) NOPASSWD: ALL/' /etc/sudoers

# 4. Standardbenutzer in /etc/wsl.conf setzen
if ! grep -q '^\[user\]' /etc/wsl.conf; then
  cat <<EOF >> /etc/wsl.conf

[user]
default=$USERNAME
EOF
fi

echo "Fertig! '$USERNAME' ist jetzt Standardbenutzer mit sudo ohne Passwort."
echo "Starte WSL mit 'wsl --shutdown' neu, um die Änderungen zu aktivieren."
