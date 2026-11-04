#!/bin/bash
#
# OpenCPR booth firmware updater — macOS
#
# Double-click on the booth Mac to flash hardware/arduino.ino onto the
# Arduino. Run it from the repository clone on the booth, so every run flashes
# the latest main.
#
# Reads ~/.config/opencpr/booth.env (KIOSK_URL, and optionally ARDUINO_FQBN,
# KIOSK_PROFILE, CHROME and SERIAL_PORT), the same file start-kiosk.command
# uses, so the two never disagree about the kiosk's address.
#
# What it does:
#   0. Updates the clone to the latest main from GitHub (when it is clean).
#   1. Finds arduino-cli, offering to install it into ~/bin when missing.
#   2. Installs the Arduino AVR core and the sketch's libraries (first run
#      only), and compiles before touching the kiosk: for ARDUINO_FQBN when it
#      is set, otherwise for both the Uno and the Mega.
#   3. Switches the kiosk to its maintenance screen, which releases the serial
#      port and silences the booth's health alerts during the update.
#   4. Finds the board and uploads. Without ARDUINO_FQBN it detects whether an
#      Uno or a Mega is plugged in, and refuses none or more than one. The
#      maintenance screen asks the public to keep their hands off the manikin
#      meanwhile.
#   5. Starts the kiosk again.
#
# The board keeps its EEPROM, so its device ID (the kiosk ID) survives the
# upload.

set -uo pipefail

BOOTH_CONFIG="$HOME/.config/opencpr/booth.env"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LIBRARIES=("ArduinoJson@7.4.3" "STM32duino VL53L4CD@1.0.5")
# Boards detected when ARDUINO_FQBN is not set. A board is recognized by its
# USB ID, so a clone with a generic USB chip needs ARDUINO_FQBN and SERIAL_PORT.
SUPPORTED_FQBNS=("arduino:avr:uno" "arduino:avr:mega")
KIOSK_LAUNCHER="$SCRIPT_DIR/start-kiosk.command"

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

[ -f "$BOOTH_CONFIG" ] || config_missing "No booth configuration found at $BOOTH_CONFIG. Nothing was changed."
# shellcheck source-path=SCRIPTDIR
# shellcheck source=../booth.env.example
. "$BOOTH_CONFIG"
[ -n "${KIOSK_URL:-}" ] || config_missing "KIOSK_URL is empty in $BOOTH_CONFIG. Nothing was changed."
KIOSK_URL="${KIOSK_URL%/}"
ARDUINO_FQBN="${ARDUINO_FQBN:-}"
KIOSK_PROFILE="${KIOSK_PROFILE:-$HOME/.opencpr-kiosk-profile}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
SERIAL_PORT="${SERIAL_PORT:-}"

REPO_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null)" || REPO_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SKETCH="$REPO_DIR/hardware/arduino.ino"

fail() {
  echo
  echo "✗ $1"
  read -r -p "Press return to close."
  exit 1
}

# Reads `arduino-cli board list` and prints "<port> <fqbn>" for every supported
# board. Exact FQBN column match, so a Mega ADK (arduino:avr:megaADK) never
# counts as a Mega.
supported_boards() {
  awk -v supported="${SUPPORTED_FQBNS[*]}" '
    BEGIN { n = split(supported, list, " "); for (i = 1; i <= n; i++) ok[list[i]] = 1 }
    { for (i = 2; i <= NF; i++) if ($i in ok) { print $1, $i; break } }'
}

build_path() {
  printf '%s/%s' "$BUILD_ROOT" "${1//:/-}"
}

[ -z "$SERIAL_PORT" ] || [ -n "$ARDUINO_FQBN" ] \
  || fail "SERIAL_PORT is set in $BOOTH_CONFIG but ARDUINO_FQBN is not: set ARDUINO_FQBN to the board on that port (arduino:avr:uno or arduino:avr:mega). Nothing was changed."

ask() {
  local answer
  read -r -p "$1 [y/N] " answer || return 1
  [[ "$answer" =~ ^[Yy]$ ]]
}

# Points the running kiosk tab at a URL, keeping the same window on the
# touchscreen. Leaving the page releases the serial port just like closing
# Chrome does. The first run asks once to let Terminal control Chrome. Fails
# when the kiosk is not running or the switch is refused, and the caller then
# restarts Chrome instead.
kiosk_navigate() {
  pgrep -f -- "--user-data-dir=$KIOSK_PROFILE" >/dev/null || return 1
  osascript - "$1" >/dev/null 2>&1 <<'APPLESCRIPT'
on run argv
  tell application "Google Chrome" to set URL of active tab of front window to item 1 of argv
end run
APPLESCRIPT
}

# Closing Chrome ends the launcher, but Terminal keeps its finished window
# open. Close those, so a restart does not leave one behind each time.
close_finished_launcher_windows() {
  osascript >/dev/null 2>&1 <<'APPLESCRIPT'
tell application "Terminal"
  repeat with i from (count of windows) to 1 by -1
    set w to window i
    if name of w contains "start-kiosk" and not (busy of selected tab of w) then close w
  end repeat
end tell
APPLESCRIPT
}

# 0. Latest firmware: only a clean checkout of main that ends up exactly at
# origin/main counts as up to date. Fast-forward only, so local edits are never
# merged or overwritten; in every other case the person running this decides.
if [ -z "${OPENCPR_UPDATER_PULLED:-}" ] && git -C "$SCRIPT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Updating the firmware from GitHub…"
  BEFORE="$(git -C "$REPO_DIR" rev-parse HEAD)"
  PROBLEM=""
  # Only edits to tracked files count. Untracked files (a .DS_Store Finder
  # leaves behind) and permission changes (a chmod +x on this script) never
  # block the update; a fast-forward that would overwrite one fails below.
  LOCAL_CHANGES="$(git -C "$REPO_DIR" -c core.fileMode=false status --porcelain --untracked-files=no)"

  if [ -n "$LOCAL_CHANGES" ]; then
    PROBLEM="this Mac's copy has local changes:"$'\n'"$LOCAL_CHANGES"$'\n'"(run 'git restore .' in $REPO_DIR to drop them)"
  elif [ "$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD)" != "main" ]; then
    PROBLEM="this Mac's copy is not on main"
  elif ! git -C "$REPO_DIR" fetch origin main || ! git -C "$REPO_DIR" merge --ff-only FETCH_HEAD; then
    PROBLEM="GitHub could not be reached, or main could not be fast-forwarded"
  elif [ "$(git -C "$REPO_DIR" rev-parse HEAD)" != "$(git -C "$REPO_DIR" rev-parse FETCH_HEAD)" ]; then
    PROBLEM="this Mac's main has commits that are not on GitHub"
  fi

  if [ -z "$PROBLEM" ]; then
    echo "✓ Firmware is at $(git -C "$REPO_DIR" log -1 --format='%h %s')"
    # The update may have changed this script too: run the new copy, once.
    if [ "$(git -C "$REPO_DIR" rev-parse HEAD)" != "$BEFORE" ]; then
      export OPENCPR_UPDATER_PULLED=1
      exec "$SCRIPT_DIR/$(basename "$0")" "$@"
    fi
  else
    echo "Could not update to the latest firmware: ${PROBLEM}."
    ask "Flash the firmware already on this Mac instead?" || fail "Nothing was changed."
  fi
fi

[ -f "$SKETCH" ] || fail "arduino.ino not found at $SKETCH."

# 1. arduino-cli
export PATH="$HOME/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v arduino-cli >/dev/null 2>&1; then
  echo "arduino-cli is not installed."
  ask "Install it into ~/bin now (needs internet)?" || fail "arduino-cli is required."
  mkdir -p "$HOME/bin"
  curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh \
    | BINDIR="$HOME/bin" sh || fail "Could not install arduino-cli."
fi
echo "✓ $(arduino-cli version)"

# 2. AVR core
if ! arduino-cli core list | grep -q "^arduino:avr "; then
  echo "Installing the Arduino AVR core (first run only)…"
  arduino-cli core update-index >/dev/null || fail "Could not update the board index."
  arduino-cli core install arduino:avr || fail "Could not install arduino:avr."
fi
echo "✓ Arduino AVR core ready"

# Always ask for the pinned versions: a name-only check would keep an older
# ArduinoJson 6, which this sketch does not compile with.
for library in "${LIBRARIES[@]}"; do
  arduino-cli lib install "$library" >/dev/null || fail "Could not install ${library}."
done
echo "✓ Libraries ready"

# arduino-cli wants the sketch inside a folder with the same name.
BUILD_DIR="$(mktemp -d)/arduino"
mkdir -p "$BUILD_DIR"
cp "$SKETCH" "$BUILD_DIR/arduino.ino"
BUILD_ROOT="$(dirname "$BUILD_DIR")/builds"

if [ -n "$ARDUINO_FQBN" ]; then
  BUILD_FQBNS=("$ARDUINO_FQBN")
else
  BUILD_FQBNS=("${SUPPORTED_FQBNS[@]}")
fi

# Compile while the kiosk still runs, so a build problem never leaves the
# booth without its kiosk, whichever board turns out to be plugged in.
for fqbn in "${BUILD_FQBNS[@]}"; do
  echo "Compiling for ${fqbn}…"
  arduino-cli compile --fqbn "$fqbn" --build-path "$(build_path "$fqbn")" "$BUILD_DIR" >/dev/null \
    || fail "Compile failed for ${fqbn}. The kiosk and the board were not touched."
done
echo "✓ Firmware compiled"

# 3. Maintenance screen. The kiosk's /maintenance page never opens the serial
# port and reports the kiosk as in maintenance, so the board can be flashed
# and no offline or sensor alerts fire. Same profile, so the same kiosk ID.
echo "The booth will show the maintenance screen while the board updates."
# Checked before closing anything, so a missing Chrome never blanks the booth.
[ -x "$CHROME" ] || fail "Google Chrome not found at: $CHROME. Nothing was changed."
RESTARTED=""
if kiosk_navigate "$KIOSK_URL/maintenance"; then
  echo "✓ Kiosk switched to maintenance in its own window"
else
  # Kiosk not running, or Chrome could not be switched: restart it instead.
  RESTARTED=1
  pkill -f "$KIOSK_PROFILE" 2>/dev/null
  sleep 2
  close_finished_launcher_windows
  "$CHROME" \
    --kiosk \
    --user-data-dir="$KIOSK_PROFILE" \
    --no-first-run \
    --noerrdialogs \
    --disable-infobars \
    --disable-pinch \
    --disable-features=OverscrollHistoryNavigation \
    "$KIOSK_URL/maintenance" >/dev/null 2>&1 &
  disown
fi
# Time to load the page and send its maintenance heartbeat.
sleep 8
echo "✓ Kiosk on $KIOSK_URL/maintenance"

# 4. Find the board and upload.
if [ -z "$ARDUINO_FQBN" ]; then
  # More than one supported board is refused rather than guessed at.
  BOARDS="$(arduino-cli board list | supported_boards)"
  [ -n "$BOARDS" ] || fail "No Arduino Uno or Mega found. Check the USB cable, or set ARDUINO_FQBN and SERIAL_PORT in $BOOTH_CONFIG for a clone board, and run this again."
  [ "$(printf '%s\n' "$BOARDS" | wc -l | tr -d ' ')" = "1" ] \
    || fail "More than one Arduino is connected:"$'\n'"$BOARDS"$'\n'"Unplug all but the booth's board, or set ARDUINO_FQBN and SERIAL_PORT in $BOOTH_CONFIG, and run this again."
  read -r SERIAL_PORT ARDUINO_FQBN <<<"$BOARDS"
elif [ -z "$SERIAL_PORT" ]; then
  # Exact FQBN column match, so a Mega ADK (arduino:avr:megaADK) never counts as a Mega.
  SERIAL_PORT="$(arduino-cli board list | awk -v fqbn="$ARDUINO_FQBN" '{ for (i = 2; i <= NF; i++) if ($i == fqbn) { print $1; exit } }')"
fi
[ -n "$SERIAL_PORT" ] || fail "No board matching $ARDUINO_FQBN found. Check the USB cable, or set SERIAL_PORT in $BOOTH_CONFIG for a clone board, and run this again."
echo "✓ $ARDUINO_FQBN on $SERIAL_PORT"

# No prompt here: the maintenance screen tells the public to keep off the
# manikin, and a baseline taken with the chest open or touched is caught and
# redone by the board and the kiosk on their own.
echo "Uploading…"
arduino-cli upload --fqbn "$ARDUINO_FQBN" -p "$SERIAL_PORT" --input-dir "$(build_path "$ARDUINO_FQBN")" "$BUILD_DIR" || fail "Upload failed. The board may now hold incomplete firmware, so the booth stays on the maintenance screen: check the USB cable and run this again until it succeeds."

echo
echo "✓ Firmware updated."
# The board calibrates right after the upload; keep the hands-off screen up
# while it does.
sleep 5

# 5. Back to the kiosk. Its first normal heartbeat ends maintenance.
# The same window goes back when it can. A Chrome this script started has no
# launcher behind it (no window placement, no keep-awake), so that one is
# replaced by the launcher. Without the launcher the maintenance screen stays
# up rather than leaving the booth on a blank desktop.
if [ -z "$RESTARTED" ] && kiosk_navigate "$KIOSK_URL"; then
  echo "✓ Kiosk back on $KIOSK_URL"
elif [ -x "$KIOSK_LAUNCHER" ]; then
  pkill -f "$KIOSK_PROFILE" 2>/dev/null
  sleep 2
  close_finished_launcher_windows
  open "$KIOSK_LAUNCHER"
  echo "✓ Kiosk started again."
else
  echo "start-kiosk.command not found at $KIOSK_LAUNCHER: the booth stays on the maintenance screen until the kiosk is started by hand."
fi

echo "Done. You can close this window."
