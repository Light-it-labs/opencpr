#!/bin/bash
#
# OpenCPR Chrome serial policy — macOS
#
# Double-click on the booth Mac to let the kiosk open the Arduino's serial
# port without Chrome asking. It writes Chrome's SerialAllowUsbDevicesForUrls
# policy with one entry: the kiosk's origin may use any USB serial device from
# Arduino (vendor id 0x2341, so an Uno and a Mega both match). With it, a board
# plugged back in after a reboot or a replug is picked up with no keyboard at
# the booth. Without it, the port has to be granted once per Chrome profile,
# by hand, from the /setup screen.
#
# Reads KIOSK_URL from ~/.config/opencpr/booth.env, the same file the other
# booth scripts use, so the policy names the same origin the kiosk runs on.
#
# From a shell, `install-chrome-serial-policy.command --remove` deletes the
# policy again.
#
# The policy goes into the com.google.Chrome preferences of the current user,
# which Chrome on macOS reads as a platform policy. Chrome only reads it at
# launch, so the kiosk has to be restarted. chrome://policy lists it once it is
# in force; if Chrome shows it but ignores it, install the same policy through
# a configuration profile instead.

set -uo pipefail

BOOTH_CONFIG="$HOME/.config/opencpr/booth.env"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
POLICY_KEY="SerialAllowUsbDevicesForUrls"
# Overridable so the script can be tried against a scratch domain.
POLICY_DOMAIN="${OPENCPR_CHROME_POLICY_DOMAIN:-com.google.Chrome}"
# Arduino's USB vendor id, 0x2341. No product id, so every Arduino board matches.
ARDUINO_VENDOR_ID=9025

config_missing() {
  echo "$1"
  echo
  echo "Set the booth up once:"
  echo "  mkdir -p \"$(dirname "$BOOTH_CONFIG")\""
  echo "  cp \"$SCRIPT_DIR/../booth.env.example\" \"$BOOTH_CONFIG\""
  echo "  then edit $BOOTH_CONFIG and set KIOSK_URL to the kiosk's address."
  read -r -p "Press return to close."
  exit 1
}

fail() {
  echo
  echo "✗ $1"
  read -r -p "Press return to close."
  exit 1
}

if [ "${1:-}" = "--remove" ]; then
  if defaults read "$POLICY_DOMAIN" "$POLICY_KEY" >/dev/null 2>&1; then
    defaults delete "$POLICY_DOMAIN" "$POLICY_KEY" || fail "Could not delete $POLICY_KEY from $POLICY_DOMAIN."
    echo "✓ $POLICY_KEY removed from $POLICY_DOMAIN."
    echo "Restart the kiosk for Chrome to notice: plug in a keyboard, press Cmd+Q, double-click start-kiosk.command."
  else
    echo "$POLICY_KEY is not set in $POLICY_DOMAIN. Nothing was changed."
  fi
  echo "Done. You can close this window."
  exit 0
fi

[ -f "$BOOTH_CONFIG" ] || config_missing "No booth configuration found at $BOOTH_CONFIG. Nothing was changed."
# shellcheck source-path=SCRIPTDIR
# shellcheck source=../booth.env.example
. "$BOOTH_CONFIG"
[ -n "${KIOSK_URL:-}" ] || config_missing "KIOSK_URL is empty in $BOOTH_CONFIG. Nothing was changed."
KIOSK_URL="${KIOSK_URL%/}"

# One entry, in the shape Chrome documents for this policy: a list of
# dictionaries, each with `urls` (a list of strings) and `devices` (a list of
# dictionaries with integer vendor_id and, optionally, product_id). The XML
# plist fragment below is how `defaults write` takes a dictionary inside an
# array.
POLICY_ENTRY="<dict>\
<key>urls</key><array><string>${KIOSK_URL}</string></array>\
<key>devices</key><array><dict><key>vendor_id</key><integer>${ARDUINO_VENDOR_ID}</integer></dict></array>\
</dict>"

defaults write "$POLICY_DOMAIN" "$POLICY_KEY" -array "$POLICY_ENTRY" \
  || fail "Could not write $POLICY_KEY to $POLICY_DOMAIN."

echo "✓ $POLICY_KEY set in $POLICY_DOMAIN:"
echo "    origin:  $KIOSK_URL"
echo "    devices: USB vendor id $ARDUINO_VENDOR_ID (0x2341, Arduino), any product"
echo
echo "As stored:"
defaults read "$POLICY_DOMAIN" "$POLICY_KEY"
echo
echo "Chrome reads policies at launch. Restart the kiosk: plug in a keyboard,"
echo "press Cmd+Q, double-click start-kiosk.command. Then check chrome://policy"
echo "lists $POLICY_KEY."
echo "Done. You can close this window."
