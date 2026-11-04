#!/bin/bash
#
# OpenCPR booth installer for Ubuntu 24.04 Desktop. Run once, from the
# repository clone, as the kiosk user (a sudoer): ./install-booth.sh
# Safe to run again: every step is idempotent.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BOOTH_CONFIG="$HOME/.config/opencpr/booth.env"
KIOSK_USER="$(id -un)"
CHROME_KEYRING="/etc/apt/keyrings/google-chrome.gpg"
CHROME_SOURCE="/etc/apt/sources.list.d/google-chrome.list"
UDEV_RULES="/etc/udev/rules.d/99-opencpr-arduino.rules"
CHROME_POLICY="/etc/opt/chrome/policies/managed/opencpr.json"
GDM_CONFIG="/etc/gdm3/custom.conf"
USER_UNIT_DIR="$HOME/.config/systemd/user"
KIOSK_SERVICE="opencpr-kiosk.service"

step() { echo; echo "==> $*"; }
wrote() { echo "    wrote $1"; }
fail() { echo "✗ $1" >&2; exit 1; }

[ "$(id -u)" -ne 0 ] || fail "Run this as the kiosk user, not as root: it uses sudo where needed."
command -v sudo >/dev/null 2>&1 || fail "sudo is required."
sudo -v || fail "This user needs sudo rights."

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

install_root_file() {
  sudo install -D -m "$1" "$2" "$3"
  wrote "$3"
}

step "Installing packages"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl ca-certificates gnupg jq git python3
if ! sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unclutter-xfixes; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unclutter
fi

step "Installing Google Chrome"
curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor >"$TMP_DIR/google-chrome.gpg"
install_root_file 0644 "$TMP_DIR/google-chrome.gpg" "$CHROME_KEYRING"
echo "deb [arch=amd64 signed-by=$CHROME_KEYRING] https://dl.google.com/linux/chrome/deb/ stable main" >"$TMP_DIR/google-chrome.list"
install_root_file 0644 "$TMP_DIR/google-chrome.list" "$CHROME_SOURCE"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq google-chrome-stable
echo "    $(google-chrome --version)"

step "Installing arduino-cli"
export PATH="$HOME/.local/bin:$PATH"
if command -v arduino-cli >/dev/null 2>&1; then
  echo "    already installed: $(arduino-cli version)"
else
  mkdir -p "$HOME/.local/bin"
  curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh >"$TMP_DIR/arduino-cli-install.sh"
  BINDIR="$HOME/.local/bin" sh "$TMP_DIR/arduino-cli-install.sh"
  wrote "$HOME/.local/bin/arduino-cli"
fi

step "Adding $KIOSK_USER to dialout, audio and video"
sudo usermod -aG dialout,audio,video "$KIOSK_USER"
echo "    takes effect at the next login"

step "Skipping the GNOME welcome tour for $KIOSK_USER"
install -D -m 0644 /dev/null "$HOME/.config/gnome-initial-setup-done"
echo yes >"$HOME/.config/gnome-initial-setup-done"
wrote "$HOME/.config/gnome-initial-setup-done"

step "Booth configuration"
if [ ! -f "$BOOTH_CONFIG" ]; then
  install -D -m 0644 "$SCRIPT_DIR/../booth.env.example" "$BOOTH_CONFIG"
  wrote "$BOOTH_CONFIG"
fi
# shellcheck source-path=SCRIPTDIR
# shellcheck source=../booth.env.example
. "$BOOTH_CONFIG"
if [ -z "${KIOSK_URL:-}" ]; then
  echo
  echo "KIOSK_URL is empty in $BOOTH_CONFIG, and the rest of the setup needs it."
  echo "Edit the file, set KIOSK_URL to the kiosk's address (origin only, e.g. https://kiosk.example.org),"
  echo "then run $SCRIPT_DIR/install-booth.sh again."
  exit 1
fi
KIOSK_URL="${KIOSK_URL%/}"
[[ "$KIOSK_URL" =~ ^https?://[^/[:space:]]+$ ]] || fail "KIOSK_URL must be an origin without a path, e.g. https://kiosk.example.org (got: $KIOSK_URL)."
echo "    kiosk: $KIOSK_URL"

step "udev rule for the Arduino"
install_root_file 0644 "$SCRIPT_DIR/99-opencpr-arduino.rules" "$UDEV_RULES"
sudo udevadm control --reload-rules
sudo udevadm trigger

step "Chrome policy"
sed "s|__KIOSK_URL__|$KIOSK_URL|g" "$SCRIPT_DIR/chrome-policy.template.json" >"$TMP_DIR/opencpr.json"
python3 -c 'import json, sys; json.load(open(sys.argv[1]))' "$TMP_DIR/opencpr.json" || fail "The rendered Chrome policy is not valid JSON."
install_root_file 0644 "$TMP_DIR/opencpr.json" "$CHROME_POLICY"

step "GDM auto-login for $KIOSK_USER"
{ [ -f "$GDM_CONFIG" ] && cat "$GDM_CONFIG"; } | awk -v user="$KIOSK_USER" '
  /^[[:space:]]*#?[[:space:]]*AutomaticLogin(Enable)?[[:space:]]*=/ { next }
  { print }
  /^\[daemon\]/ { print "AutomaticLoginEnable=true"; print "AutomaticLogin=" user; done = 1 }
  END { if (!done) { print ""; print "[daemon]"; print "AutomaticLoginEnable=true"; print "AutomaticLogin=" user } }
' >"$TMP_DIR/custom.conf"
install_root_file 0644 "$TMP_DIR/custom.conf" "$GDM_CONFIG"

step "GNOME settings for $KIOSK_USER"
GSETTINGS=(gsettings)
[ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ] || GSETTINGS=(dbus-run-session -- gsettings)
gset() {
  local schema="$1" key="$2" value="$3"
  if "${GSETTINGS[@]}" list-keys "$schema" 2>/dev/null | grep -qx "$key"; then
    "${GSETTINGS[@]}" set "$schema" "$key" "$value"
    echo "    $schema $key $value"
  else
    echo "    skipped $schema $key (not on this system)"
  fi
}
gset org.gnome.desktop.session idle-delay 0
gset org.gnome.desktop.screensaver lock-enabled false
gset org.gnome.desktop.screensaver idle-activation-enabled false
gset org.gnome.desktop.lockdown disable-lock-screen true
gset org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type "'nothing'"
gset org.gnome.settings-daemon.plugins.power sleep-inactive-battery-type "'nothing'"
gset org.gnome.desktop.notifications show-banners false
gset org.gnome.shell.extensions.dash-to-dock dock-fixed false
gset org.gnome.shell.extensions.dash-to-dock autohide true

step "Kiosk service"
chmod +x "$SCRIPT_DIR/start-kiosk.sh" "$SCRIPT_DIR/update-firmware.sh"
sed "s|__REPO_DIR__|$REPO_DIR|g" "$SCRIPT_DIR/opencpr-kiosk.service" >"$TMP_DIR/$KIOSK_SERVICE"
install -D -m 0644 "$TMP_DIR/$KIOSK_SERVICE" "$USER_UNIT_DIR/$KIOSK_SERVICE"
wrote "$USER_UNIT_DIR/$KIOSK_SERVICE"
sudo loginctl enable-linger "$KIOSK_USER"
if systemctl --user daemon-reload && systemctl --user enable "$KIOSK_SERVICE"; then
  echo "    enabled $KIOSK_SERVICE (starts with the graphical session)"
else
  echo "    could not talk to the user systemd instance; after the reboot run:"
  echo "      systemctl --user daemon-reload && systemctl --user enable --now $KIOSK_SERVICE"
fi

cat <<CHECKLIST

Done. Next:
  1. Reboot: sudo reboot
     The computer logs in as $KIOSK_USER and the kiosk opens $KIOSK_URL on its own.
  2. First run with a keyboard attached: complete /setup (location and Arduino mode)
     and grant the serial port once when Chrome asks.
  3. Confirm the booth shows up in the admin portal, then remove the keyboard.

Recovery, from ssh or Ctrl+Alt+F3:  systemctl --user restart $KIOSK_SERVICE
Logs:                                journalctl --user -u $KIOSK_SERVICE
CHECKLIST
