import { useState } from "react";

import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { type AccessRequest, useAccessRequests } from "@/services/access-requests";
import { useCanManage } from "@/services/auth";
import { useAccessRequestsTable } from "../-hooks/use-access-requests-table";
import { ApproveAccessRequestDialog } from "./approve-access-request-dialog";
import { RejectAccessRequestDialog } from "./reject-access-request-dialog";

export const AccessRequestsSection = () => {
  const [approvingRequest, setApprovingRequest] = useState<AccessRequest>();
  const [rejectingRequest, setRejectingRequest] = useState<AccessRequest>();

  const canManage = useCanManage();
  const { data } = useAccessRequests();

  const table = useAccessRequestsTable({
    canManage,
    data: data ?? [],
    onApprove: setApprovingRequest,
    onReject: setRejectingRequest,
  });

  return (
    <>
      <ApproveAccessRequestDialog
        request={approvingRequest}
        onClose={() => {
          return setApprovingRequest(undefined);
        }}
      />

      <RejectAccessRequestDialog
        request={rejectingRequest}
        onClose={() => {
          return setRejectingRequest(undefined);
        }}
      />

      {data?.length ? (
        <Card.Root>
          <Card.Header>
            <Card.Title>Access requests</Card.Title>

            <Card.Description>
              People without an account who asked for a sign-in link. Approving one creates their
              account and emails them a sign-in link.
            </Card.Description>
          </Card.Header>

          <Card.Content>
            <DataTable table={table} />
          </Card.Content>
        </Card.Root>
      ) : null}
    </>
  );
};
