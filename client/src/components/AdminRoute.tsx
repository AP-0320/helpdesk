import { Navigate, Outlet } from "react-router-dom"
import { authClient } from "../lib/auth-client"

export default function AdminRoute() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return null
  if (session?.user.role !== "ADMIN") return <Navigate to="/dashboard" replace />
  return <Outlet />
}
