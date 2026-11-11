<!-- cspell:ignore xattr caffeinate dimsu osascript FQBN EEPROM usbmodem -->

# Booth computer: macOS

A Mac laptop or Mac mini as the booth computer. Three double-clickable scripts run it; the system settings that keep macOS out of the way are done by hand, once. Hardware notes and the platform overview are in the [booth README](../README.md).

| Script | What it does |
| --- | --- |
| `start-kiosk.command` | Opens the kiosk fullscreen in its own Chrome profile on the touchscreen and keeps the Mac awake (`caffeinate`) while it runs |
| `update-firmware.command` | Flashes `hardware/arduino.ino` onto the board, showing the kiosk's maintenance screen meanwhile |
| `install-chrome-serial-policy.command` | Lets the kiosk open the Arduino's serial port without Chrome asking (`--remove` undoes it) |

All three read `~/.config/opencpr/booth.env`, created from the shared [`../booth.env.example`](../booth.env.example). Without it, or with an empty `KIOSK_URL`, they print what to do and exit. The variables are listed in the [booth README](../README.md#the-configuration-file); on macOS `CHROME` defaults to `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

## One-time setup

1. Install [Google Chrome](https://www.google.com/chrome/). Web Serial does not exist in Safari or Firefox.
2. Clone the repository with `git`, not as a download: a downloaded `.command` carries a quarantine flag and macOS refuses to run it (`xattr -d com.apple.quarantine <file>` clears it).

   ```sh
   git clone https://github.com/Light-it-labs/opencpr.git ~/opencpr
   cd ~/opencpr/scripts/booth
   mkdir -p ~/.config/opencpr
   cp booth.env.example ~/.config/opencpr/booth.env
   # edit ~/.config/opencpr/booth.env: set KIOSK_URL
   chmod +x macos/*.command
   ```

3. Double-click `macos/install-chrome-serial-policy.command`. It writes the `SerialAllowUsbDevicesForUrls` policy for `KIOSK_URL` into Chrome's preferences, so a board plugged back in after a reboot reconnects with nobody at the booth. Chrome reads it at launch.
4. First run of `start-kiosk.command` **with a keyboard attached**: complete `/setup`: type a pairing code created under Kiosks in the admin portal, pick Arduino mode, and grant the serial port if Chrome asks. The permission is stored in the kiosk's Chrome profile, so granting it in your everyday Chrome does not count.
5. Flash the board once: double-click `update-firmware.command`, so the board runs the firmware from this clone. On this first run macOS asks once to let Terminal control Chrome; allow it, or the updater cannot switch the kiosk to the maintenance screen.
6. System Settings:
   - Users & Groups → Login Options → automatic login for this user
   - General → Login Items → add `start-kiosk.command`
   - Displays → Advanced → prevent sleeping on power adapter
   - Desktop & Dock → auto-hide the Dock, set all Hot Corners to "-"
   - Desktop & Dock → turn off "Displays have separate Spaces" (or `defaults write com.apple.spaces spans-displays -bool true`), then log out
7. On a laptop, run with the **lid open**, laptop inside the booth.

   Counter-intuitive, but it is what takes the menu bar off the touchscreen. Dragging a finger to the top edge reveals the menu bar, and nothing suppresses that on a display which has one. With separate Spaces off, only the main display carries a menu bar: in Displays → Arrange, drag the white strip onto the built-in screen. The menu bar ends up on the laptop's own display, hidden inside the booth, and the launcher puts the kiosk on the other one.

   A closed lid deactivates the built-in display, which makes the touchscreen main again and hands its menu bar straight back. Expect the laptop screen to go gray while Chrome is fullscreen: normal for spanning mode, and it is hidden anyway. Also mask the top few pixels of the panel with the bezel or tape: that is the one layer no software can undo.

8. Remove the keyboard and confirm the booth shows up in the admin portal.

## Day to day

- Recovery: plug in a keyboard, press Cmd+Q, double-click `start-kiosk.command` again. Or power-cycle the Mac: auto-login and the Login Item bring the kiosk back.
- The kiosk polls its web build and reloads itself from the attract screen when a new one lands, so deploys need nobody at the booth.

## Updating the firmware

Double-click `update-firmware.command` whenever the firmware changes. It fast-forwards the clone to `origin/main` when the clone is clean and on `main` (and re-runs itself after pulling new commits), installs `arduino-cli` into `~/bin` on first use together with the AVR core and the pinned libraries, compiles `hardware/arduino.ino` for `ARDUINO_FQBN`, or for both the Uno and the Mega when it is not set, and only then touches the booth: it points the kiosk window at `/maintenance` (which releases the serial port), or restarts Chrome on it when the window cannot be reached. It finds the board (without `ARDUINO_FQBN`, whichever Uno or Mega `arduino-cli board list` shows, refusing none or more than one), uploads, waits for the board to calibrate, and sends the kiosk back to `KIOSK_URL`, restarting it through `start-kiosk.command` if needed. The device ID lives in EEPROM and survives the upload.

## Troubleshooting

- **Chrome asks for the serial port on every start, or finds none.** `chrome://policy` on a keyboard must list `SerialAllowUsbDevicesForUrls` with the exact `KIOSK_URL`; if it does not, run `install-chrome-serial-policy.command` again and restart the kiosk. If Chrome lists the policy but still asks, install it through a configuration profile instead. A clone board with a non-Arduino USB chip (vendor id other than 9025) is not covered: grant it once by hand from `/setup`.
- **Board not found by the updater.** `ls /dev/cu.usbmodem*` shows nothing: try another cable or port. It shows a port but `arduino-cli board list` does not identify it: a clone board; set `ARDUINO_FQBN` and `SERIAL_PORT` in `booth.env`. **More than one Arduino is connected:** unplug all but the booth's board.
- **The updater cannot switch the kiosk.** Allow Terminal to control Chrome in System Settings → Privacy & Security → Automation. Until then the updater restarts Chrome instead, which also works.
- **Kiosk on the wrong display.** The launcher picks the display without a menu bar; check "Displays have separate Spaces" is off and the menu bar sits on the built-in screen in Displays → Arrange.
- **Screen sleeps.** Displays → Advanced → prevent sleeping on power adapter; the launcher also runs `caffeinate` while Chrome is up.
- **Downloaded script will not run.** `xattr -d com.apple.quarantine <file>`, or clone with `git`.
