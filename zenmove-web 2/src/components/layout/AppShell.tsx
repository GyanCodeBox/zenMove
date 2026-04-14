// src/components/layout/AppShell.tsx
import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore } from '../../store/auth'

export default function AppShell() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/auth" replace />

  return (
    <div className="flex h-full">
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto"
        style={{ marginLeft: 'var(--sidebar-w)' }}
      >
        <Outlet />
      </main>
    </div>
  )
}
