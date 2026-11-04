export const SERIAL_BAUD_RATE = 115200;

/**
 * Web Serial only exists in Chromium, and only in a secure context. Checking up
 * front lets the setup screen say so plainly instead of failing on requestPort.
 */
export const isSerialSupported = () => {
  return typeof navigator !== "undefined" && "serial" in navigator;
};

const matchesUsbIds = (port: SerialPort, like: SerialPortInfo) => {
  const info = port.getInfo();

  return info.usbVendorId === like.usbVendorId && info.usbProductId === like.usbProductId;
};

/**
 * Ports the operator has already authorized, returned without any prompt. The
 * kiosk uses this to reconnect silently on launch so the browser's native port
 * chooser — which cannot be styled or reached in fullscreen — never appears
 * after the first setup.
 *
 * When the device re-enumerates on USB the browser hands out a *new* SerialPort
 * object for the same hardware, so a caller recovering a lost link passes the
 * old port's `getInfo()` to prefer its replacement over any other grant. Only
 * ports that are currently attached come back, which is what makes polling
 * this a safe way to wait for the board.
 */
export const getAuthorizedPort = async (like?: SerialPortInfo): Promise<SerialPort | null> => {
  if (!isSerialSupported()) {
    return null;
  }

  try {
    const ports = await navigator.serial.getPorts();
    const replacement =
      like?.usbVendorId === undefined
        ? undefined
        : ports.find((port) => {
            return matchesUsbIds(port, like);
          });

    return replacement ?? ports[0] ?? null;
  } catch {
    return null;
  }
};

/** Prompts the operator to pick a port. Returns null if they dismiss it. */
export const requestSerialPort = async (): Promise<SerialPort | null> => {
  if (!isSerialSupported()) {
    return null;
  }

  try {
    return await navigator.serial.requestPort();
  } catch {
    return null;
  }
};
