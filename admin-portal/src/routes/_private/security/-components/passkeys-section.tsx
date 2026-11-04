import { useState } from "react";
import { format, parseISO } from "date-fns";

import { RelativeTime } from "@/components/relative-time";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table } from "@/components/ui/table";
import { useEnrollPasskey } from "@/hooks/use-enroll-passkey";
import { type Passkey, usePasskeys } from "@/services/passkeys";
import { RemovePasskeyDialog } from "./remove-passkey-dialog";

export const PasskeysSection = () => {
  const [name, setName] = useState("");
  const [removingPasskey, setRemovingPasskey] = useState<Passkey>();

  const { data: passkeys, isError, isLoading, refetch } = usePasskeys();

  const {
    actions: { enroll },
    isEnrolling,
    isSupported,
  } = useEnrollPasskey({
    onSuccess: () => {
      return setName("");
    },
  });

  return (
    <Card.Root>
      <RemovePasskeyDialog
        passkey={removingPasskey}
        onClose={() => {
          return setRemovingPasskey(undefined);
        }}
      />

      <Card.Header>
        <Card.Title>Passkeys</Card.Title>

        <Card.Description>
          Sign in with your fingerprint, face or screen lock instead of waiting for an email. Each
          passkey stays on the device that created it, so add one per device you use.
        </Card.Description>
      </Card.Header>

      <Card.Content className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : null}

          {isError ? (
            <div className="flex items-center justify-between gap-4">
              <p>Could not load passkeys.</p>

              <Button
                variant="outlined"
                onClick={() => {
                  return refetch();
                }}
              >
                Retry
              </Button>
            </div>
          ) : null}

          {passkeys && !passkeys.length ? (
            <p className="text-sm text-text-default-secondary">You have not added a passkey yet.</p>
          ) : null}

          {passkeys?.length ? (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Name</Table.Head>
                  <Table.Head>Last used</Table.Head>
                  <Table.Head>Added</Table.Head>
                  <Table.Head>
                    <span className="sr-only">Actions</span>
                  </Table.Head>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {passkeys.map((passkey) => {
                  return (
                    <Table.Row key={passkey.id}>
                      <Table.Cell className="font-medium text-text-default-default">
                        {passkey.name}
                      </Table.Cell>

                      <Table.Cell>
                        {passkey.lastUsedAt ? (
                          <RelativeTime date={passkey.lastUsedAt} />
                        ) : (
                          <span className="text-text-default-tertiary">Never used</span>
                        )}
                      </Table.Cell>

                      <Table.Cell>
                        {passkey.createdAt ? format(parseISO(passkey.createdAt), "PP") : "—"}
                      </Table.Cell>

                      <Table.Cell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            return setRemovingPasskey(passkey);
                          }}
                        >
                          Remove
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          ) : null}
        </div>

        {isSupported ? (
          <form
            className="flex flex-col gap-3 border-t border-border-default-default pt-6 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              void enroll(name);
            }}
          >
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="passkey-name">Passkey name</Label>

              <Input
                id="passkey-name"
                placeholder="1Password"
                value={name}
                onChange={(event) => {
                  return setName(event.target.value);
                }}
              />
            </div>

            <Button
              className="shrink-0"
              isLoading={isEnrolling}
              PrefixIcon={<Icons.Plus />}
              type="submit"
            >
              Add passkey
            </Button>
          </form>
        ) : (
          <p className="border-t border-border-default-default pt-6 text-sm text-text-default-secondary">
            This browser does not support passkeys, so you cannot add one here.
          </p>
        )}
      </Card.Content>
    </Card.Root>
  );
};
