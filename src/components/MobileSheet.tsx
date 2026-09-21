import { ShoppingCart, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useFinance } from '../state/FinanceContext'
import { translate } from '../i18n/translations'

interface MobileSheetProps {
  isOpen: boolean
  onClose: () => void
}

const items = [
  { key: 'nav.shopping', to: '/shopping', icon: ShoppingCart }, { key: 'nav.accounts', to: '/accounts' }, { key: 'nav.family', to: '/family' }, { key: 'nav.debts', to: '/debts' }, { key: 'nav.statistics', to: '/statistics' }, { key: 'nav.settings', to: '/settings' },
]

export function MobileSheet({ isOpen, onClose }: MobileSheetProps) {
  const { preferences } = useFinance()
  const t = (key: string) => translate(preferences.language, key)
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden">
      <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-[0_-12px_40px_rgba(15,23,42,0.18)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-base font-semibold text-slate-900">{t('nav.more')}</p>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-2">
          {items.map(({ key, to, icon: Icon }) => (
            <NavLink
              key={key}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'
                }`
              }
            >
              <span className="flex items-center gap-3">{Icon ? <Icon className="h-4 w-4" /> : null}{t(key)}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
