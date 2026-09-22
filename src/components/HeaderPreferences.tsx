import { useEffect, useRef, useState } from 'react'
import { Check, Globe2, Moon, Sun } from 'lucide-react'
import { useFinance } from '../state/FinanceContext'
import { translate, type Language } from '../i18n/translations'

const languages: { id: Language; label: string }[] = [
  { id: 'ka', label: 'ქართული' },
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
  { id: 'tr', label: 'Türkçe' },
]

export function HeaderPreferences() {
  const { preferences, setTheme, setLanguage } = useFinance()
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
