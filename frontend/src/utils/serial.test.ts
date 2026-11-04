import { afterEach, describe, expect, it, vi } from "vitest";

import { getAuthorizedPort, isSerialSupported, requestSerialPort } from "./serial";

const fakePort = (usbVendorId?: number, usbProductId?: number) => {
  return {
    getInfo: () => {
      return { usbVendorId, usbProductId };
    },
  } as unknown as SerialPort;
};

const stubSerial = (serial: Partial<Serial>) => {
  vi.stubGlobal("navigator", { serial });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isSerialSupported", () => {
  it("is false in a browser without Web Serial", () => {
    vi.stubGlobal("navigator", {});

    expect(isSerialSupported()).toBe(false);
  });

  it("is true once navigator.serial exists", () => {
    stubSerial({});

    expect(isSerialSupported()).toBe(true);
  });
});

describe("getAuthorizedPort", () => {
  it("returns null without Web Serial", async () => {
    vi.stubGlobal("navigator", {});

    expect(await getAuthorizedPort()).toBeNull();
  });

  it("returns null when nothing has been authorized yet", async () => {
    stubSerial({ getPorts: vi.fn().mockResolvedValue([]) });

    expect(await getAuthorizedPort()).toBeNull();
  });

  it("returns the first granted port when no device is being looked for", async () => {
    const [first, second] = [fakePort(1, 1), fakePort(2, 2)];
    stubSerial({ getPorts: vi.fn().mockResolvedValue([first, second]) });

    expect(await getAuthorizedPort()).toBe(first);
  });

  it("prefers the port with the same USB ids as the one that was lost", async () => {
    const [other, replacement] = [fakePort(1, 1), fakePort(0x2341, 0x0043)];
    stubSerial({ getPorts: vi.fn().mockResolvedValue([other, replacement]) });

    expect(await getAuthorizedPort({ usbVendorId: 0x2341, usbProductId: 0x0043 })).toBe(
      replacement,
    );
  });

  it("falls back to the first port when the lost device is not attached", async () => {
    const other = fakePort(1, 1);
    stubSerial({ getPorts: vi.fn().mockResolvedValue([other]) });

    expect(await getAuthorizedPort({ usbVendorId: 0x2341, usbProductId: 0x0043 })).toBe(other);
  });

  it("ignores a lost port that never reported USB ids", async () => {
    const first = fakePort();
    stubSerial({ getPorts: vi.fn().mockResolvedValue([first, fakePort(1, 1)]) });

    expect(await getAuthorizedPort({})).toBe(first);
  });

  it("returns null when the browser refuses to list ports", async () => {
    stubSerial({ getPorts: vi.fn().mockRejectedValue(new Error("not allowed")) });

    expect(await getAuthorizedPort()).toBeNull();
  });
});

describe("requestSerialPort", () => {
  it("returns the port the operator picked", async () => {
    const chosen = fakePort(1, 1);
    stubSerial({ requestPort: vi.fn().mockResolvedValue(chosen) });

    expect(await requestSerialPort()).toBe(chosen);
  });

  it("returns null when the operator dismisses the chooser", async () => {
    stubSerial({ requestPort: vi.fn().mockRejectedValue(new Error("No port selected")) });

    expect(await requestSerialPort()).toBeNull();
  });

  it("returns null without Web Serial instead of throwing", async () => {
    vi.stubGlobal("navigator", {});

    expect(await requestSerialPort()).toBeNull();
  });
});
