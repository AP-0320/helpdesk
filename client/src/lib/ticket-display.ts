import { TicketStatus, TicketCategory } from '@helpdesk/core'

export const STATUS_VARIANT: Record<TicketStatus, 'default' | 'secondary' | 'outline'> = {
  [TicketStatus.NEW]:        'outline',
  [TicketStatus.PROCESSING]: 'outline',
  [TicketStatus.OPEN]:       'default',
  [TicketStatus.RESOLVED]:   'secondary',
  [TicketStatus.CLOSED]:     'outline',
}

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  [TicketCategory.GENERAL_QUESTION]: 'General Question',
  [TicketCategory.TECHNICAL_ISSUE]:  'Technical Issue',
  [TicketCategory.REFUND_REQUEST]:   'Refund Request',
}
