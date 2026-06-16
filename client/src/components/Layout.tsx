import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Headphones, LayoutDashboard, LogOut, Menu, Moon, Sun, Ticket, Users2, X } from 'lucide-react'
import { authClient } from '../lib/auth-client'
import { useTheme } from './ThemeProvider'

export default function Layout() {
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAdmin = session?.user.role === 'ADMIN'
  const userName = session?.user.name ?? ''
  const userInitial = userName.charAt(0).toUpperCase() || '?'

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => navigate('/login') },
    })
  }

  const navItem =
    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent aria-[current=page]:text-foreground aria-[current=page]:bg-accent cursor-pointer'

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border flex-shrink-0">
        <div className="size-7 rounded-[7px] bg-primary flex items-center justify-center flex-shrink-0">
          <Headphones className="size-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-foreground font-heading tracking-tight">
          Helpdesk
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        <NavLink to="/dashboard" className={navItem} onClick={() => setMobileOpen(false)}>
          <LayoutDashboard className="size-4 flex-shrink-0" />
          Dashboard
        </NavLink>
        <NavLink to="/tickets" className={navItem} onClick={() => setMobileOpen(false)}>
          <Ticket className="size-4 flex-shrink-0" />
          Tickets
        </NavLink>
        {isAdmin && (
          <NavLink to="/users" className={navItem} onClick={() => setMobileOpen(false)}>
            <Users2 className="size-4 flex-shrink-0" />
            Users
          </NavLink>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border flex flex-col gap-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full cursor-pointer"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="size-4 flex-shrink-0" /> : <Moon className="size-4 flex-shrink-0" />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="size-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary leading-none">{userInitial}</span>
          </div>
          <span className="text-sm text-foreground font-medium truncate flex-1">{userName}</span>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full cursor-pointer"
        >
          <LogOut className="size-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 bg-sidebar border-r border-border">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-sidebar border-r border-border flex flex-col md:hidden transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-border bg-background/90 backdrop-blur-md">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-[6px] bg-primary flex items-center justify-center">
              <Headphones className="size-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground font-heading tracking-tight">
              Helpdesk
            </span>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 md:px-10 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
