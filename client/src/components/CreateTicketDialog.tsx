import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { createTicketSchema, type CreateTicketData } from "@helpdesk/core"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface CreateTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CreateTicketDialog({ open, onOpenChange }: CreateTicketDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateTicketData>({
    resolver: zodResolver(createTicketSchema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateTicketData) =>
      axios.post("/api/tickets", data, { withCredentials: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      onOpenChange(false)
      reset()
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setError("root", {
          message: err.response?.data?.error ?? "Something went wrong",
        })
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New ticket</DialogTitle>
          <DialogDescription>
            Submit a ticket on behalf of a customer. It will be automatically classified and resolved if the knowledge base covers the question.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutate(data))} noValidate className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-from-name">Customer name</Label>
            <Input
              id="ticket-from-name"
              type="text"
              placeholder="Jane Smith"
              aria-invalid={!!errors.fromName}
              {...register("fromName")}
            />
            {errors.fromName && (
              <p className="text-xs text-destructive">{errors.fromName.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-from-email">Customer email</Label>
            <Input
              id="ticket-from-email"
              type="email"
              placeholder="jane@example.com"
              aria-invalid={!!errors.fromEmail}
              {...register("fromEmail")}
            />
            {errors.fromEmail && (
              <p className="text-xs text-destructive">{errors.fromEmail.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-subject">Subject</Label>
            <Input
              id="ticket-subject"
              type="text"
              placeholder="How do I reset my password?"
              aria-invalid={!!errors.subject}
              {...register("subject")}
            />
            {errors.subject && (
              <p className="text-xs text-destructive">{errors.subject.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-body">Message</Label>
            <Textarea
              id="ticket-body"
              placeholder="Describe the issue…"
              rows={4}
              aria-invalid={!!errors.body}
              {...register("body")}
            />
            {errors.body && (
              <p className="text-xs text-destructive">{errors.body.message}</p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange(false); reset() }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting…" : "Submit ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
