import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketStatus, TicketCategory, type UpdateTicketData } from "@helpdesk/core";
import { TicketBasicDetails } from "@/components/TicketBasicDetails";
import { TicketReplies } from "@/components/TicketReplies";
import { ReplyComposer } from "@/components/ReplyComposer";
import { TicketSidebarControls } from "@/components/TicketSidebarControls"
import { TicketSummary } from "@/components/TicketSummary";

interface Agent {
  id: string;
  name: string;
  email: string;
}

interface Reply {
  id: string;
  body: string;
  bodyHtml: string | null;
  userType: 'AGENT' | 'CUSTOMER';
  createdAt: string;
  user: { id: string; name: string } | null;
}

interface TicketDetail {
  id: string;
  subject: string;
  body: string;
  bodyHtml: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  status: TicketStatus;
  category: TicketCategory | null;
  assignedId: string | null;
  assignee: Agent | null;
  createdAt: string;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const { data } = await axios.get<TicketDetail>(`/api/tickets/${id}`, {
        withCredentials: true,
      });
      return data;
    },
    enabled: !!id,
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data } = await axios.get<Agent[]>("/api/agents", {
        withCredentials: true,
      });
      return data;
    },
  });

  const { data: replies = [] } = useQuery<Reply[]>({
    queryKey: ["replies", id],
    queryFn: async () => {
      const { data } = await axios.get<Reply[]>(`/api/tickets/${id}/replies`, {
        withCredentials: true,
      });
      return data;
    },
    enabled: !!id,
  });

  const { mutate: updateTicket, isPending: isUpdating } = useMutation({
    mutationFn: async (patch: UpdateTicketData) => {
      const { data } = await axios.patch(`/api/tickets/${id}`, patch, {
        withCredentials: true,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", id] }),
  });

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/tickets" aria-label="Back to tickets">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>

      <div className="flex flex-col-reverse gap-4 md:grid md:grid-cols-[1fr_168px] md:items-start">
        {/* Left column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4 border-b">
              {isLoading ? (
                <Skeleton className="h-7 w-2/3" />
              ) : (
                <h1 className="text-xl font-semibold leading-snug">{ticket?.subject}</h1>
              )}
            </CardHeader>

            <CardContent className="pt-6">
              {error && (
                <p className="text-sm text-destructive">{error.message}</p>
              )}

              {isLoading && (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-32 w-full mt-4" />
                </div>
              )}

              {ticket && (
                <TicketBasicDetails
                  fromName={ticket.fromName}
                  fromEmail={ticket.fromEmail}
                  toEmail={ticket.toEmail}
                  createdAt={ticket.createdAt}
                  body={ticket.body}
                  bodyHtml={ticket.bodyHtml}
                />
              )}
            </CardContent>
          </Card>

          {ticket && (
            <>
              <TicketSummary ticketId={id!} />
              <Card>
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="text-base">Replies</CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <ReplyComposer ticketId={id!} customerName={ticket.fromName} />
                  <TicketReplies replies={[...replies].reverse()} fromName={ticket.fromName} />
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Right column (sidebar) */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            ))
          ) : ticket ? (
            <TicketSidebarControls
              status={ticket.status}
              category={ticket.category}
              assignedId={ticket.assignedId}
              agents={agents}
              isUpdating={isUpdating}
              onUpdate={updateTicket}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
