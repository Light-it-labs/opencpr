import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UTCDate } from "@date-fns/utc";
import { Worker, type Processor } from "bullmq";
import { format } from "date-fns";

import { env, logger } from "@/config";

import { Sentry } from "../../config/sentry";
import { EMAIL_QUEUE_NAME, queueConnection } from "../queue/config";
import {
  AccessRequestNoticeJobParams,
  EMAIL_JOB_KINDS,
  EmailJobData,
  SendEmailJobParams,
} from "../queue/queue.service";
import { toReportableEmailError } from "./reportable-error";
import { sendMail } from "./transport";
import { getResultsStats, renderResultsCard, renderTemplate } from "./utils";

const RESULTS_TEMPLATE: string = readFileSync(
  join(process.cwd(), "public", "results-template.html"),
  "utf8",
);

const EMAIL_TEMPLATE: string = readFileSync(
  join(process.cwd(), "public", "email-template.html"),
  "utf8",
);

/** Declared once so the template var and the send() call cannot drift apart. */
const EMAIL_SUBJECT = "Your CPR challenge results ❤️";

const ACCESS_REQUEST_TEMPLATE: string = readFileSync(
  join(process.cwd(), "public", "access-request-template.html"),
  "utf8",
);

const ACCESS_REQUEST_SUBJECT = "New access request to the OpenCPR admin portal";

/**
 * Admins can be anywhere, so the time is spelled out in UTC rather than
 * silently in the server's timezone.
 */
const ACCESS_REQUEST_TIME_FORMAT = "MMM d, yyyy 'at' HH:mm 'UTC'";

/**
 * A first run and a fifth read differently: the two paragraphs that acknowledge
 * the run are chosen here rather than duplicated into a second template, so the
 * rest of the message can only ever be edited in one place.
 */
const COPY = {
  first: {
    intro: "Thanks for taking the challenge!",
    resultsNote:
      "Your results are attached to this email. And remember: if you want to sharpen your technique, you can take the challenge as many times as you like.",
  },
  repeat: (attempt: number) => ({
    intro: `That's ${attempt} rounds of the challenge!`,
    resultsNote:
      "The results of this round are attached. If you want to keep sharpening your technique, you can take the challenge as many times as you like.",
  }),
};

const ASSETS_DIR = join(process.cwd(), "public", "assets");

const LOGO_PNG: Buffer = readFileSync(join(ASSETS_DIR, "opencpr-logo.png"));

/**
 * Inlined rather than pointed at with a file:// URL: Satori loads an image src
 * with fetch, which cannot read local files, so the card would ship without
 * it. Nothing is stored remotely either way; the card and the email's logo
 * both travel with the message as attachments.
 */
const LOGO_DATA_URL = `data:image/png;base64,${LOGO_PNG.toString("base64")}`;

/**
 * Free text off a form ends up in markup, so it is escaped on the way in.
 * Quotes too, so a value stays inert even inside an attribute.
 */
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Tells an admin someone asked for access. Same sender as the magic link, so
 * both portal emails come from one name. The requester's email is free text
 * off the login form, so it is escaped.
 */
const sendAccessRequestNotice = async ({
  adminId,
  requestedAt,
  requesterEmail,
  to,
  url,
}: AccessRequestNoticeJobParams) => {
  try {
    await sendMail({
      to,
      from: { address: env.EMAIL_FROM_ADDRESS, name: "OpenCPR Admin" },
      subject: ACCESS_REQUEST_SUBJECT,
      html: renderTemplate(
        {
          requesterEmail: escapeHtml(requesterEmail),
          requestedAt: format(
            new UTCDate(requestedAt),
            ACCESS_REQUEST_TIME_FORMAT,
          ),
          url,
        },
        ACCESS_REQUEST_TEMPLATE,
      ),
    });
    logger.info({ action: "access_request_notice_sent", adminId });
  } catch (error) {
    logger.error({
      detail: "Error sending access request notice",
      adminId,
      error,
    });
    throw error;
  }
};

const sendResultsEmail = async ({
  attempt,
  locationName,
  participant,
  position,
  session,
}: SendEmailJobParams) => {
  try {
    logger.info(`Preparing email for participant: ${participant.id}`);

    const resultsStats = getResultsStats({ session, position });
    const copy = attempt > 1 ? COPY.repeat(attempt) : COPY.first;

    const imageHtml = renderTemplate(
      {
        ...resultsStats,
        subject: "Results",
        intro: copy.intro,
        logoSrc: LOGO_DATA_URL,
      },
      RESULTS_TEMPLATE,
    );

    logger.info(`Generating results image for session: ${session.id}`);
    const image = await renderResultsCard(imageHtml);

    const emailHtml = renderTemplate(
      {
        recipientName: escapeHtml(participant.firstName),
        subject: EMAIL_SUBJECT,
        ...copy,
      },
      EMAIL_TEMPLATE,
    );

    logger.debug(`Sending email to participant ${participant.id}`);
    await sendMail({
      to: participant.email,
      from: {
        address: env.EMAIL_FROM_ADDRESS,
        name: `OpenCPR @ ${locationName}`,
      },
      subject: EMAIL_SUBJECT,
      html: emailHtml,
      attachments: [
        {
          content: image,
          filename: "cpr-results.png",
          contentType: "image/png",
          cid: "challenge-results",
        },
        {
          content: LOGO_PNG,
          filename: "opencpr-logo.png",
          contentType: "image/png",
          cid: "logo",
        },
      ],
    });
  } catch (error) {
    logger.error({
      detail: `Error sending email to participant ${participant.id}`,
      error,
    });
    throw error;
  }
};

const emailProcessor: Processor<EmailJobData> = async ({ data }) => {
  if (data.kind === EMAIL_JOB_KINDS.accessRequestNotice) {
    await sendAccessRequestNotice(data);
    return;
  }

  // Jobs queued before kinds existed land here too; see EmailJobData.
  await sendResultsEmail(data);
};

export const emailWorker = new Worker<EmailJobData, undefined>(
  EMAIL_QUEUE_NAME,
  emailProcessor,
  { connection: queueConnection },
);

/**
 * Only the last attempt is reported, and only by ids: the job data holds
 * names and email addresses, which must not reach Sentry.
 */
emailWorker.on("failed", (job, error) => {
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) {
    return;
  }

  const kind = job.data.kind ?? EMAIL_JOB_KINDS.results;
  const reportable = toReportableEmailError(error);

  Sentry.withScope((scope) => {
    scope.setTag("email_job_kind", kind);
    scope.setTags(reportable.tags);
    scope.setExtras({
      jobId: job.id,
      attemptsMade: job.attemptsMade,
      ...(job.data.kind === EMAIL_JOB_KINDS.accessRequestNotice
        ? { adminId: job.data.adminId }
        : {
            participantId: job.data.participant.id,
            sessionId: job.data.session.id,
          }),
    });
    Sentry.captureException(reportable.error);
  });
});
