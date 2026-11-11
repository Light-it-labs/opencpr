import { Queue } from "bullmq";

import { CprSession, Participant } from "@/schemas";

import { JOB_SETTINGS } from "../../jobs/config";
import { EMAIL_QUEUE_NAME, queueConnection } from "./config";

/**
 * Tells the worker which message a job carries. Lives in the job data rather
 * than the job name so the payload types follow from it.
 */
export const EMAIL_JOB_KINDS = {
  results: "results",
  accessRequestNotice: "access-request-notice",
} as const;

export type SendEmailJobParams = {
  participant: Participant;
  session: CprSession;
  position: number;
  /** Venue this run happened at, used as the sender name. */
  locationName: string;
  /** Which go this was for this person. Anything above 1 gets the repeat copy. */
  attempt: number;
};

export type AccessRequestNoticeJobParams = {
  /** The admin this copy goes to; one job per admin. */
  adminId: string;
  to: string;
  requesterEmail: string;
  /** ISO 8601: jobs travel as JSON, so a Date would arrive as a string anyway. */
  requestedAt: string;
  /** Where the admin reviews the request. */
  url: string;
};

/**
 * Jobs queued before `kind` existed carry none and are results emails, so the
 * worker treats a missing kind as results rather than failing them.
 */
export type EmailJobData =
  | ({ kind: typeof EMAIL_JOB_KINDS.results } & SendEmailJobParams)
  | ({
      kind: typeof EMAIL_JOB_KINDS.accessRequestNotice;
    } & AccessRequestNoticeJobParams);

export const emailQueue = new Queue<EmailJobData, undefined>(EMAIL_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: JOB_SETTINGS,
});
