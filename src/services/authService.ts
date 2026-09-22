import type { User } from '@supabase/supabase-js'

export interface AuthUser { id: string; fullName: string; email: string }
export class AuthConfigurationError extends Error {}
export interface RegistrationResult { requiresEmailConfirmation: boolean }

const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
const loadClient = async () => {
  if (!configured) throw new AuthConfigurationError('Supabase ავტორიზაცია არ არის კონფიგურირებული.')
  return import('./supabaseClient')
}
const toAuthUser = (user: User): AuthUser => ({ id: user.id, fullName: String(user.user_metadata.full_name ?? user.user_metadata.name ?? ''), email: user.email ?? '' })
const redirectUrl = (path: string) => new URL(path, window.location.origin).toString()

const authErrorMessage = (error: unknown) => {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) return 'ელფოსტა ან პაროლი არასწორია.'
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) return 'ელფოსტა ჯერ არ არის დადასტურებული. შეამოწმეთ მიღებული წერილი.'
  if (code === 'user_already_exists' || message.includes('already registered')) return 'ამ ელფოსტით ანგარიში უკვე არსებობს.'
  if (code === 'weak_password' || message.includes('password should be')) return 'პაროლი ძალიან სუსტია. გამოიყენეთ მინიმუმ 6 სიმბოლო.'
  if (code === 'same_password') return 'ახალი პაროლი ძველი პაროლისგან უნდა განსხვავდებოდეს.'
  if (code === 'email_address_invalid') return 'შეიყვანეთ სწორი ელფოსტის მისამართი.'
  if (code === 'signup_disabled') return 'რეგისტრაცია დროებით გამორთულია.'
  if (code === 'otp_expired' || message.includes('expired')) return 'ბმულს ვადა გაუვიდა. მოითხოვეთ ახალი წერილი.'
  if (code.includes('rate_limit') || message.includes('rate limit') || message.includes('too many')) return 'ძალიან ბევრი მცდელობაა. გთხოვთ, ცოტა ხანში სცადოთ.'
  if (message.includes('fetch') || message.includes('network')) return 'ქსელთან დაკავშირება ვერ მოხერხდა. შეამოწმეთ ინტერნეტი და სცადეთ ხელახლა.'
  return 'ოპერაცია ვერ შესრულდა. გთხოვთ, სცადოთ ხელახლა.'
}

const throwAuthError = (error: unknown): never => { throw new Error(authErrorMessage(error)) }

export const authService = {
  configured,
  async session() { const { supabase } = await loadClient(); const { data, error } = await supabase.auth.getSession(); if (error) throw error; return data.session?.user ? toAuthUser(data.session.user) : null },
  async subscribe(callback: (user: AuthUser | null) => void) { const { supabase } = await loadClient(); const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session?.user ? toAuthUser(session.user) : null)); return () => data.subscription.unsubscribe() },
  async login(email: string, password: string, rememberMe: boolean) {
    const { supabase, setRememberPersistence } = await loadClient()
    setRememberPersistence(rememberMe)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { if (rememberMe) setRememberPersistence(false); throwAuthError(error) }
    if (!data.user) throw new Error('შესვლა ვერ მოხერხდა. გთხოვთ, სცადოთ ხელახლა.')
    return toAuthUser(data.user)
  },
  async register(fullName: string, email: string, password: string): Promise<RegistrationResult> {
    const { supabase } = await loadClient()
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: redirectUrl('/auth/callback') } })
    if (error) throwAuthError(error)
    return { requiresEmailConfirmation: !data.session }
  },
  async resendConfirmation(email: string) {
    const { supabase } = await loadClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectUrl('/auth/callback') } })
    if (error) throwAuthError(error)
  },
  async forgotPassword(email: string) {
    const { supabase } = await loadClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl('/reset-password') })
    if (error) throwAuthError(error)
  },
  async updatePassword(password: string) {
    const { supabase } = await loadClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throwAuthError(error)
  },
  async logout() {
    const { supabase, setRememberPersistence } = await loadClient()
    const { error } = await supabase.auth.signOut()
    if (error) throwAuthError(error)
    setRememberPersistence(false)
  },
}
