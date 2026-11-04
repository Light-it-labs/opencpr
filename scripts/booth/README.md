<!-- cspell:ignore ProDesk Ryzen FQBN EEPROM pyserial usbmodem ttyACM ttyUSB manikin espeak -->

# Booth computer

Part of: [Getting started](../../docs/getting-started.md) › Set up the booth computer

The booth computer drives the touchscreen, talks to the Arduino over USB serial from Google Chrome (Web Serial) and shows the kiosk app fullscreen. The scripts in this folder set a computer up once, start the kiosk at every boot, keep the serial port reachable without anyone at a keyboard, and flash the sensor firmware while the kiosk shows its maintenance screen.

| Platform | Folder | When |
| --- | --- | --- |
| Ubuntu 24.04 LTS Desktop (recommended) | [`ubuntu/`](ubuntu) | A small x86-64 mini PC dedicated to the booth. Chrome runs under a systemd user service; one installer does the whole setup |
| macOS | [`macos/`](macos) | A Mac laptop or Mac mini you already have. Double-clickable `.command` scripts; the system settings are done by hand |

Windows is not supported.

## The configuration file

Both platforms read `~/.config/opencpr/booth.env`, created from [`booth.env.example`](booth.env.example). Without it, or with an empty `KIOSK_URL`, every script prints what to do and exits before touching anything. The one exception is the Ubuntu installer, `install-booth.sh`: it installs its packages and creates `booth.env` first, and only then stops on an empty `KIOSK_URL`.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `KIOSK_URL` | yes | — | The kiosk's address, origin only (e.g. `https://kiosk.example.org`) |
| `ARDUINO_FQBN` | no | auto-detect Uno or Mega | Board the firmware is compiled and flashed for: `arduino:avr:uno` or `arduino:avr:mega`. Unset, the updater compiles for both and flashes whichever one `arduino-cli board list` finds, refusing none or more than one. Set it for a clone board, or to pin the board |
| `KIOSK_PROFILE` | no | `$HOME/.opencpr-kiosk-profile` | Chrome profile the kiosk runs in. Web Serial grants are stored per profile, so the board is authorized from inside this one |
| `CHROME` | no | `google-chrome` on Ubuntu, `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` on macOS | Chrome binary. Web Serial exists in Chrome and Edge only |
| `SERIAL_PORT` | no | auto-detected | Serial port of the board, e.g. `/dev/ttyACM0`, when auto-detection cannot identify it (clone boards). Needs `ARDUINO_FQBN` set too |

## Choosing the computer

**Minimum requirements** for the Ubuntu mini PC:

- x86-64 CPU: Intel 8th-gen Core, AMD Ryzen 3000, Intel N100 class, or newer
- 8 GB RAM
- 64 GB SSD; 128 GB recommended
- Two free USB-A ports: one for the Arduino, one for the touchscreen's touch cable
- HDMI or DisplayPort output. Units with DisplayPort only need a DP-to-HDMI cable
- Ethernet preferred; Wi-Fi optional
- Audio out for the metronome, over HDMI or the 3.5 mm jack
- A BIOS option to power on after power loss, so the booth comes back on its own after an outage

Example: a refurbished HP ProDesk 400 G5 Desktop Mini with a Core i5-9500T, 8 GB DDR4 and a 256 GB SSD. Refurbished units ship with Windows, which the Ubuntu guide replaces. The display is a 24" touchscreen.

A Mac needs nothing special beyond Google Chrome and a free USB port for the Arduino; see [`macos/README.md`](macos/README.md) for the display arrangement a laptop needs inside the booth.

The booth computer is one of these two: an x86-64 mini PC with Ubuntu, or a Mac. No other platform is scripted or documented.

## What both platforms share

- The kiosk runs in its own Chrome profile, fullscreen, with pinch zoom and swipe-to-go-back off, and comes back on its own after a power cut.
- A Chrome policy (`SerialAllowUsbDevicesForUrls`) lets `KIOSK_URL` open any Arduino USB serial device (vendor id 9025) without a prompt, so a board plugged back in reconnects with nobody at the booth.
- The firmware updater fast-forwards the clone to `origin/main`, compiles `hardware/arduino.ino` before touching the booth (for both the Uno and the Mega unless `ARDUINO_FQBN` names one), parks the kiosk on `/maintenance` (which releases the serial port and holds the booth's health alerts), finds the board, uploads, and brings the kiosk back. The board's device ID lives in EEPROM and survives the upload.
- The kiosk self-updates its web build: deploys need nobody at the booth.
- After setup, flash the board once with the platform's updater, so it runs the firmware from the same `main` as the kiosk. After that, run the updater again only when the firmware changes.

## Checking the sensor

[`sensor-check.py`](sensor-check.py) is a guided test of the sensor, its cable and its [depth scale](../../hardware/README.md#depth-scale), for a new installation or when the booth reports sensor faults. Close the kiosk or park it on its maintenance screen first, so it does not hold the serial port, then run from the repository root:

```sh
uv run --with pyserial python scripts/booth/sensor-check.py [PORT]
```

(or install pyserial and run `python3 scripts/booth/sensor-check.py [PORT]`: on Ubuntu 24.04, `sudo apt install python3-serial`, since `pip install` into the system Python is refused there). The port is picked on its own when exactly one `/dev/cu.usbmodem*`, `/dev/ttyACM*` or `/dev/ttyUSB*` exists. Opening it restarts the board, which recalibrates, so keep your hands off the chest until the first cue. Spoken cues (`say` on macOS, `spd-say` or `espeak` on Linux, large printed text otherwise) lead through four phases:

1. One minute at rest.
2. One minute of interference: loud music, the sensor cable wiggled, hands on the manikin and the case.
3. 30 s of compressions to a 110/min metronome.
4. 20 s with hands completely off the chest.

After each phase it prints the heartbeats, `sensorOk=false` readings, error frames, garbled lines, unexpected restarts, heartbeat gaps over 1 s and the resting depth spread; for compressions, the count against the beats played, the start and end depths and how many reached the 50 to 60 mm band; for the hands-off phase, the first against the last 4 s, which shows a chest that sags or springs back slowly. The verdict says whether the link held, how noisy the reading is at rest, and suggests a depth scale from the median compression depth. That suggestion only holds if the compressions were done with good technique at full guideline depth. `--quiet` prints the cues instead of speaking them, and `--fast` runs tenth-length phases to try the script out.

Next: [Run a booth](../../docs/booth-operations.md), from the first visitor on.
