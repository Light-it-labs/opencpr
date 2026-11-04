import { createFileRoute } from "@tanstack/react-router";

import { useTranslation } from "@/i18n";

const TermsPage = () => {
  const { t } = useTranslation();

  return <div>{t("greetings.exactPath", { exactPath: "/terms" })}</div>;
};

export const Route = createFileRoute("/(public)/terms/")({
  component: TermsPage,
});
