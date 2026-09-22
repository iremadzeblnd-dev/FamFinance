import type { RealtimeChannel } from '@supabase/supabase-js'

const loadClient = () => import('./supabaseClient')

export interface FamilyMessage {
  id: string
  familyId: string
  senderId: string
  senderName: string
  text: string
  createdAt: string
}

interface FamilyMessageRow {
  id: string
  family_id: string
  sender_id: string
  sender_name: string
  message_text: string
  created_at: string
}

interface FamilyMembershipRow {
  user_id: string
  family_id: string
}

export interface FamilyChatSubscription {
  channel: RealtimeChannel
  ready: Promise<void>
}

const toMessage = (row: FamilyMessageRow): FamilyMessage => ({
  id: row.id,
  familyId: row.family_id,
  senderId: row.sender_id,
  senderName: row.sender_name,
  text: row.message_text,
  createdAt: row.created_at,
})

const requireData = <T>(data: T | null, error: { message: string } | null): T => {
  if (error) throw new Error(error.message)
  if (data === null) throw new Error('Family chat data is unavailable')
  return data
}

const startSubscription = (channel: RealtimeChannel): FamilyChatSubscription => {
  let settled = false
  const ready = new Promise<void>((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' && !settled) {
        settled = true
        resolve()
      } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !settled) {
        settled = true
        reject(new Error(`Realtime subscription failed: ${status}`))
      }
    })
  })
  return { channel, ready }
}

export const familyChatService = {
  async getFamilyId(userId: string) {
    const { supabase } = await loadClient()
    const { data, error } = await supabase
      .from('family_chat_members')
      .select('family_id')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data?.family_id as string | undefined
  },

  async listMessages(familyId: string) {
    const { supabase } = await loadClient()
    const { data, error } = await supabase
      .from('family_messages')
      .select('id,family_id,sender_id,sender_name,message_text,created_at')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(100)
    return requireData(data, error).reverse().map((row) => toMessage(row as FamilyMessageRow))
  },

  async subscribe(familyId: string, onMessage: (message: FamilyMessage) => void): Promise<FamilyChatSubscription> {
    const { supabase } = await loadClient()
    const channel = supabase
      .channel(`family-chat:${familyId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'family_messages',
        filter: `family_id=eq.${familyId}`,
      }, (payload) => onMessage(toMessage(payload.new as FamilyMessageRow)))
    return startSubscription(channel)
  },

  async subscribeToMembership(userId: string, onFamilyChanged: (familyId: string) => void): Promise<FamilyChatSubscription> {
    const { supabase } = await loadClient()
    const channel = supabase
      .channel(`family-chat-membership:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'family_chat_members',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const membership = payload.new as FamilyMembershipRow
        if (membership.user_id === userId && membership.family_id) onFamilyChanged(membership.family_id)
      })
    return startSubscription(channel)
  },

  async sendMessage(familyId: string, text: string) {
    const { supabase } = await loadClient()
    const { data, error } = await supabase
      .from('family_messages')
      .insert({ family_id: familyId, message_text: text.trim().slice(0, 2_000) })
      .select('id,family_id,sender_id,sender_name,message_text,created_at')
      .single()
    return toMessage(requireData(data, error) as FamilyMessageRow)
  },

  async unsubscribe(channel: RealtimeChannel) {
    const { supabase } = await loadClient()
    return supabase.removeChannel(channel)
  },
}
