import { useEffect, useRef } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { HttpStatusCode, isAxiosError } from "axios";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useVerifyMagicLink } from "@/services/auth";
import { redirectTarget } from "@/utils/redirect-target";

type MagicLinkConsumeProps = {
  token: string;
};

const INVALID_LINK_STATUSES: number[] = [HttpStatusCode.BadRequest, HttpStatusCode.Unauthorized];

export const MagicLinkConsume = ({ token }: MagicLinkConsumeProps) => {
  const navigate = useNavigate();
  const search = useSearch({ from: "/(public)/_guest/login/" });
  const lastVerifiedTokenRef = useRef<string | null>(null);

  const {
    error,
    isError,
    mutate: verifyMagicLink,
  } = useVerifyMagicLink({
    onSuccess: async (user) => {
      await navigate({
        ...(user.passkeysCount === 0
          ? { to: "/secure-access", search: { redirect: search.redirect } }
          : redirectTarget(search.redirect)),
        replace: true,
      });
    },
  });

  useEffect(() => {
    if (lastVerifiedTokenRef.current === token) {
      return;
    }

    lastVerifiedTokenRef.current = token;
    verifyMagicLink({ token });
  }, [token, verifyMagicLink]);

  if (isError) {
    const isInvalidLink =
      isAxiosError(error) &&
      error.response !== undefined &&
      INVALID_LINK_STATUSES.includes(error.response.status);

    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm">
          {isInvalidLink
            ? "This login link is invalid or has expired."
            : "Something went wrong. Please try again."}
        </p>

        <Button size="sm" variant="outlined" asChild>
          <Link to="/login">Back to login</Link>
        </Button>
      </div>
    );
  }

  return <Icons.LoaderCircle className="size-8 animate-spin" />;
};
