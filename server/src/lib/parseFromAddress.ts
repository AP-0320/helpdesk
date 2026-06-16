export function parseFromAddress(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    const name = match[1].trim()
    return { name: name || 'Unknown', email: match[2].trim().toLowerCase() }
  }
  return { name: 'Unknown', email: from.trim().toLowerCase() }
}
