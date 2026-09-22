import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Bell, CalendarRange, Database, Download, FileDown, Plus, ShieldCheck, Tags, Trash2, Upload, WalletCards, X } from 'lucide-react'
import { useFinance } from '../state/FinanceContext'
import { translate } from '../i18n/translations'
import type { Currency } from '../types/app'

const labels = {
  ka: ['შეტყობინებები','ვალები და გადახდები','ბიუჯეტის ლიმიტები','დანაზოგის მიზნები','დაგეგმილი შეხსენებები','ნაგულისხმევი ვალუტა','ფინანსური პერიოდი','დაწყების დღე','კატეგორიების მართვა','შემოსავლის კატეგორიები','ხარჯის კატეგორიები','ახალი კატეგორია','დამატება','მონაცემების მართვა','სარეზერვო ასლი','აღდგენა','CSV ექსპორტი','უსაფრთხოება','შეტყობინებებში თანხების დამალვა','ყველა მონაცემის წაშლა','ნამდვილად გსურთ ყველა ფინანსური მონაცემის წაშლა? ამ მოქმედების გაუქმება შეუძლებელია.','აღდგენა ჩაანაცვლებს მიმდინარე მონაცემებს. გაგრძელება?','მონაცემები აღდგენილია.','ფაილი არასწორი ან დაზიანებულია.','შეტყობინებების ჩართვა','ძველი ლოკალური მონაცემების იმპორტი','ძველი მონაცემები ამ ანგარიშში დაემატება. გაგრძელება?','ძველი მონაცემები წარმატებით დაემატა.','იმპორტი ვერ მოხერხდა. ძველი მონაცემები არ წაშლილა.'],
  en: ['Notifications','Debts and payments','Budget limits','Savings goals','Scheduled reminders','Default currency','Financial period','Start day','Category management','Income categories','Expense categories','New category','Add','Data management','Backup','Restore','Export CSV','Security','Hide amounts in notifications','Clear all data','Delete all financial data? This cannot be undone.','Restoring will replace current data. Continue?','Data restored successfully.','The file is invalid or damaged.','Enable notifications','Import legacy local data','Legacy data will be added to this account. Continue?','Legacy data imported successfully.','Import failed. The legacy data was not deleted.'],
  ru: ['Уведомления','Долги и платежи','Лимиты бюджета','Цели накоплений','Запланированные напоминания','Валюта по умолчанию','Финансовый период','День начала','Управление категориями','Категории доходов','Категории расходов','Новая категория','Добавить','Управление данными','Резервная копия','Восстановить','Экспорт CSV','Безопасность','Скрывать суммы в уведомлениях','Удалить все данные','Удалить все финансовые данные? Это действие нельзя отменить.','Восстановление заменит текущие данные. Продолжить?','Данные восстановлены.','Файл недействителен или повреждён.','Включить уведомления','Импорт старых локальных данных','Старые данные будут добавлены в этот аккаунт. Продолжить?','Старые данные успешно импортированы.','Импорт не выполнен. Старые данные не удалены.'],
  tr: ['Bildirimler','Borçlar ve ödemeler','Bütçe limitleri','Tasarruf hedefleri','Planlanmış hatırlatıcılar','Varsayılan para birimi','Finansal dönem','Başlangıç günü','Kategori yönetimi','Gelir kategorileri','Gider kategorileri','Yeni kategori','Ekle','Veri yönetimi','Yedekle','Geri yükle','CSV dışa aktar','Güvenlik','Bildirimlerde tutarları gizle','Tüm verileri temizle','Tüm finansal veriler silinsin mi? Bu işlem geri alınamaz.','Geri yükleme mevcut verilerin yerini alacak. Devam edilsin mi?','Veriler geri yüklendi.','Dosya geçersiz veya bozuk.','Bildirimleri etkinleştir','Eski yerel verileri içe aktar','Eski veriler bu hesaba eklenecek. Devam edilsin mi?','Eski veriler başarıyla içe aktarıldı.','İçe aktarma başarısız oldu. Eski veriler silinmedi.'],
} as const
const card = 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'
const field = 'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500'
const saveFile = (data: BlobPart, type: string, name: string) => { const url = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url) }
const csv = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`

interface CategoryEditorProps {
  title: string
  items: string[]
  value: string
  placeholder: string
  addLabel: string
  onValueChange: (value: string) => void
  onAdd: () => void
  onRemove: (value: string) => void
}

function CategoryEditor({ title, items, value, placeholder, addLabel, onValueChange, onAdd, onRemove }: CategoryEditorProps) {
  return <div>
    <h3 className="font-medium text-slate-800">{title}</h3>
    <div className="mt-3 flex flex-wrap gap-2">{items.map((name) => <span key={name} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{name}<button type="button" onClick={() => onRemove(name)} className="rounded-full p-0.5 hover:bg-slate-200"><X className="h-3.5 w-3.5" /></button></span>)}</div>
    <div className="mt-3 flex gap-2">
      <input type="text" value={value} onChange={(event) => onValueChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onAdd() }} placeholder={placeholder} className={`${field} min-w-0 flex-1`} />
      <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white"><Plus className="h-4 w-4" />{addLabel}</button>
    </div>
  </div>
}

export function SettingsPage() {
  const finance = useFinance()
  const { preferences, setCurrency, updatePreferences, restoreFinanceData, clearAllData, legacyImportAvailable, importLegacyData } = finance
  const l = labels[preferences.language]
  const t = (key: string) => translate(preferences.language, key)
  const fileRef = useRef<HTMLInputElement>(null)
  const [names, setNames] = useState({ income: '', expense: '' })
  const [status, setStatus] = useState('')
  const data = { transactions: finance.transactions, accounts: finance.accounts, budgets: finance.budgets, familyMembers: finance.familyMembers, debts: finance.debts, savingsGoals: finance.savingsGoals, shoppingItems: finance.shoppingItems, preferences }
  const toggleNotification = (key: keyof typeof preferences.notifications) => updatePreferences({ notifications: { ...preferences.notifications, [key]: !preferences.notifications[key] } })
  const changeCategories = (kind: 'income' | 'expense', remove?: string) => {
    const key = kind === 'income' ? 'incomeCategories' : 'expenseCategories'
    const list = preferences[key]
    if (remove) { updatePreferences({ [key]: list.filter((item) => item !== remove) }); return }
    const name = names[kind]
    if (!name.trim() || list.includes(name)) return
    updatePreferences({ [key]: [...list, name] }); setNames({ ...names, [kind]: '' })
  }
  const backup = () => saveFile(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2), 'application/json', `family-finances-backup-${new Date().toISOString().slice(0,10)}.json`)
  const exportCsv = () => {
    const rows: unknown[][] = [['date','type','amount','currency','category','description','account','familyMember'], ...finance.transactions.map((item) => [item.date,item.type,item.amount,preferences.currency,item.category,item.description,finance.accounts.find((a) => a.id === item.accountId)?.name ?? '',finance.familyMembers.find((m) => m.id === item.familyMemberId)?.name ?? ''])]
    saveFile(`\uFEFF${rows.map((row) => row.map(csv).join(',')).join('\n')}`, 'text/csv;charset=utf-8', `family-finances-${new Date().toISOString().slice(0,10)}.csv`)
  }
  const restore = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value=''; if (!file || !confirm(l[21])) return; try { setStatus(restoreFinanceData(JSON.parse(await file.text())) ? l[22] : l[23]) } catch { setStatus(l[23]) } }
  const importLegacy = async () => { if (!confirm(l[26])) return; setStatus(''); setStatus(await importLegacyData() ? l[27] : l[28]) }
  const Heading = ({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) => <div className="mb-4 flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{icon}</span><div><h2 className="text-lg font-semibold text-slate-900">{title}</h2>{children ? <p className="mt-1 text-sm text-slate-500">{children}</p> : null}</div></div>
  const Check = ({ label, checked, action, disabled }: { label: string; checked: boolean; action: () => void; disabled?: boolean }) => <label className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-2.5 hover:bg-slate-50 ${disabled ? 'opacity-50' : ''}`}><span className="text-sm text-slate-700">{label}</span><input type="checkbox" checked={checked} disabled={disabled} onChange={action} className="h-4 w-4 accent-emerald-600" /></label>
  return <div className="space-y-6"><div><p className="text-sm uppercase tracking-[0.2em] text-slate-500">{t('settings.eyebrow')}</p><h1 className="mt-2 text-3xl font-bold text-slate-900">{t('settings.title')}</h1></div><div className="grid gap-6 xl:grid-cols-2">
    <section className={card}><Heading icon={<Bell className="h-5 w-5" />} title={l[0]} /><Check label={l[24]} checked={preferences.notifications.enabled} action={() => toggleNotification('enabled')} />{(['debts','budgets','savings','reminders'] as const).map((key,index) => <Check key={key} label={l[index+1]} checked={preferences.notifications[key]} disabled={!preferences.notifications.enabled} action={() => toggleNotification(key)} />)}</section>
    <section className={card}><Heading icon={<WalletCards className="h-5 w-5" />} title={l[5]} /><select value={preferences.currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={`${field} w-full`}><option value="GEL">₾ GEL</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option></select></section>
    <section className={card}><Heading icon={<CalendarRange className="h-5 w-5" />} title={l[6]} /><label className="text-sm font-medium text-slate-700">{l[7]}</label><select value={preferences.financialPeriodStartDay} onChange={(e) => updatePreferences({financialPeriodStartDay:Number(e.target.value)})} className={`${field} mt-2 w-full`}>{Array.from({length:28},(_,i)=>i+1).map((day)=><option key={day}>{day}</option>)}</select></section>
    <section className={card}><Heading icon={<ShieldCheck className="h-5 w-5" />} title={l[17]} /><Check label={l[18]} checked={preferences.hideNotificationAmounts} action={() => updatePreferences({hideNotificationAmounts:!preferences.hideNotificationAmounts})} /></section>
    <section className={`${card} xl:col-span-2`}><Heading icon={<Tags className="h-5 w-5" />} title={l[8]} /><div className="grid gap-6 lg:grid-cols-2"><CategoryEditor title={l[9]} items={preferences.incomeCategories} value={names.income} placeholder={l[11]} addLabel={l[12]} onValueChange={(value) => setNames((current) => ({ ...current, income: value }))} onAdd={() => changeCategories('income')} onRemove={(value) => changeCategories('income', value)} /><CategoryEditor title={l[10]} items={preferences.expenseCategories} value={names.expense} placeholder={l[11]} addLabel={l[12]} onValueChange={(value) => setNames((current) => ({ ...current, expense: value }))} onAdd={() => changeCategories('expense')} onRemove={(value) => changeCategories('expense', value)} /></div></section>
    <section className={`${card} xl:col-span-2`}><Heading icon={<Database className="h-5 w-5" />} title={l[13]} /><input ref={fileRef} type="file" accept="application/json,.json" onChange={(e)=>void restore(e)} className="hidden" /><div className="flex flex-wrap gap-3"><button onClick={backup} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-700"><Download className="h-4 w-4" />{l[14]}</button><button onClick={()=>fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-700"><Upload className="h-4 w-4" />{l[15]}</button><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-700"><FileDown className="h-4 w-4" />{l[16]}</button>{legacyImportAvailable?<button type="button" onClick={()=>void importLegacy()} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 font-medium text-amber-800"><Upload className="h-4 w-4" />{l[25]}</button>:null}</div>{status?<p className="mt-3 text-sm text-slate-600" role="status">{status}</p>:null}<div className="mt-6 border-t border-slate-200 pt-5"><h3 className="font-semibold text-rose-700">{l[19]}</h3><button type="button" onClick={()=>{if(confirm(l[20])){clearAllData();setStatus(l[19])}}} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 font-medium text-rose-700"><Trash2 className="h-4 w-4" />{l[19]}</button></div></section>
  </div></div>
}
