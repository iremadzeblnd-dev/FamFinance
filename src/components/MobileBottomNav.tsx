import { Home, MoreHorizontal, PiggyBank, ReceiptText, Wallet } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useFinance } from '../state/FinanceContext'
import { translate } from '../i18n/translations'

interface MobileBottomNavProps {
  onOpenMore: () => void
}

const items = [
  { key: 'nav.home', to: '/', icon: Home }, { key: 'nav.transactions', to: '/transactions', icon: ReceiptText }, { key: 'nav.budget', to: '/budget', icon: Wallet }, { key: 'nav.savings', to: '/savings', icon: PiggyBank },
]

export function MobileBottomNav({ onOpenMore }: MobileBottomNavProps) {
  const { preferences } = useFinance()
  const t = (key: string) => translate(preferences.language, key)
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1 px-2">
        {items.map(({ key, to, icon: Icon }) => (
          <NavLink
            key={key}
            to={to}
            className={({ isActive }) =>
              `flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition ${
                isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span className="leading-none">{t(key)}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={onOpenMore}
          className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="leading-none">{t('nav.more')}</span>
        </button>
      </div>
    </nav>
  )
}
