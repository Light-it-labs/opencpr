import { Fragment } from "react";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import type { AvailableRoutesToPath } from "@/config/router";

type BreadcrumbPage = {
  name: string;
  href?: AvailableRoutesToPath;
};

type BreadcrumbsProps = {
  pages: BreadcrumbPage[];
};

export const Breadcrumbs = ({ pages }: BreadcrumbsProps) => {
  const steps: BreadcrumbPage[] = [{ name: "Home", href: "/" }, ...pages];

  return (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;

          return (
            <Fragment key={step.name}>
              <Breadcrumb.Item>
                {step.href && !isLast ? (
                  <Breadcrumb.Link to={step.href}>{step.name}</Breadcrumb.Link>
                ) : (
                  <Breadcrumb.Page>{step.name}</Breadcrumb.Page>
                )}
              </Breadcrumb.Item>

              {isLast ? null : <Breadcrumb.Separator />}
            </Fragment>
          );
        })}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
};
