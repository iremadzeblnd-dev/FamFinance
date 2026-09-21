import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthCalendarSelectorProps {
  month: string
  locale: string
  onMonthChange: (month: string) => void
  minDate?: string
  variant?: 'default' | 'hero'
}

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

export function MonthCalendarSelector({ month, locale, onMonthChange, minDate, variant = 'default' }: MonthCalendarSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>()
  const containerRef = useRef<HTMLDivElement>(null)
  const [year, monthNumber] = month.split('-').map(Number)
  const monthLabel = new Date(year, monthNumber - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const leadingDays = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, index + 1)))
  const todayLabel = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'day')
  const minMonth = minDate?.slice(0, 7)
  const canGoPrevious = !minMonth || month > minMonth
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const preferredDay = Number(selectedDate?.slice(8, 10)) || today.getDate()
  const minimumDay = minDate?.slice(0, 7) === month ? Number(minDate.slice(8, 10)) : 1
  const displayedDay = Math.max(minimumDay, Math.min(preferredDay, daysInMonth))
  const displayedDateLabel = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(year, monthNumber - 1, displayedDay))
  const outerClass = variant === 'hero' ? 'flex items-center justify-between' : 'flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'
  const titleClass = variant === 'hero' ? 'text-2xl font-bold text-slate-900 sm:text-3xl' : 'font-semibold text-slate-900'

  const shiftMonth = (offset: number) => {
    const nextMonthDate = new Date(year, monthNumber - 1 + offset, 1)
    const nextMonth = monthKey(nextMonthDate)
    if (minMonth && nextMonth < minMonth) return
    const nextMonthDays = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0).getDate()
    const nextMinimumDay = minMonth === nextMonth && minDate ? Number(minDate.slice(8, 10)) : 1
    const nextDay = Math.max(nextMinimumDay, Math.min(preferredDay, nextMonthDays))
    setSelectedDate(`${nextMonth}-${String(nextDay).padStart(2, '0')}`)
    onMonthChange(nextMonth)
  }

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const navigationButton = (direction: -1 | 1, compact = false) => {
    const disabled = direction === -1 && !canGoPrevious
    const targetLabel = new Date(year, monthNumber - 1 + direction, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    return <button type="button" onClick={() => shiftMonth(direction)} disabled={disabled} className={`inline-flex items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30 ${compact ? 'h-10 w-10' : 'min-h-10 min-w-10'}`} aria-label={targetLabel}>{direction === -1 ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</button>
  }

  return <div ref={containerRef} className="relative">
    <div className={outerClass}>
      {navigationButton(-1)}
      <button type="button" onClick={() => setOpen((value) => !value)} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 transition hover:bg-slate-50 ${titleClass}`} aria-expanded={open} aria-haspopup="dialog"><CalendarDays className="h-4 w-4 shrink-0 text-emerald-600" /><span>{displayedDateLabel}</span><ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} /></button>
      {navigationButton(1)}
    </div>
    {open ? <div role="dialog" aria-label={monthLabel} className="absolute left-1/2 z-30 mt-2 w-full max-w-sm -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        {navigationButton(-1, true)}
        <p className="font-semibold text-slate-900">{monthLabel}</p>
        {navigationButton(1, true)}
      </div>
      <div className="grid grid-cols-7 text-center">
        {weekdays.map((weekday, index) => <span key={`${weekday}-${index}`} className="py-2 text-xs font-medium text-slate-500">{weekday}</span>)}
        {Array.from({ length: leadingDays }, (_, index) => <span key={`empty-${index}`} aria-hidden="true" />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1
          const dateKey = `${month}-${String(day).padStart(2, '0')}`
          if (minDate && dateKey < minDate.slice(0, 10)) return <span key={dateKey} aria-hidden="true" />
          const isSelected = selectedDate === dateKey
          const isToday = todayKey === dateKey
          const dateLabel = new Date(year, monthNumber - 1, day).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
          return <button key={dateKey} type="button" onClick={() => { setSelectedDate(dateKey); setOpen(false) }} className="mx-auto my-0.5 inline-flex h-12 w-11 flex-col items-center justify-center rounded-xl text-sm font-medium text-slate-700 transition hover:bg-slate-100" aria-label={`${dateLabel}${isToday ? ` — ${todayLabel}` : ''}`} aria-current={isToday ? 'date' : undefined} aria-pressed={isSelected}>
            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition ${isSelected ? 'bg-emerald-600 text-white shadow-sm' : isToday ? 'bg-emerald-50 font-bold text-emerald-700 ring-1 ring-emerald-100' : ''}`}>{day}</span>
            {isToday ? <span className="mt-0.5 text-[9px] font-semibold leading-none text-emerald-700">{todayLabel}</span> : null}
          </button>
        })}
      </div>
    </div> : null}
  </div>
}
