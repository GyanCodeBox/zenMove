// src/components/layout/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Truck, ChevronRight, HardHat } from 'lucide-react'
import { useAuthStore } from '../../store/auth'

const CUSTOMER_NAV = [
  { to: '/moves',     icon: LayoutDashboard, label: 'My Moves'  },
  { to: '/moves/new', icon: Truck,           label: 'New Move'  },
]

const PACKER_NAV = [
  { to: '/packer', icon: HardHat, label: 'Packer View' },
]

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/packer'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all
         ${isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} className={isActive ? 'text-amber-400' : ''} />
          <span className="flex-1">{label}</span>
          {isActive && <ChevronRight size={12} className="text-white/30" />}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <aside
      className="grain fixed left-0 top-0 h-full flex flex-col overflow-hidden z-20"
      style={{ width: 'var(--sidebar-w)', background: 'var(--navy)', borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Logo */}
      <div className="px-6 py-7 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm" style={{ background: 'var(--amber)' }}>
            ZM
          </div>
          <div>
            <p className="font-display font-semibold text-white text-sm leading-none">ZenMove</p>
            <p className="text-white/40 text-[10px] mt-0.5 font-body">Trust-Tech Logistics</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto">
        {/* Customer section */}
        <div>
          <p className="px-3 mb-1.5 text-[10px] font-body font-medium uppercase tracking-widest text-white/25">
            Customer
          </p>
          <div className="space-y-1">
            {CUSTOMER_NAV.map(item => <NavItem key={item.to} {...item} />)}
          </div>
        </div>

        {/* Packer section */}
        <div>
          <p className="px-3 mb-1.5 text-[10px] font-body font-medium uppercase tracking-widest text-white/25">
            Packer
          </p>
          <div className="space-y-1">
            {PACKER_NAV.map(item => <NavItem key={item.to} {...item} />)}
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-display font-semibold shrink-0" style={{ background: 'var(--teal)' }}>
            {user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.full_name}</p>
            <p className="text-white/40 text-[10px] truncate">{user?.phone}</p>
          </div>
          <button onClick={() => { logout(); navigate('/auth') }} className="text-white/30 hover:text-red-400 transition-colors p-1 rounded" title="Log out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
