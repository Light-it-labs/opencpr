<!-- cspell:ignore VL53L4CD STM32duino EEPROM FQBN numpy trimesh tolist Bambu PETG manikin -->

# OpenCPR hardware

Firmware for the OpenCPR training booth's compression sensor and the 3D-printed enclosure for the board. The script that flashes it from the booth computer lives in [`scripts/booth/`](../scripts/booth).

## Board

The reference build is an Arduino Uno R3 with a screw-terminal shield, which is what the printed case fits. The sketch also runs unchanged on an Arduino Mega 2560; only the I²C pins (20 and 21 instead of A4 and A5) and the board name you flash with differ. Parts, wiring, mounting and calibration are in [`docs/hardware.md`](../docs/hardware.md).

## Firmware (`arduino.ino`)

The sketch reads a VL53L4CD time-of-flight sensor over I²C (about 30 Hz) and reports chest-compression depth in millimeters.

It only measures. It does not decide whether a compression was deep enough or fully released, and it does not compute a rate: those judgments live in the app's scoring module, so the board and the app cannot disagree and past sessions can be re-scored.

### Serial protocol

One JSON object per line at **115200 baud**.

Device to host:

| `type` | Fields | When |
| --- | --- | --- |
| `ready` | `baselineMm`, `baselineOk`, `deviceId`, `scale` | After boot calibration, after an accepted recalibration, and after an accepted `S` command |
| `heartbeat` | `sensorOk`, `depthMm` (only when the read was valid) | Every 500 ms |
| `compression` | `timestampMs`, `startDepthMm`, `endDepthMm` | Once per stroke: the recoil depth before it and the deepest point of it |
| `error` | `code` (`sensor`, `calibration` or `scale`), `message` | `sensor`: ranging is broken and depths can't be trusted. `calibration`: a recalibration was refused; the previous baseline stays in force. `scale`: an `S` value was out of range; the stored scale is unchanged. The kiosk never sends `S` and ignores this code |

Host to device:

- `R`: reset stroke tracking (between participants).
- `C`: recalibrate the resting baseline. Refused when the chest is not at rest.
- `S<scale>` then a newline, for example `S1.0`: store this manikin's [depth scale](#depth-scale) (0.5 to 2.0). Answered with a `ready` frame showing the new `scale`; an out-of-range value is refused with a `scale` error. The kiosk never sends it.

### Depth scale

The board reports chest depth as sensor travel divided by a scale. The scale belongs to the manikin and to how the sensor is mounted in it, not to the board:

| Mount | Scale |
| --- | --- |
| Sensor on the underside of a hinged chest plate, further from the hinge than the sternum (the reference mount) | About 1.3, the default: the plate there travels further than the chest. Measured against a 50 mm depth clicker as `sensorTravelAtClickMm` / `clickerDepthMm` in the sketch |
| Sensor fixed inside the chest at the compression point, moving with it | 1.0 |
| Unsure | Do a run with good technique at full guideline depth and pick the value that puts the compressions in the 50 to 60 mm band |

How to measure it against a clicker is in [Calibrating for your manikin](../docs/hardware.md#calibrating-for-your-manikin). The guided [sensor check](../scripts/booth/README.md#checking-the-sensor) also suggests a scale from a run of compressions.

To set it, close the kiosk or park it on its maintenance screen so it does not hold the serial port, open the Arduino IDE serial monitor (or `arduino-cli monitor`) at 115200 baud with "Newline" line endings, and send `S` followed by the value, for example `S1.0`. The board answers with a `ready` frame carrying the new `scale` and uses it at once.

The scale lives in EEPROM after the device ID (marker at address 18, float at address 20), so it survives power loss and sketch uploads. A board with nothing stored, or with a stored value outside 0.5 to 2.0, uses the 1.3 default. Every `ready` frame reports the scale in force.

### Device ID

On first boot the board generates a random UUID and stores it in EEPROM (marker at address 0, 16 bytes from address 2). EEPROM survives power loss and sketch uploads, so the ID is permanent. It is sent as `deviceId` in the `ready` frame and the kiosk uses it as the kiosk ID.

### Libraries

- ArduinoJson 7.4.3 (the sketch does not compile with ArduinoJson 6)
- STM32duino VL53L4CD 1.0.5

`scripts/booth/ubuntu/update-firmware.sh` (or `scripts/booth/macos/update-firmware.command` on a Mac) installs both.

## Flashing (`scripts/booth/ubuntu/update-firmware.sh`)

Run on the booth computer, kept with the other booth scripts in [`scripts/booth/ubuntu/`](../scripts/booth/ubuntu) at the repository root; a Mac booth runs [`scripts/booth/macos/update-firmware.command`](../scripts/booth/macos/update-firmware.command), which does the same. It reads the booth configuration (see [`scripts/booth/README.md`](../scripts/booth/README.md) for the setup) and flashes `hardware/arduino.ino` onto the booth's board: an Uno R3 or a Mega 2560, detected on its own, or the one named by `ARDUINO_FQBN` in that configuration (`arduino:avr:uno` or `arduino:avr:mega`). It installs the Arduino AVR core and the pinned libraries when missing (on Ubuntu, `arduino-cli` itself comes from `install-booth.sh` and the updater stops without it; on a Mac, the updater offers to install it), compiles before touching the kiosk, parks the kiosk on `/maintenance` (which releases the serial port and holds the booth's health alerts), uploads, and brings the kiosk back.

The device ID survives the upload. To flash from any other machine, see [`docs/hardware.md`](../docs/hardware.md#flashing).

## Case (`hardware-case/`)

Enclosure for an Arduino Uno R3 with a Screw Shield V2: a base tray with keyhole mounting ears and a friction-fit lid.

- `uno_case.py`: parametric source. Measurements to check against the real board stack are at the top.
- `base.stl`, `lid.stl`: its output, already in print orientation.
- `case-viewer.html`: 3D view, drawings and assembly notes.
- `base.mesh.json`, `lid.mesh.json`: meshes loaded by the viewer.

Regenerate the STLs from `hardware-case/`:

```sh
uv run --with manifold3d --with numpy --with trimesh python uno_case.py
```

`uno_case.py` does not write the `.mesh.json` files. After changing the case, regenerate them from the STLs (from `hardware-case/`):

```sh
uv run --with numpy --with trimesh python -c "import json,trimesh;[open(f'{n}.mesh.json','w').write(json.dumps({'v':[round(x,2) for x in m.vertices.flatten().tolist()],'f':m.faces.flatten().tolist()},separators=(',',':'))) for n in ('base','lid') for m in [trimesh.load(f'{n}.stl')]]"
```

The viewer fetches the mesh files, so serve it over HTTP instead of opening it as a file:

```sh
cd hardware-case && python3 -m http.server
# then open http://localhost:8000/case-viewer.html
```

### Printing

Bambu Lab A1, PETG or PLA, 0.2 mm layers, 3 walls, 15–20% infill, no supports. Base open side up, lid flat face down.

### Hardware

- 4 × M3 × 6 screws to hold the Uno on its posts
- 4 × M3 × 6–8 flat-head screws for the lid (optional; it holds by friction)
- 2 × M4 or #8 screws for the keyhole ears (optional)
- 1 small zip tie (up to 3 mm wide) for the sensor cable strain relief
