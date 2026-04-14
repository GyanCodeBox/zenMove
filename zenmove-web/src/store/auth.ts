// src/store/auth.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../services/api'

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  isAuthenticated: boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        localStorage.setItem('zm_token', token)
        set({ user, token, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('zm_token')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    { name: 'zm_auth', partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }) },
  ),
)
