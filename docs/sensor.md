<!-- cspell:ignore VL53L4CD VL53L0X VCSEL SPAD manikin manikins STEMMA Qwiic STM32duino Adafruit -->

# The compression sensor

Part of: [Getting started](getting-started.md) › [Build the sensor](hardware.md)

Why OpenCPR measures compressions with a time-of-flight distance sensor, how that sensor works, what was tried before it, and what to check if you want to use something else. The build steps are in [Build the sensor](hardware.md); this page is the background.

## What the sensor has to do

A visitor pushes the manikin's chest down 5 to 6 cm, about twice a second, and the kiosk has to show each stroke as it happens and score its depth and recoil. That asks for:

- **Absolute depth**, not just motion: recoil is judged by how far the chest comes back, so the reading at rest has to mean "at rest" every time.
- **Millimeter resolution over a short range:** everything happens within roughly 15 cm of the sensor, inside a small, dark chest cavity.
- **At least about 15 readings per stroke cycle** so the peak and the trough of each stroke are caught: the firmware samples at about 30 Hz, about 16 readings per stroke at 110 compressions a minute.
- **No contact with the manikin's mechanism**, because many booths use a borrowed manikin that must come back unmarked and still working.
- **A simple, cheap part** on a standard bus that an Arduino reads without extra electronics.

## How time-of-flight works

The VL53L4CD sends short pulses of invisible infrared light (940 nm) from a tiny laser (a VCSEL) and times how long the light takes to bounce back to an array of light detectors (SPADs) next to it. Light travels about 30 cm per nanosecond, so the chip measures picosecond delays and turns them into a distance in millimeters. It does this many times per reading and reports the result over I²C, together with a status that says whether the reading can be trusted.

Mounted on the underside of the hinged chest plate and pointing at the manikin's base, the sensor sees the base get closer as the chest goes down. The firmware turns that change into chest depth; see [How the board measures](hardware.md#how-the-board-measures) and [Mounting the sensor](hardware.md#mounting-the-sensor).

A few properties matter in practice:

- **Matte, dark targets work best.** The inside of a manikin is ideal. Glossy or very reflective surfaces in the beam can produce odd readings, so keep the beam clear of springs, ribs and the clicker.
- **The beam is a narrow cone,** so it reads the base directly under the sensor and ignores the cavity walls.
- **Ambient light barely matters** inside a closed chest.
- **Each reading carries a range status.** The firmware drops readings the sensor flags as invalid instead of scoring them, and raises a sensor error after about a second of bad readings.

## Why the VL53L4CD

The VL53L4CD is ST's time-of-flight sensor built for short distances: it ranges from about 1 mm and is most accurate across the few centimeters a compression covers. It runs a continuous 33 ms timing budget, about 30 readings a second, on the I²C bus (a 20 ms budget reads about 50 a second but with twice the noise at rest), and common breakouts ship with a 4-pin JST SH plug, so it connects to an Arduino with one cable and no soldering. The Arduino library is maintained by ST (STM32duino VL53L4CD).

## What was tried

| Sensor | Where it was used | Outcome |
| --- | --- | --- |
| VL53L0X (ST time-of-flight, Adafruit library) | The first working prototype, together with a small LCD and an LED on the board | Replaced by the VL53L4CD. The L0X is an earlier, general-purpose ranging sensor aimed at longer distances; the firmware moved to the VL53L4CD to read the short range under the chest cleanly |
| VL53L4CD | Every version since, including all deployed booths | Current sensor |

The firmware changed as much as the sensor did. The first versions did the scoring on the board and drove a display; the current firmware only measures and reports, uses hysteresis relative to the last trough and peak, and checks its own baseline. Those changes, more than the sensor swap, are what made unattended booths reliable.

## Alternatives considered

| Option | Why it is not used |
| --- | --- |
| Ultrasonic distance sensor | The sound cone is wide and bounces off the cavity walls, and resolution at a few centimeters is too coarse to score depth |
| Potentiometer, encoder or linear slide | Needs a mechanical link to the chest plate: something to break, and something that changes or marks a manikin you may not own |
| Accelerometer or IMU | Gives depth only by integrating acceleration twice, which drifts within seconds; recoil cannot be judged without an absolute reference |
| Force or pressure sensor | Measures how hard someone pushes, not how deep the chest goes, and depends on each manikin's spring |
| Manikins with built-in feedback | Proprietary, expensive and closed: their data cannot be read by the kiosk |

## Using a different sensor

The kiosk never talks to the sensor directly: it reads the JSON lines the firmware sends over USB. Any sensor works as long as the firmware keeps the same [serial protocol](../hardware/README.md#serial-protocol): a `ready` frame with the baseline, `heartbeat` frames with the current depth, and one `compression` frame per stroke with its start and end depth in millimeters. To swap the sensor, change the reading function in `hardware/arduino.ino`, keep the depth in millimeters of chest travel, and recalibrate as in [Calibrating for your manikin](hardware.md#calibrating-for-your-manikin). Only the VL53L4CD is tested.

Next: [Host the software](hosting.md).
