"""CPR booth case: Arduino Uno R3 + "Screw Shield V2" (two side strips).

Base tray with keyhole mounting ears + friction-fit lid (optional M3 screws).
Units: mm. Printer: Bambu Lab A1, PLA/PETG, 0.2 mm layers, no supports.

Run:  uv run --with manifold3d --with numpy --with trimesh python uno_case.py
Writes base.stl and lid.stl next to this file, already in print orientation.
"""

from pathlib import Path

import numpy as np
import trimesh
from manifold3d import Manifold

# ---------- Measure these on the real stack and adjust ----------
OVERHANG = 14.0  # how far each red strip sticks out past the Uno's long edge
STACK_HEIGHT = 25.0  # Uno PCB underside -> top of terminals / black headers
FAR_OVERHANG = 4.0  # strips sticking out past the Uno's far short edge (opposite USB)
SIDE_GAP_POWER = 18.0  # 5V/GND/A4/A5 side: ferrules + soldered tails + cable run
SIDE_GAP_DIGITAL = 8.5  # digital side: strip removed, Uno edge -> wall; clears the corner lid columns

# ---------- Case ----------
WALL = 2.4
FLOOR = 2.0
LID_T = 2.0
CLEAR = 0.25  # lid lip fit; raise to 0.35 if too tight
STANDOFF_H = 4.0  # clearance under the Uno for solder points
POST_D = 7.0
PILOT_D = 2.8  # M3 thread-forming into PLA/PETG (prints a little undersize)
BOTTOM_SKIN = 0.6  # plastic left under the pilot holes
TOP_MARGIN = 4.0  # air above the tallest part
FRONT_GAP = 2.5  # inner front wall -> Uno USB-end edge
CORNER_R = 3.0
LIP_H = 4.0

# ---------- Mounting ears (keyhole slots on both short ends) ----------
EARS = True
EAR_LEN = 16.0
EAR_W = 26.0
EAR_T = 3.0
SCREW_D = 4.5  # M4 / #8 wood screw shank
HEAD_D = 9.0  # screw head passes through here, then the case slides

# ---------- Sensor cable exit (UL2464 4x26AWG, OD 3.5 mm) ----------
CABLE_D = 4.4
CABLE_X = 52.0  # along the Uno from its USB-end edge, near A4/A5

# ---------- Arduino Uno R3 reference (official drawing) ----------
PCB_L, PCB_W, PCB_T = 68.6, 53.4, 1.6
HOLES = [(13.97, 2.54), (15.24, 50.8), (66.04, 7.62), (66.04, 35.56)]
USB_Y, USB_W, USB_H = 38.1, 12.0, 10.9  # USB-B, centered on y
JACK_Y, JACK_W, JACK_H = 7.6, 9.0, 11.0  # barrel jack

# ---------- Derived ----------
IN_L = FRONT_GAP + PCB_L + FAR_OVERHANG + 2
IN_W = SIDE_GAP_POWER + OVERHANG + PCB_W + SIDE_GAP_DIGITAL
IN_H = STANDOFF_H + STACK_HEIGHT + TOP_MARGIN
OUT_L = IN_L + 2 * WALL
OUT_W = IN_W + 2 * WALL
OUT_H = FLOOR + IN_H

BX = WALL + FRONT_GAP  # Uno origin: USB-end edge, power/analog-header side
BY = WALL + SIDE_GAP_POWER + OVERHANG
BZ = FLOOR + STANDOFF_H
CABLE_Z = FLOOR + 6 + CABLE_D / 2  # cable rests on the zip-tie bridge, then rises to the terminals
PCB_TOP = BZ + PCB_T

SEG = 48


def box(x, y, z, l, w, h):
    return Manifold.cube([l, w, h]).translate([x, y, z])


def cyl(x, y, z, d, h, d2=None):
    r2 = (d2 if d2 is not None else d) / 2
    return Manifold.cylinder(h, d / 2, r2, SEG).translate([x, y, z])


def hull(*parts):
    return Manifold.batch_hull(list(parts))


def rbox(l, w, h, r):
    return hull(*[cyl(x, y, 0, 2 * r, h) for x in (r, l - r) for y in (r, w - r)])


def lid_screws():
    a = WALL + 3.5
    return [(a, a), (OUT_L - a, a), (a, OUT_W - a), (OUT_L - a, OUT_W - a)]


def ear():
    """Ear pointing +x from x=0, centered on y=0, with a keyhole slot."""
    plate = hull(
        box(-1, -EAR_W / 2, 0, 1, EAR_W, EAR_T),
        cyl(EAR_LEN - 4, -EAR_W / 2 + 4, 0, 8, EAR_T),
        cyl(EAR_LEN - 4, EAR_W / 2 - 4, 0, 8, EAR_T),
    )
    cx = EAR_LEN - 7
    head = cyl(cx, -4, -1, HEAD_D, EAR_T + 2)
    slot = hull(cyl(cx, -4, -1, SCREW_D, EAR_T + 2), cyl(cx, 6, -1, SCREW_D, EAR_T + 2))
    return plate - head - slot


def base():
    body = rbox(OUT_L, OUT_W, OUT_H, CORNER_R)
    if EARS:
        body += ear().translate([OUT_L, OUT_W / 2, 0])
        body += ear().mirror([1, 0, 0]).translate([0, OUT_W / 2, 0])

    body -= box(WALL, WALL, FLOOR, IN_L, IN_W, IN_H + 1)  # cavity
    body -= box(-1, BY + USB_Y - (USB_W + 1.5) / 2, PCB_TOP - 0.5, WALL + 2, USB_W + 1.5, USB_H + 1.5)
    body -= box(-1, BY + JACK_Y - (JACK_W + 1.5) / 2, PCB_TOP - 0.5, WALL + 2, JACK_W + 1.5, JACK_H + 1.5)
    # sensor cable hole in the side wall next to the power/analog strip (y = 0 side)
    body -= (
        Manifold.cylinder(WALL + 2, CABLE_D / 2, CABLE_D / 2, SEG)
        .rotate([-90, 0, 0])
        .translate([BX + CABLE_X, -1, CABLE_Z])
    )

    # Uno standoffs: flared base so they can't snap off the floor, and the pilot
    # runs through the post into the floor so M3 x 6 fits without bottoming out
    for hx, hy in HOLES:
        body += cyl(BX + hx, BY + hy, FLOOR - 0.01, POST_D, STANDOFF_H + 0.01)
        body += cyl(BX + hx, BY + hy, FLOOR - 0.01, POST_D + 4, 1.5, d2=POST_D)
    for hx, hy in HOLES:
        body -= cyl(BX + hx, BY + hy, BOTTOM_SKIN, PILOT_D, FLOOR + STANDOFF_H)

    # zip-tie bridge behind the cable hole (strain relief): the tie runs through
    # the tunnel along x and wraps the cable, which runs along y above it
    bridge = box(BX + CABLE_X - 3, WALL + 3, FLOOR - 0.01, 6, 10, 6.01)
    body += bridge - box(BX + CABLE_X - 4, WALL + 5, FLOOR + 1.5, 8, 6, 3)

    # full-height corner columns for the lid screws (no overhangs, no supports)
    for x, y in lid_screws():
        col = box(x - 4, y - 4, FLOOR - 0.01, 8, 8, IN_H + 0.01)  # overlaps the walls
        body += col - cyl(x, y, OUT_H - 10, PILOT_D, 11)
    return body


def lid():
    """Printed as modeled: outer face on the bed, lip pointing up."""
    plate = rbox(OUT_L, OUT_W, LID_T, CORNER_R)
    lw, ww = IN_L - 2 * CLEAR, IN_W - 2 * CLEAR
    lip = box(0, 0, 0, lw, ww, LIP_H) - box(1.6, 1.6, -1, lw - 3.2, ww - 3.2, LIP_H + 2)
    lip = lip.translate([WALL + CLEAR, WALL + CLEAR, LID_T - 0.01])
    for x, y in lid_screws():  # clear the corner columns
        lip -= box(x - 4.2, y - 4.2, 0, 8.4, 8.4, LID_T + LIP_H + 1)
    body = plate + lip

    # vent slots over the middle of the Uno
    for i in range(6):
        x = OUT_L / 2 - 20 + i * 8
        body -= hull(cyl(x, OUT_W / 2 - 15, -1, 3, LID_T + 2), cyl(x, OUT_W / 2 + 15, -1, 3, LID_T + 2))
    # countersunk M3 holes (screws optional); columns are symmetric, so no flip needed
    for x, y in lid_screws():
        body -= cyl(x, y, -1, 3.4, LID_T + 2)
        body -= cyl(x, y, -0.01, 6.5, 1.6, d2=3.4)
    return body


def export(m, path):
    mesh = m.to_mesh()
    verts = np.asarray(mesh.vert_properties)[:, :3]
    trimesh.Trimesh(verts, np.asarray(mesh.tri_verts), process=True).export(path)


if __name__ == "__main__":
    here = Path(__file__).parent
    for name, m in (("base", base()), ("lid", lid())):
        export(m, here / f"{name}.stl")
        lo, hi = m.bounding_box()[:3], m.bounding_box()[3:]
        size = [round(h - l, 1) for l, h in zip(lo, hi)]
        print(f"{name}.stl  {size[0]} x {size[1]} x {size[2]} mm  volume {m.volume() / 1000:.1f} cm3")
