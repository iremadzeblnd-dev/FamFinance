import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService, type AuthUser, type RegistrationResult } from '../services/authService'

interface AuthContextValue {
  user: AuthUser | null
  checking: boolean
  configured: boolean
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>
  register: (fullName: string, email: string, password: string) => Promise<RegistrationResult>
  resendConfirmation: (email: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(authService.configured)

  useEffect(() => {
    if (!authService.configured) return
    let active = true
    let unsubscribe: () => void = () => undefined
    void authService.subscribe((current) => { if (active) { setUser(current); setChecking(false) } }).then((stop) => { if (active) unsubscribe = stop; else stop() })
    authService.session().then((current) => { if (active) setUser(current) }).catch(() => { if (active) setUser(null) }).finally(() => { if (active) setChecking(false) })
    return () => { active = false; unsubscribe() }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    checking,
    configured: authService.configured,
    login: async (email, password, rememberMe) => { const current = await authService.login(email, password, rememberMe); setUser(current) },
    register: async (fullName, email, password) => {
      const result = await authService.register(fullName, email, password)
      if (!result.requiresEmailConfirmation) setUser(await authService.session())
      return result
    },
    resendConfirmation: authService.resendConfirmation,
    forgotPassword: authService.forgotPassword,
    updatePassword: authService.updatePassword,
    logout: async () => { await authService.logout(); setUser(null) },
  }), [checking, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
