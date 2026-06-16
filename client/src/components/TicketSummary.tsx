import { useState } from "react"
import { Sparkles, RefreshCw } from "lucide-react"
import axios from "axios"
import { Button } from "@/components/ui/button"

interface Props {
  ticketId: string
}

export function TicketSummary({ ticketId }: Props) {
  const [summary, setSummary] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchSummary() {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await axios.post(
        `/api/tickets/${ticketId}/summarize`,
        {},
        { withCredentials: true }
      )
      setSummary(data.summary)
    } catch {
      setError("Failed to generate summary. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!summary && !isLoading && !error) {
    return (
      <div className="pt-1">
        <Button type="button" variant="outline" size="sm" onClick={fetchSummary}>
          <Sparkles className="size-3.5" />
          Summarize
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground flex items-center gap-1.5">
          <Sparkles className="size-3.5" />
          AI Summary
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={fetchSummary}
          disabled={isLoading}
        >
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Regenerating…" : "Regenerate"}
        </Button>
      </div>

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : isLoading && !summary ? (
        <p className="text-muted-foreground">Generating summary…</p>
      ) : (
        <p className={`text-muted-foreground leading-relaxed ${isLoading ? "opacity-50" : ""}`}>
          {summary}
        </p>
      )}
    </div>
  )
}
