import { useEffect, useRef, useState } from 'react'
import { Check, Globe2, Moon, Sun } from 'lucide-react'
import { useFinance } from '../state/FinanceContext'
import { translate, type Language } from '../i18n/translations'
import type { Currency } from '../types/app'

const languages: { id: Language; label: string }[] = [
  { id: 'ka', label: 'ქართული' },
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
  { id: 'tr', label: 'Türkçe' },
]

const currencies: { id: Currency; label: string }[] = [
  { id: 'GEL', label: '₾ GEL' },
  { id: 'USD', label: '$ USD' },
  { id: 'EUR', label: '€ EUR' },
]

export function HeaderPreferences({ showCurrency = true }: { showCurrency?: boolean }) {
  const { preferences, setTheme, setLanguage, setCurrency } = useFinance()
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const t = (key: string) => translate(preferences.language, key)
  const nextTheme = preferences.theme === 'light' ? 'dark' : 'light'

  useEffect(() => {
    if (!isLanguageOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsLanguageOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsLanguageOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLanguageOpen])

  const buttonClass = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <div className="flex items-center gap-2">
      {showCurrency ? <select value={preferences.currency} onChange={(event) => setCurrency(event.target.value as Currency)} className="h-10 w-[5.25rem] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus:ring-2 focus:ring-emerald-500" aria-label={t('header.currency')} title={t('header.currency')}>
        {currencies.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
      </select> : null}
      <button type="button" onClick={() => setTheme(nextTheme)} className={buttonClass} title={t(nextTheme === 'dark' ? 'header.enableDark' : 'header.enableLight')} aria-label={t(nextTheme === 'dark' ? 'header.enableDark' : 'header.enableLight')} aria-pressed={preferences.theme === 'dark'}>
        {preferences.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div ref={menuRef} className="relative">
        <button type="button" onClick={() => setIsLanguageOpen((open) => !open)} className={buttonClass} title={t('header.language')} aria-label={t('header.language')} aria-haspopup="menu" aria-expanded={isLanguageOpen}>
          <Globe2 className="h-4 w-4" />
        </button>
        {isLanguageOpen ? (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[80] w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl" role="menu" aria-label={t('header.language')}>
            {languages.map(({ id, label }) => (
              <button key={id} type="button" role="menuitemradio" aria-checked={preferences.language === id} onClick={() => { setLanguage(id); setIsLanguageOpen(false) }} className={`flex min-h-10 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${preferences.language === id ? 'bg-emerald-50 font-semibold text-emerald-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                <span>{label}</span>{preferences.language === id ? <Check className="h-4 w-4" /> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
