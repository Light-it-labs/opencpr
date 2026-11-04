#!/bin/bash
#
# OpenCPR kiosk launcher. Started by the opencpr-kiosk systemd user service;
# runs Chrome in kiosk mode in the foreground until Chrome exits.

set -uo pipefail

BOOTH_CONFIG="$HOME/.config/opencpr/booth.env"
NEXT_PATH_FILE="$HOME/.config/opencpr/next-path"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

config_missing() {
  echo "$1" >&2
  echo >&2
  echo "Set the booth up once:" >&2
  echo "  mkdir -p \"$(dirname "$BOOTH_CONFIG")\"" >&2
  echo "  cp \"$SCRIPT_DIR/../booth.env.example\" \"$BOOTH_CONFIG\"" >&2
  echo "  then edit $BOOTH_CONFIG and set KIOSK_URL to the kiosk's address." >&2
  exit 1
}

[ -f "$BOOTH_CONFIG" ] || config_missing "No booth configuration found at $BOOTH_CONFIG."
# shellcheck source-path=SCRIPTDIR
# shellcheck source=../booth.env.example
. "$BOOTH_CONFIG"
[ -n "${KIOSK_URL:-}" ] || config_missing "KIOSK_URL is empty in $BOOTH_CONFIG."
KIOSK_URL="${KIOSK_URL%/}"
KIOSK_PROFILE="${KIOSK_PROFILE:-$HOME/.opencpr-kiosk-profile}"
CHROME="${CHROME:-google-chrome}"

if ! command -v "$CHROME" >/dev/null 2>&1; then
  echo "Google Chrome not found: $CHROME. Run scripts/booth/ubuntu/install-booth.sh, or set CHROME in $BOOTH_CONFIG." >&2
  exit 1
fi

wait_for_network() {
  if command -v nm-online >/dev/null 2>&1; then
    nm-online -q --timeout 60 || echo "NetworkManager reports no connection yet; trying the kiosk address anyway."
  fi
  local attempt
  for attempt in $(seq 1 30); do
    if curl -fsS -o /dev/null --max-time 5 "$KIOSK_URL/"; then
      return 0
    fi
    [ "$attempt" -eq 1 ] && echo "Waiting for $KIOSK_URL…"
    sleep 2
  done
  echo "$KIOSK_URL is still unreachable; starting Chrome anyway."
}

wait_for_network

KIOSK_PATH="/"
if [ -f "$NEXT_PATH_FILE" ]; then
  read -r KIOSK_PATH <"$NEXT_PATH_FILE" || true
  rm -f "$NEXT_PATH_FILE"
  KIOSK_PATH="${KIOSK_PATH:-/}"
  case "$KIOSK_PATH" in
    /*) ;;
    *) KIOSK_PATH="/$KIOSK_PATH" ;;
  esac
fi

# Chrome no longer has a switch to suppress the "Restore pages?" bubble that
# follows a power cut. Recording a clean exit in the profile before launch is
# what keeps it off the touchscreen.
PREFERENCES="$KIOSK_PROFILE/Default/Preferences"
if [ -f "$PREFERENCES" ]; then
  sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"Crashed"/"exit_type":"Normal"/' "$PREFERENCES"
fi

# Only reaches the pointer on an X11 session; on Wayland, GNOME hides the
# cursor on touch by itself.
if command -v unclutter >/dev/null 2>&1; then
  if unclutter --help 2>&1 | grep -q -- '--timeout'; then
    unclutter --timeout 1 --start-hidden --hide-on-touch &
  else
    unclutter -idle 1 -root &
  fi
fi

echo "Starting the kiosk on $KIOSK_URL$KIOSK_PATH"
exec "$CHROME" \
  --kiosk \
  --user-data-dir="$KIOSK_PROFILE" \
  --no-first-run \
  --noerrdialogs \
  --disable-infobars \
  --disable-pinch \
  --disable-features=OverscrollHistoryNavigation \
  --check-for-update-interval=31536000 \
  --autoplay-policy=no-user-gesture-required \
  --password-store=basic \
  --remote-debugging-port=9222 \
  --remote-allow-origins=http://127.0.0.1:9222 \
  "$KIOSK_URL$KIOSK_PATH"
