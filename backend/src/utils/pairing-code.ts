import { randomInt } from "node:crypto";

// Typed by hand at the booth, so the characters people confuse (0/O, 1/I/L) are left out.
// cspell:disable-next-line
export const PAIRING_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const PAIRING_CODE_LENGTH = 8;

export const generatePairingCode = () =>
  Array.from(
    { length: PAIRING_CODE_LENGTH },
    () => PAIRING_CODE_ALPHABET[randomInt(PAIRING_CODE_ALPHABET.length)],
  ).join("");

export const normalizePairingCode = (code: string) =>
  code.replace(/[\s-]/g, "").toUpperCase();
