import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard,
  FileText,
  DoorOpen,
  Monitor,
  ShieldBan,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: '대시보드', end: true },
  { to: '/admin/approvals', icon: FileText, label: '기안서 관리', end: false },
  { to: '/admin/entries', icon: DoorOpen, label: '출입 기록', end: false },
  { to: '/admin/pcs', icon: Monitor, label: 'PC 관리', end: false },
  { to: '/admin/blocked-domains', icon: ShieldBan, label: '차단 도메인', end: false },
]

export function AdminLayout() {
  const { signOut, user } = useAuth()

  return (
    <div className="flex h-screen bg-background">
      <aside className="flex w-64 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <Monitor className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold text-foreground">PC Lab Admin</h1>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-2 px-3 text-xs text-muted-foreground truncate">
            {user?.email}
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
