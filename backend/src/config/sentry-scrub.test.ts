import type { Event } from "@sentry/node";
import { describe, expect, it } from "vitest";

import { scrubBreadcrumb, scrubEvent, scrubSpan } from "./sentry-scrub";

const SESSION_ID = "c0ffee00-session-0001";
const FAILED_QUERY = `Failed query: select * from \`auth_sessions\` where \`id\` = ?\nparams: ${SESSION_ID}`;

describe("scrubEvent", () => {
  it("redacts exception values and messages", () => {
    const event = scrubEvent<Event>({
      message: "Lookup failed for person@example.test",
      exception: {
        values: [{ type: "DrizzleQueryError", value: FAILED_QUERY }],
      },
    });

    expect(event.exception?.values?.[0]?.value).not.toContain(SESSION_ID);
    expect(event.message).toBe("Lookup failed for [email]");
  });

  it("redacts the request URL and drops its query string", () => {
    const event = scrubEvent<Event>({
      transaction: "GET /api/cpr-sessions/reg-0001/claim",
      request: {
        url: "https://api.example.test/api/admin/participants?search=Person",
        query_string: "search=Person",
      },
    });

    expect(event.request?.url).toBe(
      "https://api.example.test/api/admin/participants",
    );
    expect(event.request).not.toHaveProperty("query_string");
    expect(event.transaction).toBe("GET /api/cpr-sessions/:id/claim");
  });

  it("redacts trace data, spans and breadcrumbs", () => {
    const event = scrubEvent<Event>({
      contexts: {
        trace: {
          trace_id: "trace-0001",
          span_id: "span-0001",
          data: {
            "url.full":
              "https://api.example.test/api/cpr-sessions/reg-0001/claim",
            "url.query": "?search=Person",
          },
        },
      },
      breadcrumbs: [
        {
          message: FAILED_QUERY,
          data: { url: "/api/admin/participants?search=Person" },
        },
      ],
    });

    expect(event.contexts?.trace?.data).toEqual({
      "url.full": "https://api.example.test/api/cpr-sessions/:id/claim",
    });
    expect(event.breadcrumbs?.[0]?.message).not.toContain(SESSION_ID);
    expect(event.breadcrumbs?.[0]?.data?.url).toBe("/api/admin/participants");
  });
});

describe("scrubBreadcrumb", () => {
  it("redacts emails in the message", () => {
    expect(scrubBreadcrumb({ message: "sent to person@example.test" })).toEqual(
      {
        message: "sent to [email]",
      },
    );
  });
});

describe("scrubSpan", () => {
  it("redacts the name and URL attributes of a streamed span", () => {
    const span = scrubSpan({
      trace_id: "trace-0001",
      span_id: "span-0001",
      name: "GET /api/cpr-sessions/reg-0001/claim",
      start_timestamp: 0,
      status: "ok",
      is_segment: true,
      attributes: {
        "url.path": "/api/cpr-sessions/reg-0001/claim",
        "http.target": { value: "/api/admin/participants?search=Person" },
        "url.query": "search=Person",
      },
    });

    expect(span.name).toBe("GET /api/cpr-sessions/:id/claim");
    expect(span.attributes).toEqual({
      "url.path": "/api/cpr-sessions/:id/claim",
      "http.target": { value: "/api/admin/participants" },
    });
  });
});
