import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
const persistenceKey = 'finance-auth-remember'
const authStorage = {
  getItem: (key: string) => sessionStorage.getItem(key) ?? localStorage.getItem(key),
  setItem(key: string, value: string) {
    if (localStorage.getItem(persistenceKey) === 'true') { localStorage.setItem(key, value); sessionStorage.removeItem(key) }
    else { sessionStorage.setItem(key, value); localStorage.removeItem(key) }
  },
  removeItem(key: string) { sessionStorage.removeItem(key); localStorage.removeItem(key) },
}

export const setRememberPersistence = (remember: boolean) => remember ? localStorage.setItem(persistenceKey, 'true') : localStorage.removeItem(persistenceKey)
export const supabase = createClient(supabaseUrl, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: authStorage } })
