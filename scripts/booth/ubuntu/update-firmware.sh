#!/bin/bash
#
# OpenCPR booth firmware updater. Run as the kiosk user, from a TTY or over
# ssh: ~/opencpr/scripts/booth/ubuntu/update-firmware.sh
#
# Fast-forwards the clone to origin/main, compiles hardware/arduino.ino (for
# ARDUINO_FQBN when it is set, otherwise for both the Uno and the Mega),
# switches the kiosk to its maintenance screen, flashes the board and brings
# the kiosk back. Without ARDUINO_FQBN it detects whether an Uno or a Mega is
# plugged in, and refuses none or more than one. The board keeps its EEPROM, so its device ID (the kiosk ID)
# survives the upload.

set -uo pipefail

BOOTH_CONFIG="$HOME/.config/opencpr/booth.env"
NEXT_PATH_FILE="$HOME/.config/opencpr/next-path"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LIBRARIES=("ArduinoJson@7.4.3" "STM32duino VL53L4CD@1.0.5")
# Boards detected when ARDUINO_FQBN is not set. A board is recognized by its
# USB ID, so a clone with a generic USB chip needs ARDUINO_FQBN and SERIAL_PORT.
SUPPORTED_FQBNS=("arduino:avr:uno" "arduino:avr:mega")
DEVTOOLS="http://127.0.0.1:9222"
KIOSK_SERVICE="opencpr-kiosk.service"

config_missing() {
  echo "$1" >&2
  echo >&2
  echo "Set the booth up once:" >&2
  echo "  mkdir -p \"$(dirname "$BOOTH_CONFIG")\"" >&2
  echo "  cp \"$SCRIPT_DIR/../booth.env.example\" \"$BOOTH_CONFIG\"" >&2
  echo "  then edit $BOOTH_CONFIG and set KIOSK_URL to the kiosk's address." >&2
  exit 1
}

fail() {
  echo >&2
  echo "✗ $1" >&2
  exit 1
}

ask() {
  local answer
  read -r -p "$1 [y/N] " answer || return 1
  [[ "$answer" =~ ^[Yy]$ ]]
}

# Reads `arduino-cli board list --format json` and prints "<port> <fqbn>" for
# every port whose board is one of the given FQBNs. Exact match, so a Mega ADK
# (arduino:avr:megaADK) never counts as a Mega.
boards_matching() {
  jq -r --args '$ARGS.positional as $ok
    | (if type == "object" then .detected_ports else . end) // [] | .[]
    | .port.address as $port
    | first(.matching_boards[]?.fqbn | select(IN($ok[]))) // empty
    | "\($port) \(.)"' "$@"
}

build_path() {
  printf '%s/%s' "$BUILD_ROOT" "${1//:/-}"
}

[ -f "$BOOTH_CONFIG" ] || config_missing "No booth configuration found at $BOOTH_CONFIG. Nothing was changed."
# shellcheck source-path=SCRIPTDIR
# shellcheck source=../booth.env.example
. "$BOOTH_CONFIG"
[ -n "${KIOSK_URL:-}" ] || config_missing "KIOSK_URL is empty in $BOOTH_CONFIG. Nothing was changed."
KIOSK_URL="${KIOSK_URL%/}"
ARDUINO_FQBN="${ARDUINO_FQBN:-}"
SERIAL_PORT="${SERIAL_PORT:-}"
[ -z "$SERIAL_PORT" ] || [ -n "$ARDUINO_FQBN" ] \
  || fail "SERIAL_PORT is set in $BOOTH_CONFIG but ARDUINO_FQBN is not: set ARDUINO_FQBN to the board on that port (arduino:avr:uno or arduino:avr:mega). Nothing was changed."

REPO_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null)" || REPO_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SKETCH="$REPO_DIR/hardware/arduino.ino"

# Only a clean checkout of main that ends up exactly at origin/main counts as
# up to date. Fast-forward only, so local edits are never merged or overwritten.
if [ -z "${OPENCPR_UPDATER_PULLED:-}" ] && git -C "$SCRIPT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Updating the firmware from GitHub…"
  BEFORE="$(git -C "$REPO_DIR" rev-parse HEAD)"
  PROBLEM=""
  LOCAL_CHANGES="$(git -C "$REPO_DIR" -c core.fileMode=false status --porcelain --untracked-files=no)"

  if [ -n "$LOCAL_CHANGES" ]; then
    PROBLEM="this computer's copy has local changes:"$'\n'"$LOCAL_CHANGES"$'\n'"(run 'git restore .' in $REPO_DIR to drop them)"
  elif [ "$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD)" != "main" ]; then
    PROBLEM="this computer's copy is not on main"
  elif ! git -C "$REPO_DIR" fetch origin main || ! git -C "$REPO_DIR" merge --ff-only FETCH_HEAD; then
    PROBLEM="GitHub could not be reached, or main could not be fast-forwarded"
  elif [ "$(git -C "$REPO_DIR" rev-parse HEAD)" != "$(git -C "$REPO_DIR" rev-parse FETCH_HEAD)" ]; then
    PROBLEM="this computer's main has commits that are not on GitHub"
  fi

  if [ -z "$PROBLEM" ]; then
    echo "✓ Firmware is at $(git -C "$REPO_DIR" log -1 --format='%h %s')"
    if [ "$(git -C "$REPO_DIR" rev-parse HEAD)" != "$BEFORE" ]; then
      export OPENCPR_UPDATER_PULLED=1
      exec "$SCRIPT_DIR/$(basename "$0")" "$@"
    fi
  else
    echo "Could not update to the latest firmware: ${PROBLEM}."
    ask "Flash the firmware already on this computer instead?" || fail "Nothing was changed."
  fi
fi

[ -f "$SKETCH" ] || fail "arduino.ino not found at $SKETCH."

export PATH="$HOME/.local/bin:$PATH"
command -v arduino-cli >/dev/null 2>&1 || fail "arduino-cli is not installed. Run $SCRIPT_DIR/install-booth.sh first."
command -v jq >/dev/null 2>&1 || fail "jq is not installed. Run $SCRIPT_DIR/install-booth.sh first."
echo "✓ $(arduino-cli version)"

if ! arduino-cli core list | grep -q "^arduino:avr "; then
  echo "Installing the Arduino AVR core (first run only)…"
  arduino-cli core update-index >/dev/null || fail "Could not update the board index."
  arduino-cli core install arduino:avr || fail "Could not install arduino:avr."
fi
echo "✓ Arduino AVR core ready"

# Pinned versions on every run: a name-only check would keep an older
# ArduinoJson 6, which this sketch does not compile with.
for library in "${LIBRARIES[@]}"; do
  arduino-cli lib install "$library" >/dev/null || fail "Could not install ${library}."
done
echo "✓ Libraries ready"

# arduino-cli wants the sketch inside a folder with the same name.
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
BUILD_DIR="$TMP_DIR/arduino"
mkdir -p "$BUILD_DIR"
cp "$SKETCH" "$BUILD_DIR/arduino.ino"
BUILD_ROOT="$TMP_DIR/builds"

if [ -n "$ARDUINO_FQBN" ]; then
  BUILD_FQBNS=("$ARDUINO_FQBN")
else
  BUILD_FQBNS=("${SUPPORTED_FQBNS[@]}")
fi

# Every candidate board is compiled before the kiosk is touched, so a build
# problem never leaves the booth without its kiosk.
for fqbn in "${BUILD_FQBNS[@]}"; do
  echo "Compiling for ${fqbn}…"
  arduino-cli compile --fqbn "$fqbn" --build-path "$(build_path "$fqbn")" "$BUILD_DIR" >/dev/null \
    || fail "Compile failed for ${fqbn}. The kiosk and the board were not touched."
done
echo "✓ Firmware compiled"

devtools_page_id() {
  curl -fsS --max-time 3 "$DEVTOOLS/json/list" | jq -r '[.[] | select(.type == "page")][0].id // empty'
}

# Opens the URL in a new tab, which in kiosk mode is what the screen shows, then
# closes the previous tab so it releases the serial port. /json/new accepts PUT only.
kiosk_show() {
  local url="$1" old_id new_id
  old_id="$(devtools_page_id 2>/dev/null)"
  [ -n "$old_id" ] || return 1
  new_id="$(curl -fsS --max-time 5 -X PUT "$DEVTOOLS/json/new?$url" | jq -r '.id // empty')"
  [ -n "$new_id" ] || return 1
  curl -fsS --max-time 3 "$DEVTOOLS/json/close/$old_id" >/dev/null
}

# Fallback when DevTools is unreachable: start-kiosk.sh opens the path left in
# next-path on its next start. The default path needs no file.
kiosk_restart_to() {
  if [ "$1" = "/" ]; then
    rm -f "$NEXT_PATH_FILE"
  else
    mkdir -p "$(dirname "$NEXT_PATH_FILE")"
    printf '%s\n' "$1" >"$NEXT_PATH_FILE"
  fi
  systemctl --user restart "$KIOSK_SERVICE"
}

echo "The booth will show the maintenance screen while the board updates."
SWITCHED_IN_PLACE=""
if kiosk_show "$KIOSK_URL/maintenance"; then
  SWITCHED_IN_PLACE=1
  echo "✓ Kiosk switched to maintenance in its own window"
elif kiosk_restart_to "/maintenance"; then
  echo "✓ Kiosk restarted on the maintenance screen"
else
  fail "Could not reach the kiosk through DevTools or restart $KIOSK_SERVICE. Nothing was flashed."
fi
# Time for the page to load and send its maintenance heartbeat.
sleep 8
echo "✓ Kiosk on $KIOSK_URL/maintenance"

if [ -z "$ARDUINO_FQBN" ]; then
  # More than one supported board is refused rather than guessed at.
  BOARDS="$(arduino-cli board list --format json | boards_matching "${SUPPORTED_FQBNS[@]}")"
  if [ -z "$BOARDS" ]; then
    kiosk_restart_to "/" >/dev/null 2>&1 || true
    fail "No Arduino Uno or Mega found. Check the USB cable (ls -l /dev/ttyACM*), or set ARDUINO_FQBN and SERIAL_PORT in $BOOTH_CONFIG for a clone board. The kiosk was sent back."
  fi
  if [ "$(printf '%s\n' "$BOARDS" | wc -l | tr -d ' ')" != "1" ]; then
    kiosk_restart_to "/" >/dev/null 2>&1 || true
    fail "More than one Arduino is connected:"$'\n'"$BOARDS"$'\n'"Unplug all but the booth's board, or set ARDUINO_FQBN and SERIAL_PORT in $BOOTH_CONFIG. The kiosk was sent back."
  fi
  read -r SERIAL_PORT ARDUINO_FQBN <<<"$BOARDS"
elif [ -z "$SERIAL_PORT" ]; then
  SERIAL_PORT="$(arduino-cli board list --format json | boards_matching "$ARDUINO_FQBN" | head -n 1 | cut -d ' ' -f 1)"
fi
if [ -z "$SERIAL_PORT" ]; then
  kiosk_restart_to "/" >/dev/null 2>&1 || true
  fail "No board matching $ARDUINO_FQBN found. Check the USB cable (ls -l /dev/ttyACM*), or set SERIAL_PORT in $BOOTH_CONFIG for a clone board. The kiosk was sent back."
fi
echo "✓ $ARDUINO_FQBN on $SERIAL_PORT"

echo "Uploading…"
arduino-cli upload --fqbn "$ARDUINO_FQBN" -p "$SERIAL_PORT" --input-dir "$(build_path "$ARDUINO_FQBN")" "$BUILD_DIR" \
  || fail "Upload failed. The board may now hold incomplete firmware, so the booth stays on the maintenance screen: check the USB cable and run this again until it succeeds."

echo
echo "✓ Firmware updated."
# The board calibrates right after the upload; keep the hands-off screen up while it does.
sleep 5

if [ -n "$SWITCHED_IN_PLACE" ] && kiosk_show "$KIOSK_URL"; then
  echo "✓ Kiosk back on $KIOSK_URL"
elif kiosk_restart_to "/"; then
  echo "✓ Kiosk restarted on $KIOSK_URL"
else
  fail "The firmware is updated but the kiosk could not be restarted: run 'systemctl --user restart $KIOSK_SERVICE' or power-cycle the booth."
fi
rm -f "$NEXT_PATH_FILE"
echo "Done."
