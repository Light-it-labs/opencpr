import type { Breadcrumb, ErrorEvent, Event } from "@sentry/react";
import { describe, expect, it, vi } from "vitest";

import { beforeSend } from "./sentry";
import {
  redactUrl,
  scrubBreadcrumb,
  scrubEvent,
  scrubRecordingEvent,
  scrubReplayEvent,
  scrubSpan,
} from "./sentry-scrub";

vi.mock("@/config/env", () => {
  return { env: {} };
});

vi.mock("./router", () => {
  return { router: {} };
});

const REGISTRATION_ID = "11111111-2222-4333-8444-555555555555";

const ORIGIN = "https://kiosk.example.test";

const API = "https://api.example.test";

describe("redactUrl", () => {
  it("replaces the registration id in a phone page path", () => {
    expect(redactUrl(`${ORIGIN}/r/${REGISTRATION_ID}`)).toBe(`${ORIGIN}/r/:id`);
    expect(redactUrl(`/r/${REGISTRATION_ID}`)).toBe("/r/:id");
  });

  it("replaces the id in a session path", () => {
    expect(redactUrl(`${API}/cpr-sessions/${REGISTRATION_ID}`)).toBe(`${API}/cpr-sessions/:id`);
  });

  it("collapses the claim path to the session path", () => {
    expect(redactUrl(`${API}/cpr-sessions/${REGISTRATION_ID}/claim`)).toBe(
      `${API}/cpr-sessions/:id`,
    );
  });

  it("keeps the session collection path", () => {
    expect(redactUrl(`${API}/cpr-sessions`)).toBe(`${API}/cpr-sessions`);
  });

  it("leaves already redacted paths unchanged", () => {
    expect(redactUrl("/r/:id")).toBe("/r/:id");
    expect(redactUrl("/cpr-sessions/:id")).toBe("/cpr-sessions/:id");
  });

  it("drops the query string and fragment after a path", () => {
    expect(redactUrl(`${ORIGIN}/register?ref=${REGISTRATION_ID}#top`)).toBe(`${ORIGIN}/register`);
  });

  it("redacts email addresses", () => {
    expect(redactUrl("GET /lookup/participant@example.test")).toBe("GET /lookup/[email]");
  });

  it("redacts an id inside a span name", () => {
    expect(redactUrl(`GET ${API}/cpr-sessions/${REGISTRATION_ID}/claim`)).toBe(
      `GET ${API}/cpr-sessions/:id`,
    );
  });
});

describe("scrubBreadcrumb", () => {
  it("redacts the url of an http breadcrumb", () => {
    const breadcrumb: Breadcrumb = {
      category: "xhr",
      data: { method: "GET", url: `${API}/cpr-sessions/${REGISTRATION_ID}/claim` },
    };

    expect(scrubBreadcrumb(breadcrumb).data).toEqual({
      method: "GET",
      url: `${API}/cpr-sessions/:id`,
    });
  });

  it("redacts both ends of a navigation", () => {
    const breadcrumb: Breadcrumb = {
      category: "navigation",
      data: { from: "/register", to: `/r/${REGISTRATION_ID}?lang=es` },
    };

    expect(scrubBreadcrumb(breadcrumb).data).toEqual({ from: "/register", to: "/r/:id" });
  });

  it("redacts the message", () => {
    const breadcrumb: Breadcrumb = {
      category: "console",
      message: `Claim failed for /r/${REGISTRATION_ID}`,
    };

    expect(scrubBreadcrumb(breadcrumb).message).toBe("Claim failed for /r/:id");
  });
});

describe("scrubEvent", () => {
  it("redacts every url an error event carries", () => {
    const event: Event = {
      request: { url: `${ORIGIN}/r/${REGISTRATION_ID}?lang=es`, query_string: "lang=es" },
      transaction: `/r/${REGISTRATION_ID}`,
      breadcrumbs: [
        { category: "fetch", data: { url: `${API}/cpr-sessions/${REGISTRATION_ID}/claim` } },
      ],
      contexts: {
        trace: {
          trace_id: "a".repeat(32),
          span_id: "b".repeat(16),
          data: {
            "url.full": `${ORIGIN}/r/${REGISTRATION_ID}?lang=es`,
            "url.query": "?lang=es",
          },
        },
      },
      spans: [
        {
          span_id: "c".repeat(16),
          trace_id: "a".repeat(32),
          start_timestamp: 0,
          description: `GET ${API}/cpr-sessions/${REGISTRATION_ID}/claim`,
          data: { "http.url": `${API}/cpr-sessions/${REGISTRATION_ID}/claim` },
          origin: "manual",
          status: "ok",
        },
      ],
    };

    const scrubbed = scrubEvent(event);

    expect(scrubbed.request).toEqual({ url: `${ORIGIN}/r/:id` });
    expect(scrubbed.transaction).toBe("/r/:id");
    expect(scrubbed.breadcrumbs?.[0]?.data).toEqual({ url: `${API}/cpr-sessions/:id` });
    expect(scrubbed.contexts?.trace?.data).toEqual({ "url.full": `${ORIGIN}/r/:id` });
    expect(scrubbed.spans?.[0]?.description).toBe(`GET ${API}/cpr-sessions/:id`);
    expect(scrubbed.spans?.[0]?.data).toEqual({ "http.url": `${API}/cpr-sessions/:id` });
    expect(JSON.stringify(scrubbed)).not.toContain(REGISTRATION_ID);
  });
});

describe("scrubSpan", () => {
  it("redacts the name and url attributes and drops query attributes", () => {
    const span = scrubSpan({
      trace_id: "a".repeat(32),
      span_id: "b".repeat(16),
      name: `GET ${API}/cpr-sessions/${REGISTRATION_ID}/claim`,
      start_timestamp: 0,
      status: "ok",
      is_segment: false,
      attributes: {
        url: `${API}/cpr-sessions/${REGISTRATION_ID}/claim`,
        "http.url": `${API}/cpr-sessions/${REGISTRATION_ID}`,
        "url.full": { value: `${ORIGIN}/r/${REGISTRATION_ID}`, type: "string" },
        "url.path": `/r/${REGISTRATION_ID}`,
        "http.target": `/cpr-sessions/${REGISTRATION_ID}/claim?x=1`,
        "url.query": "?x=1",
        "http.query": "x=1",
        "http.request.method": "GET",
      },
    });

    expect(span.name).toBe(`GET ${API}/cpr-sessions/:id`);
    expect(span.attributes).toEqual({
      url: `${API}/cpr-sessions/:id`,
      "http.url": `${API}/cpr-sessions/:id`,
      "url.full": { value: `${ORIGIN}/r/:id`, type: "string" },
      "url.path": "/r/:id",
      "http.target": "/cpr-sessions/:id",
      "http.request.method": "GET",
    });
  });
});

describe("scrubReplayEvent", () => {
  it("redacts the page urls a replay segment lists", () => {
    const event = { type: "replay_event", urls: [`${ORIGIN}/r/${REGISTRATION_ID}`] } as Event;

    expect(scrubReplayEvent(event)).toEqual({ type: "replay_event", urls: [`${ORIGIN}/r/:id`] });
  });

  it("leaves other events alone", () => {
    const event = { message: `/r/${REGISTRATION_ID}` } as Event;

    expect(scrubReplayEvent(event)).toEqual({ message: `/r/${REGISTRATION_ID}` });
  });
});

describe("scrubRecordingEvent", () => {
  it("redacts a navigation span frame", () => {
    const event = scrubRecordingEvent({
      type: 5,
      timestamp: 0,
      data: {
        tag: "performanceSpan",
        payload: {
          op: "navigation.push",
          description: `/r/${REGISTRATION_ID}`,
          startTimestamp: 0,
          endTimestamp: 0,
          data: { previous: "/register" },
        },
      },
    });

    expect(event.data.payload).toMatchObject({ description: "/r/:id" });
  });

  it("redacts a request span frame", () => {
    const event = scrubRecordingEvent({
      type: 5,
      timestamp: 0,
      data: {
        tag: "performanceSpan",
        payload: {
          op: "resource.fetch",
          description: `${API}/cpr-sessions/${REGISTRATION_ID}/claim`,
          startTimestamp: 0,
          endTimestamp: 0,
          data: { method: "GET", statusCode: 200 },
        },
      },
    });

    expect(event.data.payload).toMatchObject({ description: `${API}/cpr-sessions/:id` });
  });

  it("redacts a breadcrumb frame", () => {
    const event = scrubRecordingEvent({
      type: 5,
      timestamp: 0,
      data: {
        tag: "breadcrumb",
        payload: {
          timestamp: 0,
          type: "default",
          category: "ui.slowClickDetected",
          message: "button",
          data: { url: `${ORIGIN}/r/${REGISTRATION_ID}` },
        },
      },
    });

    expect(event.data.payload).toMatchObject({ data: { url: `${ORIGIN}/r/:id` } });
  });
});

describe("beforeSend", () => {
  const errorEvent = (type: string, value: string): ErrorEvent => {
    return {
      type: undefined,
      exception: { values: [{ type, value }] },
      request: { url: `${ORIGIN}/r/${REGISTRATION_ID}` },
    };
  };

  it("drops tolerated network noise", () => {
    expect(beforeSend(errorEvent("AxiosError", "Request failed"))).toBeNull();
    expect(beforeSend(errorEvent("Error", "Network Error"))).toBeNull();
    expect(beforeSend(errorEvent("TypeError", "Failed to fetch"))).toBeNull();
  });

  it("scrubs the events it keeps", () => {
    expect(beforeSend(errorEvent("TypeError", "x is undefined"))?.request?.url).toBe(
      `${ORIGIN}/r/:id`,
    );
  });
});
