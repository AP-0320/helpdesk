function deriveNameFromEmail(email: string): string {
  const local = email.split('@')[0]
  const name = local
    .replace(/[._\-+]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return name || 'Unknown'
}

export function parseFromAddress(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    const email = match[2].trim().toLowerCase()
    // strip surrounding quotes that some mail clients include, e.g. "John Doe" <…>
    const rawName = match[1].trim().replace(/^"|"$/g, '').trim()
    return { name: rawName || deriveNameFromEmail(email), email }
  }
  const email = from.trim().toLowerCase()
  return { name: deriveNameFromEmail(email), email }
}
