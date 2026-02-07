import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../services/api'

function isUiOnlyMode() {
  const env = import.meta.env as any
  return env?.VITE_UI_ONLY === 'true' || env?.VITE_MOCK_AUTH === 'true'
}

function mockToken(prefix: string) {
  return `${prefix}.${Math.random().toString(36).slice(2)}.${Date.now()}`
}

function mockUserFromRegistration(data: RegisterData): User {
  return {
    id: `mock_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    email: data.email,
    full_name: data.full_name,
    display_name: data.display_name,
    avatar_url: undefined,
    preferred_language: (data.preferred_language as User['preferred_language']) || 'hinglish',
    subscription_tier: 'free',
    credits_remaining: 999,
  }
}

function mockUserFromLogin(email: string): User {
  return {
    id: `mock_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    email,
    full_name: 'Test User',
    display_name: undefined,
    avatar_url: undefined,
    preferred_language: 'hinglish',
    subscription_tier: 'free',
    credits_remaining: 999,
  }
}

interface User {
  id: string
  email: string
  full_name: string
  display_name?: string
  avatar_url?: string
  preferred_language: 'hi' | 'en' | 'hinglish'
  subscription_tier: 'free' | 'starter' | 'pro' | 'enterprise'
  credits_remaining: number
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  refreshAccessToken: () => Promise<void>
  updateUser: (data: Partial<User>) => void
}

interface RegisterData {
  email: string
  password: string
  full_name: string
  display_name?: string
  phone?: string
  preferred_language?: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      
      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login', { email, password })
          const { access_token, refresh_token } = response.data
          
          // Set tokens
          set({
            accessToken: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
          })
          
          // Fetch user profile
          const userResponse = await api.get('/users/me')
          set({ user: userResponse.data })
        } catch (err) {
          // UI-only / dev fallback so the frontend can be tested without backend.
          if (import.meta.env.DEV || isUiOnlyMode()) {
            set({
              accessToken: mockToken('mock_access'),
              refreshToken: mockToken('mock_refresh'),
              isAuthenticated: true,
              user: mockUserFromLogin(email),
            })
          } else {
            throw err
          }
        } finally {
          set({ isLoading: false })
        }
      },
      
      register: async (data: RegisterData) => {
        set({ isLoading: true })
        try {
          await api.post('/auth/register', data)
          // Auto-login after registration
          await get().login(data.email, data.password)
        } catch (err) {
          if (import.meta.env.DEV || isUiOnlyMode()) {
            set({
              accessToken: mockToken('mock_access'),
              refreshToken: mockToken('mock_refresh'),
              isAuthenticated: true,
              user: mockUserFromRegistration(data),
            })
          } else {
            throw err
          }
        } finally {
          set({ isLoading: false })
        }
      },
      
      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },
      
      refreshAccessToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) {
          get().logout()
          return
        }
        
        try {
          const response = await api.post('/auth/refresh', {
            refresh_token: refreshToken,
          })
          set({ accessToken: response.data.access_token })
        } catch {
          get().logout()
        }
      },
      
      updateUser: (data: Partial<User>) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, ...data } })
        }
      },
    }),
    {
      name: 'contentkaro-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
)
