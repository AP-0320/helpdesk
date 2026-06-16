import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import TicketsTable from "@/components/TicketsTable"

export default function TicketsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tickets</CardTitle>
        <CardDescription>All support tickets received by email</CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <TicketsTable />
      </CardContent>
    </Card>
  )
}
