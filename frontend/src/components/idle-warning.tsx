import { useTranslation } from "react-i18next";

type IdleWarningProps = {
  /** Whole seconds remaining, or null when there is nothing to warn about. */
  secondsLeft: number | null;
};

/**
 * Shown while the inactivity timer is about to reset the kiosk. Any touch, key
 * or compression cancels it, so this is a prompt rather than an announcement.
 */
export const IdleWarning = ({ secondsLeft }: IdleWarningProps) => {
  const { t } = useTranslation();

  if (secondsLeft === null) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-50 bg-secondary px-8 py-5 text-center text-3xl font-bold text-secondary-foreground">
      {t("challenge.messages.idleWarning", { seconds: secondsLeft })}
    </div>
  );
};
