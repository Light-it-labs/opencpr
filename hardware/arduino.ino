#include <ArduinoJson.h>
#include <EEPROM.h>
#include <Wire.h>
#include <avr/wdt.h>
#include <vl53l4cd_class.h>

// ===========================================================================
// CPR compression sensor — measurements only.
//
// This sketch reports what it measured: a timestamp, the shallowest depth the
// chest returned to before the stroke, and the deepest point of the stroke.
// It deliberately does NOT decide whether a compression was "deep enough" or
// "fully released", and no longer computes BPM. Those are judgements against
// AHA guidelines, and they live in exactly one place — the app's scoring
// module — so the two halves of the system cannot disagree and past sessions
// can be re-scored when the model changes.
//
// Protocol, one JSON object per line, 115200 baud.
//
//   device → host
//     {"type":"ready","baselineMm":78.4,"baselineOk":true,"deviceId":"<uuid>","scale":1.3}
//     {"type":"heartbeat","sensorOk":true,"depthMm":1.2}
//     {"type":"compression","timestampMs":1234,"startDepthMm":2.1,"endDepthMm":54.3}
//     {"type":"error","code":"sensor|calibration|scale","message":"..."}
//
//   deviceId names this board for good. The host uses it as the kiosk ID, so a
//   new domain, browser or computer is still the same kiosk.
//
//   "sensor" means ranging is broken and depths cannot be trusted.
//   "calibration" means the device is fine but a baseline request was refused —
//   the previous baseline is still in force.
//   "scale" means an 'S' value was out of range; the stored scale is unchanged.
//
//   host → device
//     'R'  reset session tracking (between participants)
//     'C'  recalibrate the resting baseline
//     'S<scale>\n'  store this manikin's depth scale (e.g. "S1.0"), answered
//                   with a ready frame. Set once per installation by a person
//                   on the serial port; the kiosk never sends it.
// ===========================================================================

// --------------------------- Detection ---------------------------
// Hysteresis on depth rather than per-sample deltas, so detection does not
// depend on loop rate.
//
// The thresholds are RELATIVE to the local trough and peak, not absolute
// depths. Absolute ones froze the detector outright whenever someone leaned on
// the chest: if the release line is 8mm and they only come back to 20mm, the
// stroke never closes, nothing is ever emitted, and the participant compresses
// into a counter that does not move. Incomplete recoil is one of the commonest
// real CPR faults, so that failure would have been routine.
//
// Measured against trough and peak, a leaning participant is still counted --
// and reports a startDepthMm that correctly fails the full-recoil check, which
// is the feedback they actually need.
const float armMarginMm = 12.0;     // rise above the trough to open a stroke
const float releaseMarginMm = 12.0; // fall below the peak to close it
const float maxPlausibleDepthMm = 90.0;
const unsigned long minCompressionIntervalMs = 250;

// --------------------------- Sensor ---------------------------
// Sigma and signal thresholds are left at the library defaults. The previous
// build tightened sigma to 5mm believing it "relaxed" the default of 15 — it
// does the opposite. Against a matte target in a dark cavity there is no noise
// problem to work around, and range_status is now honoured instead.
static const uint16_t TIMING_BUDGET_MS = 33; // ~30 Hz
static const uint16_t INTER_MEAS_MS = 0;     // continuous ranging
static const uint8_t RANGE_STATUS_VALID = 0;
static const int maxConsecutiveBadReads = 30; // ~1s before we shout

// --------------------------- Geometry calibration ---------------------------
// The sensor rides the hinged chest plate, so it swings on an arc about the
// hinge. Mounted further from the pivot than the sternum compression point, it
// travels proportionally further than the chest actually compresses:
//
//   sensor travel = chest depth x (hinge->sensor) / (hinge->sternum)
//
// Field measurement (25 strokes, manikin depth clicker engaging on nearly all
// of them) reported a mean travel of 69.3mm. Rest reads 0.0mm, which proves the
// error is multiplicative and not an additive offset -- an offset would show at
// rest too.
//
// Calibrated in situ against the manikin's own depth clicker, because the unit
// is borrowed, has no manual, and cannot be opened without disturbing the mount.
//
// Two independent methods agree:
//   1. The shallowest stroke that still clicked measured 65mm of sensor travel;
//      a clicker indicates the AHA adult minimum, so 65mm travel = 50mm depth.
//   2. Sweeping this constant over a 30-stroke good-form session peaks the score
//      at 1.29-1.30, where all 30 land inside the 50-60mm band.
//
// clickerDepthMm is the one assumption left. If the manikin is ever identified
// and its clicker is set elsewhere, change that number alone.
//
// That is the default, for the reference hinged-plate mount. The scale belongs
// to the manikin and its mount, not to the board: a sensor riding a hinged chest
// plate travels further than the sternum, while a sensor fixed inside the chest
// at the compression point moves with it 1:1. Each board stores its manikin's
// scale in EEPROM, set with the 'S' command.
const float sensorTravelAtClickMm = 65.0; // MEASURED
const float clickerDepthMm = 50.0;        // ASSUMED: AHA adult minimum
const float defaultChestTravelScale = sensorTravelAtClickMm / clickerDepthMm;
const float minChestTravelScale = 0.5;
const float maxChestTravelScale = 2.0;

// --------------------------- Baseline ---------------------------
const int calibrationSamples = 21;
const float maxBaselineSpreadMm = 12.0;
// A steady hold on the chest produces a perfectly tight sample set at entirely
// the wrong distance, so spread alone cannot catch it. Compare against the
// baseline already trusted: real mount drift is small, a held compression is
// not. Only a trusted baseline is a reference; one that failed its own check
// (say, calibrated with the chest open) must not veto the next attempt, or a
// single bad boot locks recalibration out until someone power-cycles the
// booth. Escape hatch if the mount genuinely moved further than this:
// power-cycle the board, which calibrates with no prior baseline to check
// against.
const float maxBaselineDropMm = 10.0;

// --------------------------- Heartbeat ---------------------------
// The host cannot distinguish "nobody is compressing" from "the link died"
// unless we say something periodically.
const unsigned long heartbeatIntervalMs = 500;

// --------------------------- Device ID ---------------------------
// An Uno has no serial number the browser can read, so the board mints its own
// ID on first boot and keeps it in EEPROM, which survives power loss and
// sketch uploads. The marker is written after the ID, so a power cut halfway
// through leaves no marker and the next boot mints again.
static const int DEVICE_ID_MARKER_ADDR = 0;
static const uint8_t DEVICE_ID_MARKER[2] = {0xC9, 0x52};
static const int DEVICE_ID_ADDR = 2;
static const uint8_t DEVICE_ID_BYTES = 16;

// The depth scale follows the device ID, with its own marker so a board that
// predates it reads as unset and keeps the default.
static const int SCALE_MARKER_ADDR = DEVICE_ID_ADDR + DEVICE_ID_BYTES;
static const uint8_t SCALE_MARKER[2] = {0x5C, 0xA1};
static const int SCALE_ADDR = SCALE_MARKER_ADDR + 2;

// =================== STATE ===================
VL53L4CD sensor(&Wire, -1);

float baselineMm = 0;
// An untrusted baseline is still used for depth so the kiosk keeps getting
// readings; the host already knows from baselineOk:false in the ready frame.
bool baselineTrusted = false;
char deviceId[37]; // UUID text plus terminator
float chestTravelScale = defaultChestTravelScale;

bool armed = false;
float peakDepthMm = 0;   // deepest point of the stroke in progress
float troughDepthMm = 0; // shallowest point since the previous stroke
bool haveTrough = false; // sentinel kept separate from the value, so that a
                         // genuine 0.0mm (fully recoiled) is not read as unset

unsigned long lastCompressionMs = 0;
unsigned long lastHeartbeatMs = 0;

uint16_t lastGoodRawMm = 0;
int consecutiveBadReads = 0;
bool reportedSensorFault = false;

// =================== WATCHDOG SAFETY ===================
// Clearing WDRF before main() runs stops a watchdog reset from turning into a
// boot loop on bootloaders that leave the flag set.
uint8_t mcusrMirror __attribute__((section(".noinit")));
void clearWatchdogEarly(void) __attribute__((naked)) __attribute__((used))
__attribute__((section(".init3")));

void clearWatchdogEarly(void)
{
  mcusrMirror = MCUSR;
  MCUSR = 0;
  wdt_disable();
}

// =================== FORWARD DECLS ===================
void emitError(const char *code, const char *message);
void emitReady(bool baselineOk);
bool readRaw(float *out);
bool readDepth(float *out);
float calibrateBaseline(bool *ok);
void resetSession();
void handleHostCommands();
bool initSensor();
void loadDeviceId();
void loadChestTravelScale();
void storeChestTravelScale();

// =================== SETUP ===================
void setup()
{
  Serial.begin(115200);
  loadDeviceId();
  loadChestTravelScale();

  Wire.begin();
  // A glitch on SDA used to be able to block Wire forever, which stopped the
  // sketch dead with no indication to the host. Reset the bus instead.
  Wire.setWireTimeout(3000, true);

  if (!initSensor())
  {
    // initSensor already reported why. Keep the watchdog armed so the board
    // retries from scratch rather than sitting here bricked.
    wdt_enable(WDTO_4S);
    while (1)
    {
    }
  }

  bool ok = false;
  baselineMm = calibrateBaseline(&ok);
  baselineTrusted = ok;

  // One frame, not two. Emitting an error and then an unconditional ready told
  // the host both that calibration had failed and that the device was good to
  // go, which surfaced as a success and a failure toast side by side. The host
  // needs to know the board is alive either way, so ready carries the verdict
  // rather than a separate frame contradicting it.
  emitReady(ok);

  lastHeartbeatMs = millis();
  wdt_enable(WDTO_4S);
}

// =================== LOOP ===================
void loop()
{
  wdt_reset();
  handleHostCommands();

  const unsigned long now = millis();

  float depth = 0;
  const bool valid = readDepth(&depth);

  if (valid)
  {
    consecutiveBadReads = 0;
    reportedSensorFault = false;

    if (depth <= maxPlausibleDepthMm)
    {
      if (!armed)
      {
        // Between strokes: hold the shallowest point the chest returns to. That
        // is the recoil the next stroke starts from, whether it is 0mm or 20mm.
        if (!haveTrough || depth < troughDepthMm)
        {
          troughDepthMm = depth;
          haveTrough = true;
        }

        if (haveTrough && depth >= troughDepthMm + armMarginMm)
        {
          armed = true;
          peakDepthMm = depth;
        }
      }
      else
      {
        if (depth > peakDepthMm)
        {
          peakDepthMm = depth;
        }

        // Closing on a retreat from the peak rather than on an absolute depth is
        // what keeps a leaning participant from stalling the detector.
        if (depth <= peakDepthMm - releaseMarginMm)
        {
          if (now - lastCompressionMs >= minCompressionIntervalMs)
          {
            JsonDocument doc;
            doc["type"] = "compression";
            doc["timestampMs"] = now;
            doc["startDepthMm"] = troughDepthMm;
            doc["endDepthMm"] = peakDepthMm;
            serializeJson(doc, Serial);
            Serial.println();

            lastCompressionMs = now;
          }

          armed = false;
          peakDepthMm = 0;
          // Wherever they released to is the trough the next stroke measures
          // from; it keeps tracking downward if they release further.
          troughDepthMm = depth;
          haveTrough = true;
        }
      }
    }
  }
  else
  {
    consecutiveBadReads++;

    if (consecutiveBadReads >= maxConsecutiveBadReads && !reportedSensorFault)
    {
      reportedSensorFault = true;
      emitError("sensor", "Sensor is not returning valid ranges");

      // Try to bring the sensor back without losing the baseline.
      if (initSensor())
      {
        consecutiveBadReads = 0;
      }
    }
  }

  if (now - lastHeartbeatMs >= heartbeatIntervalMs)
  {
    lastHeartbeatMs = now;

    JsonDocument doc;
    doc["type"] = "heartbeat";
    doc["sensorOk"] = valid;
    if (valid)
    {
      doc["depthMm"] = depth;
    }
    serializeJson(doc, Serial);
    Serial.println();
  }
}

// =================== HELPERS ===================

bool initSensor()
{
  if (sensor.begin() != 0)
  {
    emitError("sensor", "Failed to detect VL53L4CD");

    return false;
  }

  if (sensor.VL53L4CD_SensorInit() != VL53L4CD_ERROR_NONE)
  {
    emitError("sensor", "VL53L4CD_SensorInit failed");

    return false;
  }

  // Configure before ranging starts, and check the result — the previous build
  // applied thresholds after StartRanging and discarded every return code, so a
  // rejected setting failed silently.
  if (sensor.VL53L4CD_SetRangeTiming(TIMING_BUDGET_MS, INTER_MEAS_MS) != VL53L4CD_ERROR_NONE)
  {
    emitError("sensor", "VL53L4CD_SetRangeTiming failed");

    return false;
  }

  if (sensor.VL53L4CD_StartRanging() != VL53L4CD_ERROR_NONE)
  {
    emitError("sensor", "VL53L4CD_StartRanging failed");

    return false;
  }

  return true;
}

void emitError(const char *code, const char *message)
{
  JsonDocument doc;
  doc["type"] = "error";
  doc["code"] = code;
  doc["message"] = message;
  serializeJson(doc, Serial);
  Serial.println();
}

void emitReady(bool baselineOk)
{
  JsonDocument doc;
  doc["type"] = "ready";
  doc["baselineMm"] = baselineMm;
  // False means the baseline failed its own sanity check and every depth
  // derived from it is suspect. The board still runs, so the host can decide
  // whether to warn or to demand a recalibration.
  doc["baselineOk"] = baselineOk;
  doc["deviceId"] = deviceId;
  doc["scale"] = chestTravelScale;
  serializeJson(doc, Serial);
  Serial.println();
}

void resetSession()
{
  armed = false;
  peakDepthMm = 0;
  troughDepthMm = 0;
  haveTrough = false;
  lastCompressionMs = 0;
}

void handleHostCommands()
{
  while (Serial.available() > 0)
  {
    const char command = (char)Serial.read();

    if (command == 'R' || command == 'r')
    {
      resetSession();
    }
    else if (command == 'C' || command == 'c')
    {
      bool ok = false;
      const float measured = calibrateBaseline(&ok);

      if (ok)
      {
        baselineMm = measured;
        baselineTrusted = true;
        resetSession();
        emitReady(true);
      }
      else
      {
        char detail[96];
        snprintf(detail, sizeof(detail),
                 "Refused: measured %d mm vs baseline %d mm - chest must be at rest",
                 (int)measured, (int)baselineMm);
        emitError("calibration", detail);
      }
    }
    else if (command == 'S' || command == 's')
    {
      const float requested = Serial.readStringUntil('\n').toFloat();

      if (requested >= minChestTravelScale && requested <= maxChestTravelScale)
      {
        chestTravelScale = requested;
        storeChestTravelScale();
        resetSession();
        emitReady(baselineTrusted);
      }
      else
      {
        emitError("scale", "Refused: scale must be between 0.5 and 2.0, e.g. S1.0");
      }
    }
  }
}

// Reads a fresh raw distance in mm. Returns false when the sensor reports the
// measurement is not usable, rather than passing a zero through as a
// full-depth compression.
bool readRaw(float *out)
{
  const uint32_t started = millis();

  while (true)
  {
    uint8_t ready = 0;
    if (sensor.VL53L4CD_CheckForDataReady(&ready) != VL53L4CD_ERROR_NONE)
    {
      return false;
    }

    if (ready)
    {
      VL53L4CD_Result_t result = {};
      if (sensor.VL53L4CD_GetResult(&result) != VL53L4CD_ERROR_NONE)
      {
        return false;
      }
      sensor.VL53L4CD_ClearInterrupt();

      if (result.range_status != RANGE_STATUS_VALID)
      {
        return false;
      }

      lastGoodRawMm = result.distance_mm;
      *out = (float)result.distance_mm;

      return true;
    }

    if (millis() - started > (uint32_t)(TIMING_BUDGET_MS + 10))
    {
      return false;
    }
  }
}

bool readDepth(float *out)
{
  float raw = 0;
  if (!readRaw(&raw))
  {
    return false;
  }

  // Reported in chest-compression millimetres, not raw sensor travel, so the
  // app's AHA thresholds mean the same thing on every manikin.
  *out = max(0.0f, (baselineMm - raw) / chestTravelScale);

  return true;
}

// Median of a sample set, with a spread check. A mean let a single bad reading
// skew the reference for the whole day, and nothing noticed if a hand was
// resting on the chest at power-up.
float calibrateBaseline(bool *ok)
{
  float samples[calibrationSamples];
  int collected = 0;

  const uint32_t deadline = millis() + 3000;

  while (collected < calibrationSamples && millis() < deadline)
  {
    wdt_reset();

    float raw = 0;
    if (readRaw(&raw))
    {
      samples[collected++] = raw;
    }
    delay(10);
  }

  if (collected < calibrationSamples / 2)
  {
    *ok = false;

    return lastGoodRawMm ? (float)lastGoodRawMm : 0.0f;
  }

  // Insertion sort: tiny n, and it keeps this off the heap.
  for (int i = 1; i < collected; i++)
  {
    const float key = samples[i];
    int j = i - 1;
    while (j >= 0 && samples[j] > key)
    {
      samples[j + 1] = samples[j];
      j--;
    }
    samples[j + 1] = key;
  }

  // At rest the sensor sits at its FURTHEST from the base; any touch only
  // reduces that distance. A high percentile therefore survives someone
  // brushing the chest mid-calibration, where a median would not.
  const float candidate = samples[(collected * 9) / 10];

  const float spread = samples[collected - 1] - samples[0];
  if (spread > maxBaselineSpreadMm)
  {
    *ok = false;

    return candidate;
  }

  if (baselineTrusted && candidate < baselineMm - maxBaselineDropMm)
  {
    *ok = false;

    return candidate;
  }

  *ok = true;

  return candidate;
}

// Analog pins A0-A3 are unwired and float, so their low bits plus the timer
// give each board a different seed. Only a handful of kiosks exist, so this
// needs to avoid collisions, not resist an attacker.
uint32_t gatherSeed()
{
  uint32_t seed = 0;

  for (uint8_t pass = 0; pass < 32; pass++)
  {
    seed = (seed << 3) ^ (seed >> 29) ^ (uint32_t)analogRead(A0 + (pass % 4)) ^ micros();
  }

  return seed;
}

void loadDeviceId()
{
  uint8_t bytes[DEVICE_ID_BYTES];
  const bool stored = EEPROM.read(DEVICE_ID_MARKER_ADDR) == DEVICE_ID_MARKER[0] &&
                      EEPROM.read(DEVICE_ID_MARKER_ADDR + 1) == DEVICE_ID_MARKER[1];

  if (stored)
  {
    for (uint8_t i = 0; i < DEVICE_ID_BYTES; i++)
    {
      bytes[i] = EEPROM.read(DEVICE_ID_ADDR + i);
    }
  }
  else
  {
    randomSeed(gatherSeed());

    for (uint8_t i = 0; i < DEVICE_ID_BYTES; i++)
    {
      bytes[i] = (uint8_t)random(256);
    }

    // Version 4 and variant bits, so it reads as an ordinary random UUID.
    bytes[6] = (bytes[6] & 0x0F) | 0x40;
    bytes[8] = (bytes[8] & 0x3F) | 0x80;

    for (uint8_t i = 0; i < DEVICE_ID_BYTES; i++)
    {
      EEPROM.update(DEVICE_ID_ADDR + i, bytes[i]);
    }
    EEPROM.update(DEVICE_ID_MARKER_ADDR, DEVICE_ID_MARKER[0]);
    EEPROM.update(DEVICE_ID_MARKER_ADDR + 1, DEVICE_ID_MARKER[1]);
  }

  snprintf(deviceId, sizeof(deviceId),
           "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
           bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
           bytes[8], bytes[9], bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]);
}

void loadChestTravelScale()
{
  const bool stored = EEPROM.read(SCALE_MARKER_ADDR) == SCALE_MARKER[0] &&
                      EEPROM.read(SCALE_MARKER_ADDR + 1) == SCALE_MARKER[1];

  if (!stored)
  {
    return;
  }

  float scale = 0;
  EEPROM.get(SCALE_ADDR, scale);

  if (scale >= minChestTravelScale && scale <= maxChestTravelScale)
  {
    chestTravelScale = scale;
  }
}

void storeChestTravelScale()
{
  EEPROM.put(SCALE_ADDR, chestTravelScale);
  EEPROM.update(SCALE_MARKER_ADDR, SCALE_MARKER[0]);
  EEPROM.update(SCALE_MARKER_ADDR + 1, SCALE_MARKER[1]);
}
