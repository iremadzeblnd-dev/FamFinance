import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'

export interface SimpleFormField { key: string; label: string; type?: 'text' | 'number' | 'date'; placeholder?: string }

interface SimpleFormModalProps {
  isOpen: boolean
  title: string
  fields: SimpleFormField[]
  initialValues?: Record<string, string>
  onClose: () => void
  onSubmit: (values: Record<string, string>) => void
}

export function SimpleFormModal({ isOpen, title, fields, initialValues, onClose, onSubmit }: SimpleFormModalProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const initialKey = JSON.stringify(initialValues ?? {})
  useEffect(() => { if (isOpen) { setValues(Object.fromEntries(fields.map((field) => [field.key, initialValues?.[field.key] ?? '']))); setError('') } }, [isOpen, initialKey])
  if (!isOpen) return null
  const submit = (event: FormEvent) => { event.preventDefault(); if (fields.some((field) => !values[field.key]?.trim())) { setError('გთხოვთ შეავსოთ ყველა ველი'); return }; onSubmit(values) }
  return <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"><div className="w-full rounded-t-[28px] bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-5"><div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-semibold text-slate-900">{title}</h3><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="დახურვა"><X className="h-5 w-5" /></button></div><form onSubmit={submit} className="space-y-4">{fields.map((field) => <label key={field.key} className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{field.label}</span><input type={field.type ?? 'text'} inputMode={field.type === 'number' ? 'decimal' : undefined} value={values[field.key] ?? ''} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} placeholder={field.placeholder} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none focus:border-emerald-500" /></label>)}{error ? <p className="text-sm text-rose-600">{error}</p> : null}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-700">გაუქმება</button><button type="submit" className="rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white">შენახვა</button></div></form></div></div>
}
