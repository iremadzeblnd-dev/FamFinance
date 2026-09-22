import { BarChart3, CreditCard, PiggyBank, ReceiptText, Settings, Wallet, Users, House, CircleDollarSign, FileText, ShoppingCart } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useFinance } from '../state/FinanceContext'
import { translate } from '../i18n/translations'
import { localeMap } from '../i18n/translations'
import { formatCurrency } from '../utils/formatters'
import { calculateNetBalance } from '../utils/calculations'

const navItems = [
  { key: 'nav.home', to: '/', icon: House }, { key: 'nav.transactions', to: '/transactions', icon: ReceiptText }, { key: 'nav.shopping', to: '/shopping', icon: ShoppingCart }, { key: 'nav.budget', to: '/budget', icon: FileText }, { key: 'nav.accounts', to: '/accounts', icon: Wallet }, { key: 'nav.family', to: '/family', icon: Users }, { key: 'nav.debts', to: '/debts', icon: CreditCard }, { key: 'nav.savings', to: '/savings', icon: PiggyBank }, { key: 'nav.statistics', to: '/statistics', icon: BarChart3 }, { key: 'nav.settings', to: '/settings', icon: Settings },
]

export function Sidebar() {
  const { preferences, validTransactions } = useFinance()
  const t = (key: string) => translate(preferences.language, key)
  const currentBalance = calculateNetBalance(validTransactions)
  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-slate-50/80 p-5 lg:flex lg:flex-col lg:justify-between">
      <div>
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">ჩვენი ფინანსები</p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map(({ key, to, icon: Icon }) => (
            <NavLink
              key={key}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{t(key)}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-emerald-700">
          <CircleDollarSign className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">დღევანდელი მდგომარეობა</span>
        </div>
        <p className="text-2xl font-bold text-slate-900">{formatCurrency(currentBalance, preferences.currency, localeMap[preferences.language])}</p>
        <p className="text-xs text-emerald-700">დარჩენილი</p>
      </div>
    </aside>
  )
}
