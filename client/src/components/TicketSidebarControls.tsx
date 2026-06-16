import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TicketStatus, TicketCategory, type UpdateTicketData } from "@helpdesk/core"
import { CATEGORY_LABEL } from "@/lib/ticket-display"

interface Agent {
  id: string
  name: string
}

interface Props {
  status: TicketStatus
  category: TicketCategory | null
  assignedId: string | null
  agents: Agent[]
  isUpdating: boolean
  onUpdate: (patch: UpdateTicketData) => void
}

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: TicketStatus.OPEN,     label: "Open" },
  { value: TicketStatus.RESOLVED, label: "Resolved" },
  { value: TicketStatus.CLOSED,   label: "Closed" },
]

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: TicketCategory.GENERAL_QUESTION, label: CATEGORY_LABEL[TicketCategory.GENERAL_QUESTION] },
  { value: TicketCategory.TECHNICAL_ISSUE,  label: CATEGORY_LABEL[TicketCategory.TECHNICAL_ISSUE] },
  { value: TicketCategory.REFUND_REQUEST,   label: CATEGORY_LABEL[TicketCategory.REFUND_REQUEST] },
]

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      {children}
    </div>
  )
}

export function TicketSidebarControls({ status, category, assignedId, agents, isUpdating, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <SidebarField label="Status">
        <Select
          value={status}
          onValueChange={(v) => onUpdate({ status: v as TicketStatus })}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SidebarField>

      <SidebarField label="Category">
        <Select
          value={category ?? "none"}
          onValueChange={(v) => onUpdate({ category: v === "none" ? null : v as TicketCategory })}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="No category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-muted-foreground">
              No category
            </SelectItem>
            {CATEGORY_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SidebarField>

      <SidebarField label="Assigned to">
        <Select
          value={assignedId ?? "unassigned"}
          onValueChange={(v) => onUpdate({ assignedId: v === "unassigned" ? null : v })}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned" className="text-muted-foreground">
              Unassigned
            </SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SidebarField>
    </div>
  )
}
