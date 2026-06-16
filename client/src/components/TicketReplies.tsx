import { useState } from 'react'
import DOMPurify from 'dompurify'
import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Reply {
  id: string
  body: string
  bodyHtml: string | null
  userType: 'AGENT' | 'CUSTOMER'
  createdAt: string
  user: { id: string; name: string } | null
}

interface Props {
  replies: Reply[]
  fromName: string
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return rtf.format(-days, 'day')
  if (hours > 0) return rtf.format(-hours, 'hour')
  if (minutes > 0) return rtf.format(-minutes, 'minute')
  return 'just now'
}

function ReplyBubble({ reply, fromName }: { reply: Reply; fromName: string }) {
  const [open, setOpen] = useState(true)
  const isAgent = reply.userType === 'AGENT'
  const name = isAgent ? (reply.user?.name ?? 'Agent') : fromName
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className={`rounded-xl border ${isAgent ? 'bg-primary/5 border-primary/15' : 'bg-muted/30 border-border'}`}>
      {/* Header — always visible, acts as toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left cursor-pointer"
      >
        <div
          className={`size-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
            isAgent ? 'bg-primary/15 text-primary' : 'bg-muted-foreground/15 text-muted-foreground'
          }`}
        >
          {initial}
        </div>
        <span className="text-sm font-medium leading-none">{name}</span>
        {!isAgent && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 leading-none">
            Customer
          </Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {relativeTime(reply.createdAt)}
        </span>
        <ChevronDown
          className={`size-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
      </button>

      {/* Body — collapsible */}
      {open && (
        <div className="px-4 pb-4 pl-[3.25rem]">
          {reply.bodyHtml ? (
            <div
              className="text-sm leading-relaxed text-foreground/90"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reply.bodyHtml) }}
            />
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {reply.body}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function TicketReplies({ replies, fromName }: Props) {
  if (replies.length === 0) return null

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span className="uppercase tracking-wider font-medium">
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {replies.map((reply) => (
        <ReplyBubble key={reply.id} reply={reply} fromName={fromName} />
      ))}
    </div>
  )
}
