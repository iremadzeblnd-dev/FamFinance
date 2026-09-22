import { useState } from 'react'
import { LogOut, Plus } from 'lucide-react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { MobileBottomNav } from './components/MobileBottomNav'
import { MobileSheet } from './components/MobileSheet'
import { Sidebar } from './components/Sidebar'
import { TransactionModal, type TransactionFormValues } from './components/TransactionModal'
import { FinanceProvider, useFinance, type TransactionDraft } from './state/FinanceContext'
import type { AttachmentMetadata, Transaction, TransactionType } from './types/app'
import { DashboardPage } from './pages/DashboardPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { BudgetPage } from './pages/BudgetPage'
import { AccountsPage } from './pages/AccountsPage'
import { FamilyPage } from './pages/FamilyPage'
import { DebtsPage } from './pages/DebtsPage'
import { SavingsPage } from './pages/SavingsPage'
import { StatisticsPage } from './pages/StatisticsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { translate } from './i18n/translations'
import { HeaderPreferences } from './components/HeaderPreferences'
import { deleteAttachmentBlobs, saveAttachmentBlobs } from './services/attachmentStorage'
import { NotificationCenter } from './components/NotificationCenter'
import { GlobalSearch } from './components/GlobalSearch'
import { AuthProvider, useAuth } from './state/AuthContext'
import { AuthCallbackPage, CheckEmailPage, ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages'
import { FamilyChat } from './components/FamilyChat'
import { LandingPage } from './pages/LandingPage'

function GlobalTransactionActions({ onOpenTransaction }: { onOpenTransaction: (type: TransactionType) => void }) {
  const { pathname } = useLocation()
  const { preferences } = useFinance()
  const t = (key: string) => translate(preferences.language, key)
  if (pathname === '/settings') return null
  return <div className="mb-6 flex flex-wrap gap-3">
    <button onClick={() => onOpenTransaction('income')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-500"><Plus className="h-4 w-4" />{t('common.addIncome')}</button>
    <button onClick={() => onOpenTransaction('expense')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"><Plus className="h-4 w-4" />{t('common.addExpense')}</button>
  </div>
}

function AppShell() {
  const [activeType, setActiveType] = useState<TransactionType>('income')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>()
  const { accounts, familyMembers, addTransaction, updateTransaction, preferences, syncError } = useFinance()
  const { logout } = useAuth()
  const activeFamilyMembers = familyMembers.filter((member) => !member.archived)
  const openModal = (type: TransactionType) => {
    setActiveType(type)
    setEditingTransaction(undefined)
    setIsModalOpen(true)
  }

  const openEditModal = (transaction: Transaction) => {
    setActiveType(transaction.type)
    setEditingTransaction(transaction)
    setIsModalOpen(true)
  }

  const handleSaveTransaction = async (value: TransactionFormValues) => {
    const attachments: AttachmentMetadata[] = []
    const blobs: { id: string; blob: Blob }[] = []
    for (const attachment of value.attachments) {
      if (attachment.blob) blobs.push({ id: attachment.id, blob: attachment.blob })
      else if (attachment.legacyUrl) blobs.push({ id: attachment.id, blob: await fetch(attachment.legacyUrl).then((response) => response.blob()) })
      attachments.push({ id: attachment.id, name: attachment.name, type: attachment.type, size: attachment.size, category: attachment.category, lastModified: attachment.lastModified })
    }
    await saveAttachmentBlobs(blobs)
    const nextItem: TransactionDraft = {
      type: activeType,
      amount: Number(value.amount),
      category: value.category,
      description: value.description,
      date: value.date,
      accountId: value.accountId,
      familyMemberId: value.familyMemberId,
      expenseScope: value.expenseScope,
      attachments,
      receiptAttachment: undefined,
    }
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, nextItem)
      setToast('ცვლილებები შენახულია')
    } else {
      addTransaction(nextItem)
      setToast(activeType === 'income' ? 'შემოსავალი წარმატებით დაემატა' : 'ხარჯი წარმატებით დაემატა')
    }
    const retainedIds = new Set(attachments.map((attachment) => attachment.id))
    const removedIds = editingTransaction?.attachments?.filter((attachment) => !retainedIds.has(attachment.id)).map((attachment) => attachment.id) ?? []
    void deleteAttachmentBlobs(removedIds).catch((error) => console.error('Unable to remove replaced attachments', error))
    window.setTimeout(() => setToast(''), 2400)
  }

  return (
    <>
      <div className={`min-h-screen bg-slate-100 text-slate-900 theme-${preferences.theme}`}>
        <div className="mx-auto flex max-w-[1600px]">
          <Sidebar />

          <div className="min-w-0 flex-1 pb-24 lg:pb-6">
            <header className="border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="lg:hidden">
                    <p className="truncate text-base font-bold text-slate-900">ჩვენი ფინანსები</p>
                    <p className="text-[11px] text-slate-500">სექტემბერი 2026</p>
                  </div>
                </div>

                <GlobalSearch onOpenTransaction={openEditModal} />

                <div className="flex items-center gap-2">
                  <HeaderPreferences />
                  <NotificationCenter />
                  <button type="button" onClick={() => void logout().catch((error) => { console.error('Unable to sign out', error); setToast(error instanceof Error ? error.message : 'Unable to sign out') })} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" title={{ ka: 'გასვლა', en: 'Sign out', ru: 'Выйти', tr: 'Çıkış yap' }[preferences.language]} aria-label={{ ka: 'გასვლა', en: 'Sign out', ru: 'Выйти', tr: 'Çıkış yap' }[preferences.language]}><LogOut className="h-4 w-4" /></button>
                </div>
              </div>
            </header>

            <main className="px-4 pb-6 pt-4 sm:px-6 sm:pt-6">
              {syncError ? <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">{syncError}</p> : null}
              <GlobalTransactionActions onOpenTransaction={openModal} />

              <Routes>
                <Route path="/" element={<DashboardPage onOpenTransaction={openModal} />} />
                <Route path="/transactions" element={<TransactionsPage onEdit={openEditModal} />} />
                <Route path="/budget" element={<BudgetPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/family" element={<FamilyPage />} />
                <Route path="/debts" element={<DebtsPage />} />
                <Route path="/savings" element={<SavingsPage />} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/shopping" element={<ShoppingPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>

      <MobileBottomNav onOpenMore={() => setMobileSheetOpen(true)} />
      <MobileSheet isOpen={mobileSheetOpen} onClose={() => setMobileSheetOpen(false)} />
      <FamilyChat />

      <TransactionModal
        isOpen={isModalOpen}
        type={activeType}
        accounts={accounts}
        familyMembers={activeFamilyMembers}
        initialValue={editingTransaction}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
      />
      {toast ? <div className="fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-sm rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white shadow-xl lg:bottom-6">{toast}</div> : null}
    </>
  )
}

function ProtectedFinanceApp() {
  const { user, checking } = useAuth()
  const { dataLoading, dataLoadFailed, syncError } = useFinance()
  if (checking || (user && dataLoading)) return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">მონაცემები იტვირთება…</div>
  if (user && dataLoadFailed) return <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4"><div className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm"><p className="text-sm text-amber-800">{syncError}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">ხელახლა ცდა</button></div></div>
  return user ? <AppShell /> : <Navigate to="/login" replace />
}

function App() {
  return <BrowserRouter><AuthProvider><FinanceApp /></AuthProvider></BrowserRouter>
}

function HomeRoute() {
  const { user, checking } = useAuth()
  if (checking) return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">მიმდინარეობს ავტორიზაციის შემოწმება…</div>
  return user ? <ProtectedFinanceApp /> : <LandingPage />
}

function FinanceApp() {
  const { user } = useAuth()
  return <FinanceProvider key={user?.id ?? 'signed-out'}><Routes>
    <Route path="/" element={<HomeRoute />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/check-email" element={<CheckEmailPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/auth/callback" element={<AuthCallbackPage />} />
    <Route path="/*" element={<ProtectedFinanceApp />} />
  </Routes></FinanceProvider>
}

export default App
