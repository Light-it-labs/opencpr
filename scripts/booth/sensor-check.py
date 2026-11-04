"""Guided check of the compression sensor, its cable and its depth scale.

Run on the computer the board is plugged into, with the kiosk closed or on its
maintenance screen so it does not hold the serial port:

    uv run --with pyserial python scripts/booth/sensor-check.py [PORT]

or `pip install pyserial` and `python3 scripts/booth/sensor-check.py [PORT]`.
Opening the port restarts the board, which then calibrates its baseline, so
keep your hands off the chest until the first cue.

Spoken cues lead through four phases: one minute at rest, one minute of
interference (loud music, a wiggled cable, hands on the manikin and the case),
30 s of compressions to a 110/min metronome, and 20 s hands off.
"""

import argparse
import glob
import json
import math
import os
import platform
import shutil
import statistics
import struct
import subprocess
import sys
import tempfile
import threading
import time
import wave

import serial

BAUD = 115200
BPM = 110
READY_TIMEOUT_S = 15
TARGET_DEPTH_MM = 55
PORT_PATTERNS = ("/dev/cu.usbmodem*", "/dev/ttyACM*", "/dev/ttyUSB*")
MAC_BEEP = "/System/Library/Sounds/Tink.aiff"

PHASES = [
    ("rest", 60, "Phase one. Don't touch anything for one minute."),
    (
        "interference",
        60,
        (
            "Phase two. Play music loud, wiggle the sensor cable, "
            "and touch the manikin and the case. One minute."
        ),
    ),
    (
        "compressions",
        30,
        "Phase three. Stop the music. Put your hands on the chest and do compressions to the beat.",
    ),
    ("hands-off", 20, "Stop. Hands completely off the chest. Don't touch anything."),
]


def pick_port(requested):
    if requested:
        return requested
    ports = sorted(p for pattern in PORT_PATTERNS for p in glob.glob(pattern))
    if len(ports) == 1:
        return ports[0]
    found = ", ".join(ports) if ports else "none"
    sys.exit(f"Pass the board's serial port as an argument (ports found: {found}).")


def speech_command():
    for name in ("say", "spd-say", "espeak"):
        if shutil.which(name):
            return [name, "-w"] if name == "spd-say" else [name]
    return None


def make_beep_wav():
    path = os.path.join(tempfile.mkdtemp(), "beep.wav")
    rate = 22050
    with wave.open(path, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        samples = int(rate * 0.04)
        out.writeframes(
            b"".join(
                struct.pack("<h", int(12000 * math.sin(2 * math.pi * 1500 * i / rate)))
                for i in range(samples)
            )
        )
    return path


def beep_command():
    if platform.system() == "Darwin" and os.path.exists(MAC_BEEP):
        return ["afplay", MAC_BEEP]
    for player in ("paplay", "aplay"):
        if shutil.which(player):
            args = [player, "-q"] if player == "aplay" else [player]
            return args + [make_beep_wav()]
    return None


class Cues:
    def __init__(self, quiet):
        self.speech = None if quiet else speech_command()
        self.beep = None if quiet else beep_command()

    def say(self, text, wait=False):
        if self.speech is None:
            line = "=" * min(len(text), 78)
            print(f"\n{line}\n{text.upper()}\n{line}\n", flush=True)
            return
        print(f"> {text}", flush=True)
        proc = subprocess.Popen(self.speech + [text], stderr=subprocess.DEVNULL)
        if wait:
            proc.wait()

    def tick(self):
        if self.beep is None:
            print("\a", end="", flush=True)
            return
        subprocess.Popen(self.beep, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def metronome(cues, stop):
    interval = 60 / BPM
    next_beat = time.monotonic()
    while not stop.is_set():
        cues.tick()
        next_beat += interval
        stop.wait(max(0, next_beat - time.monotonic()))


def quantile(sorted_values, q):
    return sorted_values[min(len(sorted_values) - 1, int(q * (len(sorted_values) - 1) + 0.5))]


def describe(values):
    if not values:
        return "n/a"
    s = sorted(values)
    return (
        f"min {s[0]:.1f} / p25 {quantile(s, 0.25):.1f} / median {quantile(s, 0.5):.1f}"
        f" / p75 {quantile(s, 0.75):.1f} / max {s[-1]:.1f}"
    )


def parse_line(raw):
    try:
        frame = json.loads(raw.decode("utf-8").strip())
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    return frame if isinstance(frame, dict) else None


def wait_for_ready(link):
    deadline = time.monotonic() + READY_TIMEOUT_S
    while time.monotonic() < deadline:
        frame = parse_line(link.readline() or b"")
        if frame and frame.get("type") == "ready":
            return frame
    return None


def new_tally():
    return {
        "heartbeats": 0,
        "sensor_not_ok": 0,
        "errors": [],
        "garbled": 0,
        "restarts": 0,
        "gaps": 0,
        "longest_gap": 0.0,
        "depths": [],
        "strokes": [],
    }


def record(tally, raw, now, last_heartbeat):
    """Counts one line into the tally and returns the time of the last heartbeat."""
    if not raw.strip():
        return last_heartbeat
    frame = parse_line(raw)
    if frame is None:
        tally["garbled"] += 1
        return last_heartbeat
    kind = frame.get("type")
    if kind == "heartbeat":
        tally["heartbeats"] += 1
        if last_heartbeat is not None:
            gap = now - last_heartbeat
            tally["longest_gap"] = max(tally["longest_gap"], gap)
            tally["gaps"] += gap > 1.0
        if frame.get("sensorOk") is False:
            tally["sensor_not_ok"] += 1
        elif isinstance(frame.get("depthMm"), (int, float)):
            tally["depths"].append(frame["depthMm"])
        return now
    if kind == "compression":
        tally["strokes"].append((frame.get("startDepthMm"), frame.get("endDepthMm")))
    elif kind == "error":
        tally["errors"].append(frame)
        print(f"  error frame: {frame}", flush=True)
    elif kind == "ready":
        tally["restarts"] += 1
        print(f"  unexpected ready (the board restarted): {frame}", flush=True)
    return last_heartbeat


def run_phase(link, cues, name, duration, cue):
    stop = threading.Event()
    beat = None
    if name == "compressions":
        cues.say(cue + " Ready.", wait=True)
        cues.say("Go")
        beat = threading.Thread(target=metronome, args=(cues, stop), daemon=True)
        beat.start()
    else:
        cues.say(cue)

    tally = new_tally()
    last_heartbeat = None
    warned = False
    started = time.monotonic()
    while (elapsed := time.monotonic() - started) < duration:
        if beat is None and not warned and duration >= 20 and duration - elapsed <= 10:
            cues.say("Ten seconds")
            warned = True
        raw = link.readline()
        if raw:
            last_heartbeat = record(tally, raw, time.monotonic(), last_heartbeat)
    stop.set()
    if beat:
        beat.join(timeout=1)
    return tally


def report_phase(name, duration, tally):
    depth_label = "depth" if name == "compressions" else "resting depth"
    print(
        f"\n[{name}] heartbeats {tally['heartbeats']}, sensorOk=false {tally['sensor_not_ok']},"
        f" errors {len(tally['errors'])}, garbled {tally['garbled']}, restarts {tally['restarts']},"
        f" gaps > 1 s {tally['gaps']}, longest gap {tally['longest_gap']:.2f} s",
        flush=True,
    )
    print(f"  {depth_label} (mm): {describe(tally['depths'])}", flush=True)

    strokes = tally["strokes"]
    if strokes:
        starts = [s for s, _ in strokes if isinstance(s, (int, float))]
        ends = [e for _, e in strokes if isinstance(e, (int, float))]
        beats = int(duration * BPM / 60) if name == "compressions" else 0
        played = f" for about {beats} beats" if beats else ""
        print(f"  compressions: {len(strokes)}{played}", flush=True)
        print(
            f"  start depth (mm): {describe(starts)}; at most 5 mm: "
            f"{sum(v <= 5 for v in starts)}/{len(starts)}",
            flush=True,
        )
        print(
            f"  end depth (mm): {describe(ends)}; within 50-60 mm: "
            f"{sum(50 <= v <= 60 for v in ends)}/{len(ends)}",
            flush=True,
        )
        print(f"  starts: {[round(v, 1) for v in starts]}", flush=True)
        print(f"  ends:   {[round(v, 1) for v in ends]}", flush=True)

    if name == "hands-off" and tally["depths"]:
        # Heartbeats arrive every 500 ms, so 8 of them span 4 s.
        depths = tally["depths"]
        print(
            f"  first 4 s: {describe(depths[:8])}; last 4 s: {describe(depths[-8:])}"
            " (falling = slow spring-back; rising = the chest is sagging)",
            flush=True,
        )


def verdict(results, scale):
    print("\nVerdict", flush=True)
    problems = []
    for name, tally in results.items():
        for key, label in (
            ("sensor_not_ok", "sensorOk=false"),
            ("garbled", "garbled lines"),
            ("restarts", "restarts"),
            ("gaps", "heartbeat gaps > 1 s"),
        ):
            if tally[key]:
                problems.append(f"{tally[key]} {label} in {name}")
        if tally["errors"]:
            problems.append(f"{len(tally['errors'])} error frames in {name}")
    if problems:
        print("  Link: NOT OK. " + "; ".join(problems) + ".", flush=True)
        print("  Check the sensor cable, its screw terminals and the USB cable.", flush=True)
    else:
        print("  Link: OK. No errors, restarts, garbled lines or gaps.", flush=True)

    resting = results.get("rest", {}).get("depths", [])
    if len(resting) >= 2:
        print(
            f"  Resting noise: max {max(resting):.1f} mm, standard deviation"
            f" {statistics.pstdev(resting):.2f} mm.",
            flush=True,
        )

    ends = [
        e
        for _, e in results.get("compressions", {}).get("strokes", [])
        if isinstance(e, (int, float))
    ]
    if not ends:
        print("  No compressions were counted, so there is no scale suggestion.", flush=True)
        return
    median_end = statistics.median(ends)
    if isinstance(scale, (int, float)):
        suggested = scale * median_end / TARGET_DEPTH_MM
        print(
            f"  Depth scale: {scale:g} now; median end depth {median_end:.1f} mm suggests"
            f" about {suggested:.2f} (send S{suggested:.2f} to store it).",
            flush=True,
        )
    else:
        print(
            f"  Median end depth {median_end:.1f} mm. The board did not report its scale;"
            f" multiply the scale by {median_end / TARGET_DEPTH_MM:.2f} for a 55 mm median.",
            flush=True,
        )
    print(
        "  This is a hint only: it holds only if the compressions were done with good"
        " technique at full guideline depth (50-60 mm).",
        flush=True,
    )


def main():
    parser = argparse.ArgumentParser(description="Guided check of the compression sensor.")
    parser.add_argument(
        "port", nargs="?", help="serial port; auto-picked when exactly one is found"
    )
    parser.add_argument(
        "--fast", action="store_true", help="tenth-length phases, for trying the script out"
    )
    parser.add_argument(
        "--quiet", action="store_true", help="print cues instead of speaking; no metronome sound"
    )
    args = parser.parse_args()

    port = pick_port(args.port)
    print(
        f"Port: {port}. The kiosk must not hold it: close it or park it on its maintenance screen."
    )
    input("Hands off the chest, then press Enter to start. ")

    cues = Cues(args.quiet)
    with serial.Serial(port, BAUD, timeout=0.2) as link:
        cues.say("Hands off the chest. The board is restarting and calibrating.", wait=True)
        ready = wait_for_ready(link)
        if ready is None:
            print("No ready frame within 15 s: is the kiosk or a serial monitor holding the port?")
        else:
            print(
                f"ready: baselineMm {ready.get('baselineMm')}, baselineOk {ready.get('baselineOk')},"
                f" deviceId {ready.get('deviceId')}, scale {ready.get('scale')}",
                flush=True,
            )
        time.sleep(2)
        link.reset_input_buffer()

        results = {}
        for name, duration, cue in PHASES:
            duration = duration / 10 if args.fast else duration
            results[name] = run_phase(link, cues, name, duration, cue)
            report_phase(name, duration, results[name])

    cues.say("Check complete.", wait=True)
    verdict(results, ready.get("scale") if ready else None)


if __name__ == "__main__":
    main()
