export type ResultsImageTemplateVars = {
  position: string;
  /** Already formatted as a percentage to one decimal. */
  score: string;

  totalCompressions: number;
  fullCompressions: number;
  fullRebounds: number;

  averageBpm: string;
  compressionsOnBpmRange: number;

  averageDepth: string;

  subject: string;
  /** Heading line; the same one the email opens with. */
  intro: string;
  /** Inlined data: URL — see the note in email.worker.ts. */
  logoSrc: string;
};

export type EmailTemplateVars = {
  recipientName: string;
  subject: string;
  /** Opening line; differs on a repeat run. */
  intro: string;
  /** The line introducing the attached card; differs on a repeat run. */
  resultsNote: string;
};

export type AdminMagicLinkTemplateVars = {
  url: string;
  ttlMinutes: number;
};

export type AccessRequestNoticeTemplateVars = {
  requesterEmail: string;
  /** Already formatted for reading, with its timezone spelled out. */
  requestedAt: string;
  url: string;
};

export const renderTemplate = (
  vars:
    | EmailTemplateVars
    | ResultsImageTemplateVars
    | AdminMagicLinkTemplateVars
    | AccessRequestNoticeTemplateVars,
  htmlTemplate: string,
): string => {
  let html = htmlTemplate;
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value?.toString() ?? "");
  }
  return html;
};
