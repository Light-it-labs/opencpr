import type { Breadcrumb, Event, NodeOptions } from "@sentry/node";

import { redactText, redactUrl } from "../utils/redact";

type StreamedSpan = Parameters<NonNullable<NodeOptions["beforeSendSpan"]>>[0];

const URL_KEYS = ["url", "http.url", "http.target", "url.full", "url.path"];

const QUERY_KEYS = ["url.query", "http.query"];

const hasStringValue = (value: unknown): value is { value: string } =>
  typeof value === "object" &&
  value !== null &&
  "value" in value &&
  typeof value.value === "string";

const scrubUrlData = (data: Record<string, unknown> | undefined) => {
  if (!data) return;

  for (const key of QUERY_KEYS) delete data[key];

  for (const key of URL_KEYS) {
    const value = data[key];

    if (typeof value === "string") data[key] = redactUrl(value);
    else if (hasStringValue(value)) value.value = redactUrl(value.value);
  }
};

export const scrubBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb => {
  if (breadcrumb.message) breadcrumb.message = redactText(breadcrumb.message);

  scrubUrlData(breadcrumb.data);

  return breadcrumb;
};

export const scrubEvent = <T extends Event>(event: T): T => {
  event.exception?.values?.forEach((exception) => {
    if (exception.value) exception.value = redactText(exception.value);
  });

  if (event.message) event.message = redactText(event.message);

  if (event.logentry?.message)
    event.logentry.message = redactText(event.logentry.message);

  if (event.request) {
    if (event.request.url) event.request.url = redactUrl(event.request.url);
    delete event.request.query_string;
  }

  if (event.transaction) event.transaction = redactUrl(event.transaction);

  event.breadcrumbs?.forEach(scrubBreadcrumb);

  scrubUrlData(event.contexts?.trace?.data);

  event.spans?.forEach((span) => {
    if (span.description) span.description = redactUrl(span.description);
    scrubUrlData(span.data);
  });

  return event;
};

export const scrubSpan = (span: StreamedSpan): StreamedSpan => {
  span.name = redactUrl(span.name);
  scrubUrlData(span.attributes);

  return span;
};
