import { createFileRoute } from "@tanstack/react-router";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Header } from "@/components/header";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { PasskeysSection } from "./-components/passkeys-section";

const SecurityPage = () => {
  return (
    <LayoutWrapper>
      <Header.Root>
        <Breadcrumbs pages={[{ name: "Security" }]} />

        <Header.Content>
          <Header.Title>Security</Header.Title>
        </Header.Content>
      </Header.Root>

      <PasskeysSection />
    </LayoutWrapper>
  );
};

export const Route = createFileRoute("/_private/security/")({ component: SecurityPage });
