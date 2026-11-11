import { logger } from "@/config";

import { Sentry } from "../../config/sentry";
import { EMAIL_QUEUE_NAME } from "../queue/config";
import {
  AccessRequestNoticeJobParams,
  EMAIL_JOB_KINDS,
  emailQueue,
  SendEmailJobParams,
} from "../queue/queue.service";

export const EmailService = {
  sendResults: async (params: SendEmailJobParams) => {
    try {
      await emailQueue.add(EMAIL_QUEUE_NAME, {
        kind: EMAIL_JOB_KINDS.results,
        ...params,
      });
    } catch (error) {
      logger.error("Error sending email:", error);
      Sentry.captureException(error);
    }
  },

  /**
   * Queued rather than sent inline: nobody is waiting on it, and the caller
   * is the login endpoint, which must answer in the same time for every email.
   * A failure to queue is logged and swallowed for the same reason.
   */
  /** Resolves to whether the job was queued; a failure is logged, not thrown. */
  sendAccessRequestNotice: async (
    params: AccessRequestNoticeJobParams,
  ): Promise<boolean> => {
    try {
      await emailQueue.add(EMAIL_QUEUE_NAME, {
        kind: EMAIL_JOB_KINDS.accessRequestNotice,
        ...params,
      });

      return true;
    } catch (error) {
      logger.error({
        detail: `Error queueing access request notice to ${params.to}`,
        error,
      });
      Sentry.captureException(error);

      return false;
    }
  },
};
