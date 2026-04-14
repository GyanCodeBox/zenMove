// src/components/layout/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, LogOut, Truck, FileText, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../store/auth'

const NAV = [
  { to: '/moves', icon: LayoutDashboard, label: 'My Moves' },
  { to: '/moves/new', icon: Truck, label: 'New Move' },
  { to: '/packer', icon: Package, label: 'Packer View' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/auth')
  }

  return (
    <aside
      className="grain fixed left-0 top-0 h-full flex flex-col overflow-hidden z-20"
      style={{
        width: 'var(--sidebar-w)',
        background: 'var(--navy)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Logo */}
      <div className="px-6 py-7 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm"
            style={{ background: 'var(--amber)' }}
          >
            ZM
          </div>
          <div>
            <p className="font-display font-semibold text-white text-sm leading-none">ZenMove</p>
            <p className="text-white/40 text-[10px] mt-0.5 font-body">Trust-Tech Logistics</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all group
               ${isActive
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-amber-500' : ''} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={12} className="text-white/30" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-display font-semibold shrink-0"
            style={{ background: 'var(--teal)' }}
          >
            {user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.full_name}</p>
            <p className="text-white/40 text-[10px] truncate">{user?.phone}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-white/30 hover:text-red-400 transition-colors p-1 rounded"
            title="Log out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
