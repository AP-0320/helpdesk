import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Bot, CircleAlert, Clock, Percent, Ticket } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardStats {
  totalTickets: number
  openTickets: number
  aiResolvedTickets: number
  aiResolvedPercent: number
  avgResolutionTimeMs: number | null
  ticketsPerDay: { date: string; count: number }[]
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

function StatCard({ label, icon: Icon, value }: { label: string; icon: React.ElementType; value: string | number | undefined }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold font-heading">{value ?? '—'}</p>
      </CardContent>
    </Card>
  )
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-3.5 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mt-1" />
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await axios.get<DashboardStats>('/api/stats', { withCredentials: true })
      return data
    },
  })

  const cards = [
    { label: 'Total Tickets', icon: Ticket, value: stats?.totalTickets },
    { label: 'Open Tickets', icon: CircleAlert, value: stats?.openTickets },
    { label: 'AI Resolved', icon: Bot, value: stats?.aiResolvedTickets },
    { label: 'AI Resolution Rate', icon: Percent, value: stats ? `${stats.aiResolvedPercent}%` : undefined },
    {
      label: 'Avg Resolution Time',
      icon: Clock,
      value: stats?.avgResolutionTimeMs != null ? formatDuration(stats.avgResolutionTimeMs) : '—',
    },
  ]

  return (
    <div className="space-y-6">
{error && (
        <p className="text-sm text-destructive">Failed to load stats. Please refresh.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold font-heading">Tickets per day — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats?.ticketsPerDay} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v + 'T00:00:00')
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }}
                  interval={4}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-popover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--color-popover-foreground)',
                  }}
                  formatter={(value: number) => [value, 'Tickets']}
                  labelFormatter={(label: string) => {
                    const d = new Date(label + 'T00:00:00')
                    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} className="fill-primary" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
