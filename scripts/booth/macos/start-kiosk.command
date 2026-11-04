#!/bin/bash
#
# OpenCPR kiosk launcher — macOS
#
# Double-click this file to start the kiosk fullscreen on the booth's
# touchscreen. Staff only ever need one recovery instruction: plug in a
# keyboard, press Cmd+Q, double-click this again.
#
# Reads ~/.config/opencpr/booth.env (KIOSK_URL, and optionally KIOSK_PROFILE
# and CHROME). The one-time Mac setup, including the display arrangement that
# keeps the menu bar off the touchscreen, is in the README next to this script.

set -uo pipefail

BOOTH_CONFIG="$HOME/.config/opencpr/booth.env"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Declared up front because `set -u` is on and the array is expanded
# unconditionally below, whether or not a display was resolved.
WINDOW_FLAGS=()

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

[ -f "$BOOTH_CONFIG" ] || config_missing "No booth configuration found at $BOOTH_CONFIG."
# shellcheck source-path=SCRIPTDIR
# shellcheck source=../booth.env.example
. "$BOOTH_CONFIG"
[ -n "${KIOSK_URL:-}" ] || config_missing "KIOSK_URL is empty in $BOOTH_CONFIG."
KIOSK_URL="${KIOSK_URL%/}"

# Web Serial permissions are stored PER PROFILE: the Arduino has to be
# authorized from inside this profile, not from anyone's everyday Chrome.
KIOSK_PROFILE="${KIOSK_PROFILE:-$HOME/.opencpr-kiosk-profile}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

if [ ! -x "$CHROME" ]; then
  echo "Google Chrome not found at: $CHROME"
  echo "Chrome is required: Web Serial does not exist in Safari or Firefox."
  read -r -p "Press return to close."
  exit 1
fi

# Chrome opens on whichever display the window position falls inside, and with
# --kiosk it then goes fullscreen there. Coordinates are global, with the main
# display's top-left at 0,0, so the touchscreen's origin depends entirely on the
# arrangement, which changes whenever a panel or its resolution does. Resolve
# it at launch instead of hardcoding.
#
# The display to pick is the one WITHOUT a menu bar, which is the one that is not
# main; see the README. NSScreen puts that display at index 0, so anything else
# will do. Cocoa measures from the bottom-left with y going up while Chrome wants
# top-left with y going down, hence the flip.
#
# osascript ships with macOS. Deliberately not python3: on a Mac without the
# Xcode command line tools that is a stub which opens an installer dialog.
target_display() {
  osascript -l JavaScript -e '
    ObjC.import("AppKit");

    var screens = $.NSScreen.screens;
    var menuBarScreen = screens.objectAtIndex(0);
    var flipHeight = menuBarScreen.frame.size.height;

    // Only one display: a dev machine, or the lid is shut. Use it rather than
    // refusing to start -- a kiosk on the wrong screen still beats a Terminal
    // window on the right one.
    var target = screens.count > 1 ? screens.objectAtIndex(1) : menuBarScreen;

    var frame = target.frame;
    var top = flipHeight - (frame.origin.y + frame.size.height);

    Math.round(frame.origin.x) + "," + Math.round(top) + " " +
      Math.round(frame.size.width) + "," + Math.round(frame.size.height);
  '
}

read -r WINDOW_POSITION WINDOW_SIZE <<<"$(target_display)"

if [ -z "${WINDOW_POSITION:-}" ]; then
  echo "Could not read the display arrangement; letting Chrome choose."
else
  echo "Kiosk display: position ${WINDOW_POSITION}, size ${WINDOW_SIZE}"
  WINDOW_FLAGS=(--window-position="$WINDOW_POSITION" --window-size="$WINDOW_SIZE")
fi

# Chrome no longer has a switch to suppress the "Restore pages?" bubble that
# follows a power cut. Recording a clean exit in the profile before launch is
# what keeps it off the touchscreen.
PREFERENCES="$KIOSK_PROFILE/Default/Preferences"
if [ -f "$PREFERENCES" ]; then
  sed -i '' 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"Crashed"/"exit_type":"Normal"/' "$PREFERENCES"
fi

# Hold the machine awake for as long as the kiosk runs, and stop when it exits.
caffeinate -dimsu &
CAFFEINATE_PID=$!
trap 'kill "$CAFFEINATE_PID" 2>/dev/null' EXIT

exec "$CHROME" \
  --kiosk \
  "${WINDOW_FLAGS[@]}" \
  --user-data-dir="$KIOSK_PROFILE" \
  --no-first-run \
  --noerrdialogs \
  --disable-infobars \
  --disable-pinch \
  --disable-features=OverscrollHistoryNavigation \
  --autoplay-policy=no-user-gesture-required \
  "$KIOSK_URL"

# Flags worth knowing about:
#
#   --disable-features=OverscrollHistoryNavigation
#       Without this a horizontal swipe navigates BACK. On a touchscreen someone
#       does that by accident within the first hour and lands mid-session on a
#       blank previous page.
#
#   --disable-pinch
#       Stops a two-finger pinch zooming the layout out of position.
#
#   --autoplay-policy=no-user-gesture-required
#       Lets the metronome play without a tap first.
