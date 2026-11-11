import type { Breadcrumb, BrowserOptions, Event, replayIntegration } from "@sentry/react";

type StreamedSpan = Parameters<NonNullable<BrowserOptions["beforeSendSpan"]>>[0];

type RecordingEvent = Parameters<
  NonNullable<NonNullable<Parameters<typeof replayIntegration>[0]>["beforeAddRecordingEvent"]>
>[0];

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

const PATH_QUERY = /(\/[^\s?#]*)[?#]\S*/g;

const REGISTRATION_ID_SEGMENT = /(\/r\/)(?!:id(?:[/?#\s]|$))[^/?#\s]+/g;

const CPR_SESSION_ID_SEGMENT = /(\/cpr-sessions\/)(?!:id(?:[/?#\s]|$))[^/?#\s]+(?:\/claim)?/g;

const URL_KEYS = ["url", "http.url", "http.target", "url.full", "url.path"];

const QUERY_KEYS = ["url.query", "http.query"];

const NAVIGATION_KEYS = ["from", "to"];

const RECORDING_URL_KEYS = ["url", "previous", "from", "to"];

export const redactUrl = (url: string) => {
  return url
    .replace(PATH_QUERY, "$1")
    .replace(REGISTRATION_ID_SEGMENT, "$1:id")
    .replace(CPR_SESSION_ID_SEGMENT, "$1:id")
    .replace(EMAIL, "[email]");
};

const hasStringValue = (value: unknown): value is { value: string } => {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof value.value === "string"
  );
};

const redactKeys = (data: object, keys: string[]) => {
  const record = data as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string") {
      record[key] = redactUrl(value);
    } else if (hasStringValue(value)) {
      value.value = redactUrl(value.value);
    }
  }
};

const scrubUrlData = (data: object | undefined) => {
  if (!data) {
    return;
  }

  for (const key of QUERY_KEYS) {
    Reflect.deleteProperty(data, key);
  }

  redactKeys(data, URL_KEYS);
};

export const scrubBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb => {
  if (breadcrumb.message) {
    breadcrumb.message = redactUrl(breadcrumb.message);
  }

  scrubUrlData(breadcrumb.data);

  if (breadcrumb.category === "navigation" && breadcrumb.data) {
    redactKeys(breadcrumb.data, NAVIGATION_KEYS);
  }

  return breadcrumb;
};

export const scrubEvent = <T extends Event>(event: T): T => {
  if (event.request?.url) {
    event.request.url = redactUrl(event.request.url);
  }

  if (event.request) {
    delete event.request.query_string;
  }

  if (event.transaction) {
    event.transaction = redactUrl(event.transaction);
  }

  event.breadcrumbs?.forEach(scrubBreadcrumb);

  scrubUrlData(event.contexts?.trace?.data);

  event.spans?.forEach((span) => {
    if (span.description) {
      span.description = redactUrl(span.description);
    }

    scrubUrlData(span.data);
  });

  return event;
};

export const scrubSpan = (span: StreamedSpan): StreamedSpan => {
  span.name = redactUrl(span.name);
  scrubUrlData(span.attributes);

  return span;
};

export const scrubReplayEvent = (event: Event): Event => {
  if (event.type === "replay_event" && "urls" in event && Array.isArray(event.urls)) {
    event.urls = event.urls.map((url: unknown) => {
      return typeof url === "string" ? redactUrl(url) : url;
    });
  }

  return event;
};

export const scrubRecordingEvent = (event: RecordingEvent): RecordingEvent => {
  if (event.data.tag === "options") {
    return event;
  }

  const { payload } = event.data;

  if ("message" in payload && typeof payload.message === "string") {
    payload.message = redactUrl(payload.message);
  }

  if ("description" in payload && typeof payload.description === "string") {
    payload.description = redactUrl(payload.description);
  }

  if (payload.data) {
    scrubUrlData(payload.data);
    redactKeys(payload.data, RECORDING_URL_KEYS);
  }

  return event;
};
