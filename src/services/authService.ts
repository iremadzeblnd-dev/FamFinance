import type { User } from '@supabase/supabase-js'

export interface AuthUser { id: string; fullName: string; email: string }
export class AuthConfigurationError extends Error {}

const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
const loadClient = async () => {
  if (!configured) throw new AuthConfigurationError('Supabase Auth is not configured.')
  return import('./supabaseClient')
}
const toAuthUser = (user: User): AuthUser => ({ id: user.id, fullName: String(user.user_metadata.full_name ?? user.user_metadata.name ?? ''), email: user.email ?? '' })

export const authService = {
  configured,
  async session() { const { supabase } = await loadClient(); const { data, error } = await supabase.auth.getSession(); if (error) throw error; return data.session?.user ? toAuthUser(data.session.user) : null },
  async subscribe(callback: (user: AuthUser | null) => void) { const { supabase } = await loadClient(); const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session?.user ? toAuthUser(session.user) : null)); return () => data.subscription.unsubscribe() },
  async login(email: string, password: string, rememberMe: boolean) { const { supabase, setRememberPersistence } = await loadClient(); setRememberPersistence(rememberMe); const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) { if (rememberMe) setRememberPersistence(false); throw error } if (!data.user) throw new Error('Unable to sign in.'); return toAuthUser(data.user) },
  async register(fullName: string, email: string, password: string) { const { supabase } = await loadClient(); const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } }); if (error) throw error },
  async forgotPassword(email: string) { const { supabase } = await loadClient(); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` }); if (error) throw error },
  async logout() { const { supabase, setRememberPersistence } = await loadClient(); const { error } = await supabase.auth.signOut(); if (error) throw error; setRememberPersistence(false) },
}
