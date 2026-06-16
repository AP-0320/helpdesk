import DOMPurify from 'dompurify'

interface Props {
  fromName: string
  fromEmail: string
  toEmail: string
  createdAt: string
  body: string
  bodyHtml?: string | null
}

export function TicketBasicDetails({ fromName, fromEmail, toEmail, createdAt, body, bodyHtml }: Props) {
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div>
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">From</dt>
          <dd>
            <span className="font-medium">{fromName}</span>{" "}
            <span className="text-muted-foreground">&lt;{fromEmail}&gt;</span>
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">To</dt>
          <dd className="text-muted-foreground">{toEmail}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Received</dt>
          <dd className="text-muted-foreground">
            {new Date(createdAt).toLocaleString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </dd>
        </div>
      </dl>

      <hr className="border-border" />

      {bodyHtml ? (
        <div
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyHtml) }}
        />
      ) : (
        <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{body}</pre>
      )}
    </div>
  )
}
