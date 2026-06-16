import { startClassifyWorker } from './lib/classifyWorker'
import { startAutoResolveWorker } from './lib/autoResolveWorker'
import { startEmailWorker } from './lib/emailWorker'

export { enqueueClassifyTicket } from './lib/classifyWorker'
export { enqueueAutoResolveTicket } from './lib/autoResolveWorker'
export { enqueueReplyEmail } from './lib/emailWorker'

export async function startWorkers(): Promise<void> {
  await startClassifyWorker()
  await startAutoResolveWorker()
  await startEmailWorker()
}
