import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createReplySchema, type CreateReplyData } from "@helpdesk/core"

interface Props {
  ticketId: string
  customerName: string
}

export function ReplyComposer({ ticketId, customerName }: Props) {
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<CreateReplyData>({ resolver: zodResolver(createReplySchema) })

  const bodyValue = watch('body')
  const [isPolishing, setIsPolishing] = useState(false)

  async function handlePolish() {
    const text = getValues('body')
    if (!text?.trim()) return
    setIsPolishing(true)
    try {
      const { data } = await axios.post(
        `/api/tickets/polish-reply`,
        { text, customerName },
        { withCredentials: true }
      )
      setValue('body', data.polishedText, { shouldValidate: true })
    } catch {
      setError('root', { message: 'Failed to polish reply. Please try again.' })
    } finally {
      setIsPolishing(false)
    }
  }

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: CreateReplyData) => {
      const { data: reply } = await axios.post(
        `/api/tickets/${ticketId}/replies`,
        data,
        { withCredentials: true }
      )
      return reply
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["replies", ticketId] })
      reset()
      setShowForm(false)
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setError("root", {
          message: err.response?.data?.error ?? "Something went wrong",
        })
      }
    },
  })

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="w-full text-left rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 hover:border-ring/40 transition-colors cursor-text"
      >
        Write a reply…
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <form onSubmit={handleSubmit((data) => mutate(data))} noValidate>
        <textarea
          rows={5}
          placeholder="Write your reply…"
          aria-label="Reply body"
          aria-invalid={!!errors.body}
          className="w-full px-4 pt-4 pb-2 text-sm leading-relaxed bg-transparent resize-none outline-none placeholder:text-muted-foreground disabled:opacity-50"
          disabled={isPending || isPolishing}
          {...register("body")}
        />

        {(errors.body || errors.root) && (
          <div className="px-4 pb-2 space-y-1">
            {errors.body && (
              <p className="text-xs text-destructive">{errors.body.message}</p>
            )}
            {errors.root && (
              <p className="text-xs text-destructive">{errors.root.message}</p>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border bg-muted/20">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            disabled={isPending || isPolishing || !bodyValue?.trim()}
            onClick={handlePolish}
          >
            <Sparkles className="size-3.5" />
            {isPolishing ? 'Polishing…' : 'Polish'}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={isPending}
              onClick={() => { setShowForm(false); reset() }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending || isPolishing}>
              <Send className="size-3.5" />
              {isPending ? 'Sending…' : 'Send reply'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
