import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import type { Language } from '../i18n/translations'
import { familyChatService, type FamilyMessage } from '../services/familyChatService'
import { useAuth } from '../state/AuthContext'
import { useFinance } from '../state/FinanceContext'

const chatText = {
  ka: { title: 'ოჯახის ჩატი', subtitle: 'მხოლოდ თქვენი ოჯახისთვის', open: 'ოჯახის ჩატის გახსნა', close: 'დახურვა', placeholder: 'დაწერეთ შეტყობინება…', send: 'გაგზავნა', empty: 'შეტყობინებები ჯერ არ არის.', loading: 'შეტყობინებები იტვირთება…', unavailable: 'ოჯახის ჩატი დროებით მიუწვდომელია.', noFamily: 'ოჯახის ჯგუფი ვერ მოიძებნა.', you: 'თქვენ' },
  en: { title: 'Family Chat', subtitle: 'Only for your family', open: 'Open family chat', close: 'Close', placeholder: 'Write a message…', send: 'Send', empty: 'No messages yet.', loading: 'Loading messages…', unavailable: 'Family chat is temporarily unavailable.', noFamily: 'No family group was found.', you: 'You' },
  ru: { title: 'Семейный чат', subtitle: 'Только для вашей семьи', open: 'Открыть семейный чат', close: 'Закрыть', placeholder: 'Напишите сообщение…', send: 'Отправить', empty: 'Сообщений пока нет.', loading: 'Загрузка сообщений…', unavailable: 'Семейный чат временно недоступен.', noFamily: 'Семейная группа не найдена.', you: 'Вы' },
  tr: { title: 'Aile Sohbeti', subtitle: 'Yalnızca aileniz için', open: 'Aile sohbetini aç', close: 'Kapat', placeholder: 'Bir mesaj yazın…', send: 'Gönder', empty: 'Henüz mesaj yok.', loading: 'Mesajlar yükleniyor…', unavailable: 'Aile sohbeti geçici olarak kullanılamıyor.', noFamily: 'Aile grubu bulunamadı.', you: 'Siz' },
} satisfies Record<Language, Record<string, string>>

const addMessage = (messages: FamilyMessage[], message: FamilyMessage) => messages.some((item) => item.id === message.id)
  ? messages
  : [...messages, message].sort((left, right) => left.createdAt.localeCompare(right.createdAt)).slice(-100)

export function FamilyChat() {
  const { user } = useAuth()
  const { preferences } = useFinance()
  const copy = chatText[preferences.language]
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [familyId, setFamilyId] = useState<string>()
  const [messages, setMessages] = useState<FamilyMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !user) return
    let active = true
    let channel: Awaited<ReturnType<typeof familyChatService.subscribe>> | undefined
    setLoading(true)
    setError('')
    setMessages([])
    void familyChatService.getFamilyId(user.id).then(async (nextFamilyId) => {
      if (!active) return
      if (!nextFamilyId) {
        setError(copy.noFamily)
        return
      }
      setFamilyId(nextFamilyId)
      const nextChannel = await familyChatService.subscribe(nextFamilyId, (message) => {
        if (active) setMessages((current) => addMessage(current, message))
      })
      if (!active) {
        void familyChatService.unsubscribe(nextChannel)
        return
      }
      channel = nextChannel
      const loaded = await familyChatService.listMessages(nextFamilyId)
      if (active) setMessages((current) => loaded.reduce(addMessage, current))
    }).catch(() => {
      if (active) setError(copy.unavailable)
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
      setFamilyId(undefined)
      if (channel) void familyChatService.unsubscribe(channel)
    }
  }, [copy.noFamily, copy.unavailable, open, user])

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [loading, messages, open])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || !familyId || sending) return
    setInput('')
    setSending(true)
    setError('')
    try {
      const message = await familyChatService.sendMessage(familyId, text)
      setMessages((current) => addMessage(current, message))
    } catch {
      setInput(text)
      setError(copy.unavailable)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (value: string) => new Intl.DateTimeFormat(preferences.language, { hour: '2-digit', minute: '2-digit' }).format(new Date(value))

  return <>
    {open ? <section role="dialog" aria-label={copy.title} className="fixed bottom-40 right-3 z-[75] flex max-h-[min(32rem,calc(100dvh-10rem))] w-[min(23rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:bottom-24 lg:right-6">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-emerald-600 px-4 py-3 text-white">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><MessageCircle className="h-5 w-5" /></span><div><h2 className="font-bold">{copy.title}</h2><p className="text-xs text-emerald-50">{copy.subtitle}</p></div></div>
        <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15" aria-label={copy.close}><X className="h-5 w-5" /></button>
      </header>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3" aria-live="polite">
        {loading ? <p className="py-6 text-center text-sm text-slate-500">{copy.loading}</p> : null}
        {!loading && !error && messages.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">{copy.empty}</p> : null}
        {messages.map((message) => {
          const own = message.senderId === user?.id
          return <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-3 py-2.5 ${own ? 'rounded-br-md bg-emerald-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'}`}><p className={`text-[11px] font-semibold ${own ? 'text-emerald-50' : 'text-emerald-700'}`}>{own ? copy.you : message.senderName}</p><p className="whitespace-pre-wrap break-words text-sm leading-5">{message.text}</p><p className={`mt-1 text-right text-[10px] ${own ? 'text-emerald-100' : 'text-slate-400'}`}>{formatTime(message.createdAt)}</p></div></div>
        })}
        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="status">{error}</p> : null}
      </div>
      <form onSubmit={(event) => void submit(event)} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
        <textarea rows={1} maxLength={2000} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} placeholder={copy.placeholder} className="max-h-24 min-h-11 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500" />
        <button type="submit" disabled={!input.trim() || !familyId || sending} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50" aria-label={copy.send}><Send className="h-4 w-4" /></button>
      </form>
    </section> : null}
    <button type="button" onClick={() => setOpen((current) => !current)} className="fixed bottom-24 right-4 z-[76] flex h-14 w-14 flex-col items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl ring-4 ring-slate-100 transition hover:scale-105 hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-200 lg:bottom-6 lg:right-6" aria-label={open ? copy.close : copy.open} aria-expanded={open} title={open ? copy.close : copy.open}><MessageCircle className="h-5 w-5" /><span className="text-[9px] font-bold leading-none">Chat</span></button>
  </>
}
