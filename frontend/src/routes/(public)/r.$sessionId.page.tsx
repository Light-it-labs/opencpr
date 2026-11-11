import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { twMerge } from "tailwind-merge";

import { Logo } from "@/components/logo";
import { Button, Checkbox, Label } from "@/components/ui";
import { claimSessionSchema, useClaimCprSession } from "@/services/cpr-sessions";

/**
 * Opened on the participant's own phone by scanning the kiosk QR. All typing
 * happens here, on their keyboard, so the kiosk never needs one and email
 * addresses arrive without shared-touchscreen typos.
 *
 * The route is deliberately mobile-first and independent of the kiosk: it does
 * not read the serial port, the session store, or anything kiosk-specific.
 */
const RouteComponent = () => {
  const { sessionId } = Route.useParams();
  const { t } = useTranslation();

  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [hasConsented, setHasConsented] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [claimedName, setClaimedName] = useState<string | null>(null);

  const result = claimSessionSchema.safeParse(values);

  /**
   * Which fields to outline in red. Taken from the schema's own issues so a new
   * field cannot be added without its validation being reflected here.
   */
  const invalidFields = new Set(
    result.success
      ? []
      : result.error.issues.map((issue) => {
          return String(issue.path[0]);
        }),
  );

  const fieldClassName = (field: keyof typeof values) => {
    return twMerge(
      "min-h-12 rounded-xl border-2 border-border bg-card px-4 text-base text-foreground caret-primary placeholder:text-muted-foreground",
      showErrors && invalidFields.has(field) ? "border-destructive" : "",
    );
  };
  const { isPending, mutate } = useClaimCprSession({
    onSuccess: (_data, variables) => {
      setClaimedName(variables.firstName);
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!hasConsented) {
      return;
    }

    if (!result.success) {
      setShowErrors(true);

      return;
    }

    mutate({ publicId: sessionId, ...result.data });
  };

  if (claimedName) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          {t("claim.doneTitle", { name: claimedName })}
        </h1>
        <p className="text-lg text-muted-foreground">{t("claim.doneBody")}</p>
      </main>
    );
  }

  return (
    <main data-phone-page>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 p-6">
        <Logo className="self-center" />

        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-bold text-foreground">{t("claim.title")}</h1>
          <p className="text-lg text-muted-foreground">{t("claim.subtitle")}</p>
        </div>

        {/* Redacted in session replays: this runs on the participant's phone
          and is the only place personal data is entered. */}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} data-sentry-mask>
          {/* Paired on one row: on a phone the two name fields are short and
            splitting them costs a scroll on the smallest screens. */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5" htmlFor="firstName">
              <span className="text-base font-semibold text-foreground">{t("register.name")}</span>
              <input
                autoCapitalize="words"
                autoComplete="given-name"
                className={fieldClassName("firstName")}
                enterKeyHint="next"
                id="firstName"
                name="firstName"
                onChange={(event) => {
                  return setValues((previous) => {
                    return { ...previous, firstName: event.target.value };
                  });
                }}
                placeholder={t("register.namePlaceholder")}
                type="text"
                value={values.firstName}
              />
            </label>

            <label className="flex flex-col gap-1.5" htmlFor="lastName">
              <span className="text-base font-semibold text-foreground">
                {t("register.lastName")}
              </span>
              <input
                autoCapitalize="words"
                autoComplete="family-name"
                className={fieldClassName("lastName")}
                enterKeyHint="next"
                id="lastName"
                name="lastName"
                onChange={(event) => {
                  return setValues((previous) => {
                    return { ...previous, lastName: event.target.value };
                  });
                }}
                placeholder={t("register.lastNamePlaceholder")}
                type="text"
                value={values.lastName}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5" htmlFor="email">
            <span className="text-base font-semibold text-foreground">{t("register.email")}</span>
            <input
              autoCapitalize="off"
              autoComplete="email"
              autoCorrect="off"
              className={fieldClassName("email")}
              enterKeyHint="go"
              id="email"
              inputMode="email"
              name="email"
              onChange={(event) => {
                return setValues((previous) => {
                  return { ...previous, email: event.target.value };
                });
              }}
              placeholder={t("register.emailPlaceholder")}
              spellCheck={false}
              type="email"
              value={values.email}
            />
          </label>

          {showErrors && !result.success ? (
            <p className="text-sm text-destructive">{t("claim.invalid")}</p>
          ) : null}

          <div className="flex items-start gap-2.5">
            <Checkbox
              checked={hasConsented}
              className="mt-0.5 size-5 border-2"
              id="consent"
              onCheckedChange={(checked) => {
                setHasConsented(checked === true);
              }}
            />
            <Label
              className="text-xs leading-snug font-normal text-muted-foreground"
              htmlFor="consent"
            >
              {t("claim.consent")}
            </Label>
          </div>

          <Button disabled={!hasConsented} isLoading={isPending} size="lg" type="submit">
            {t("claim.submit")}
          </Button>
        </form>
      </div>
    </main>
  );
};

export const Route = createFileRoute("/(public)/r/$sessionId/")({
  component: RouteComponent,
});
