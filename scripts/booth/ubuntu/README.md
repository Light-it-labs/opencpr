<!-- cspell:ignore dialout udev udevadm gsettings journalctl loginctl systemctl ModemManager XWayland DevTools unclutter noerrdialogs infobars autoplay FQBN sudoer EEPROM -->

# Booth computer: Ubuntu 24.04

The recommended booth: a small Linux mini PC running Ubuntu 24.04 LTS Desktop, a touchscreen, the Arduino with the compression sensor, and Google Chrome in kiosk mode under a systemd user service. Hardware requirements and the platform overview are in the [booth README](../README.md); this page is the Ubuntu setup.

| File | What it is |
| --- | --- |
| `install-booth.sh` | One-time, idempotent setup of a fresh Ubuntu install: packages, Chrome, arduino-cli, groups, udev rule, Chrome policy, auto-login, GNOME settings and the kiosk service |
| `start-kiosk.sh` | What the service runs: waits for the network, then starts Chrome fullscreen on the kiosk's address |
| `update-firmware.sh` | Flashes `hardware/arduino.ino` onto the board while the kiosk shows its maintenance screen |
| `opencpr-kiosk.service` | systemd user unit template installed to `~/.config/systemd/user/` |
| `99-opencpr-arduino.rules` | udev rule for the Arduino, installed to `/etc/udev/rules.d/` |
| `chrome-policy.template.json` | Chrome policy template installed to `/etc/opt/chrome/policies/managed/opencpr.json` |

All three scripts read `~/.config/opencpr/booth.env`, created from the shared [`../booth.env.example`](../booth.env.example). Without it, or with an empty `KIOSK_URL`, `start-kiosk.sh` and `update-firmware.sh` print what to do and exit. `install-booth.sh` is the exception: it installs its packages and creates `booth.env` first, and only then stops on an empty `KIOSK_URL`. The variables are listed in the [booth README](../README.md#the-configuration-file); on Ubuntu `CHROME` defaults to `google-chrome`.

## Install Ubuntu

1. Install **Ubuntu 24.04 LTS Desktop** from a USB stick, with the touchscreen connected as the display.
2. Pick the **minimal** installation and **erase the disk**.
3. Name the first user `kiosk`. It is the account the kiosk runs under and the sudoer the installer runs as. Leave auto-login off here: the installer configures it.
4. In the BIOS, turn on power-on after power loss.

## One-time setup

```sh
sudo apt-get install -y git
git clone https://github.com/Light-it-labs/opencpr.git ~/opencpr
cd ~/opencpr/scripts/booth/ubuntu
./install-booth.sh                 # creates ~/.config/opencpr/booth.env and stops
nano ~/.config/opencpr/booth.env   # set KIOSK_URL
./install-booth.sh                 # finishes the setup
sudo reboot
```

The installer prints every path it writes and ends with a checklist. After the reboot, the computer logs in as `kiosk` and the kiosk opens on its own.

First run **with a keyboard attached**: complete `/setup`: type a pairing code created under Kiosks in the admin portal, pick Arduino mode, and grant the serial port once if Chrome asks. The permission is stored in the kiosk's Chrome profile; with the policy in place Chrome grants Arduino boards without asking. Then flash the board once, as in [Updating the firmware](#updating-the-firmware), so it runs the firmware from this clone. Confirm the booth shows up in the admin portal, then remove the keyboard.

Optional, for maintainers who update the booth over ssh: Ubuntu Desktop does not include an ssh server, so install one.

```sh
sudo apt install openssh-server
```

## What runs on the booth

- **Service.** `opencpr-kiosk.service` is a systemd user unit tied to `graphical-session.target`, so it starts once the GNOME session exists after auto-login and restarts Chrome three seconds after it exits for any reason. `start-kiosk.sh` waits for NetworkManager and for `KIOSK_URL` to answer before starting Chrome, so a slow network at boot does not leave an error page on the screen.
- **Chrome flags**, in plain words: kiosk mode (fullscreen, no browser UI) in its own profile; no first-run or error dialogs; no "Restore pages?" bubble after a power cut (the launcher marks the previous exit as clean, since Chrome removed the flag for this); no pinch zoom and no swipe-to-go-back on the touchscreen; the metronome may play without a tap first; a plain-text password store so auto-login never shows a keyring unlock prompt; the DevTools HTTP interface on `127.0.0.1:9222`, which the firmware updater uses to switch pages without restarting Chrome.
- **Policy.** `/etc/opt/chrome/policies/managed/opencpr.json` lets `KIOSK_URL` open any Arduino USB serial device (vendor id 9025, so an Uno and a Mega both match) without a prompt, and turns off notifications, the password manager, translation, sign-in, the default-browser prompt and metrics.
- **udev.** `/etc/udev/rules.d/99-opencpr-arduino.rules` makes Arduino ports writable by the `dialout` group and keeps ModemManager from probing them. The `kiosk` user is in `dialout`, `audio` and `video`.
- **Desktop.** GDM logs `kiosk` in automatically; GNOME never blanks or locks the screen or suspends, shows no notification banners, skips the welcome tour and hides the dock.

## Day to day

- The kiosk polls its web build and reloads itself from the attract screen when a new one lands, so deploys need nobody at the booth.
- Recovery: over ssh, or on a keyboard with Ctrl+Alt+F3 (log in as `kiosk`; Ctrl+Alt+F1 returns to the screen), run `systemctl --user restart opencpr-kiosk`. Or power-cycle the booth: the kiosk comes back on its own.
- Logs: `journalctl --user -u opencpr-kiosk -f`.

## Updating the firmware

From ssh or a TTY, as `kiosk`:

```sh
~/opencpr/scripts/booth/ubuntu/update-firmware.sh
```

It fast-forwards the clone to `origin/main` when the clone is clean and on `main` (and re-runs itself after pulling new commits), installs the Arduino AVR core and the pinned libraries, compiles `hardware/arduino.ino` for `ARDUINO_FQBN`, or for both the Uno and the Mega when it is not set, and only then touches the booth: it switches the kiosk to `/maintenance` through DevTools (new tab, old tab closed, which releases the serial port), falling back to writing `/maintenance` into `~/.config/opencpr/next-path` and restarting the service. It finds the board (without `ARDUINO_FQBN`, whichever Uno or Mega `arduino-cli board list` shows, refusing none or more than one), uploads, waits for the board to calibrate, and sends the kiosk back the same way. The device ID lives in EEPROM and survives the upload.

## Troubleshooting

- **Chrome asks for the serial port, or finds none.** Check the three layers: the policy (`chrome://policy` on a keyboard must list `SerialAllowUsbDevicesForUrls` with the exact `KIOSK_URL`), the udev rule (`ls -l /dev/ttyACM*` must show group `dialout` and mode `crw-rw----`), and the group (`groups` must include `dialout`; it takes a re-login). A clone board with a non-Arduino USB chip (vendor id other than 9025) is not covered by the policy or the rule: grant it once by hand from `/setup`.
- **Board not found by the updater.** `ls -l /dev/ttyACM*` shows nothing: try another cable or port. It shows a port but `arduino-cli board list` does not identify it: a clone board; set `ARDUINO_FQBN` and `SERIAL_PORT` in `booth.env`. **More than one Arduino is connected:** unplug all but the booth's board. ModemManager holding the port right after plugging in: wait ten seconds, or check `sudo udevadm info /dev/ttyACM0 | grep ID_MM`.
- **No sound.** Pick the output in GNOME Settings → Sound (HDMI or the 3.5 mm jack) with a keyboard; it is remembered. Autoplay is allowed by a Chrome flag, so no tap is needed.
- **Screen blanks or locks.** Re-run `install-booth.sh`: it reapplies the GNOME settings. A monitor with its own power saving needs that turned off in its menu.
- **Service not starting.** `journalctl --user -u opencpr-kiosk` shows why. `systemctl --user status opencpr-kiosk` says `inactive` right after a reboot until the graphical session is up; if `loginctl show-user kiosk -p Linger` is not `yes`, run `sudo loginctl enable-linger kiosk`.
- **Cursor visible.** `unclutter` only works on X11 sessions; on the default Wayland session GNOME hides the cursor on touch and shows it again when a mouse moves.
