export type LinkFamilyMemberStatus = 'linked' | 'already_member' | 'self' | 'not_found' | 'target_has_family' | 'no_family'

export interface LinkFamilyMemberResult {
  status: LinkFamilyMemberStatus
  userId?: string
  displayName?: string
}

interface LinkFamilyMemberRow {
  status: LinkFamilyMemberStatus
  linked_user_id: string | null
  linked_display_name: string | null
}

export const familyMembershipService = {
  async linkByEmail(email: string): Promise<LinkFamilyMemberResult> {
    const { supabase } = await import('./supabaseClient')
    const { data, error } = await supabase.rpc('add_family_member_by_email', { target_email: email.trim().toLowerCase() })
    if (error) throw new Error(error.message)
    const row = (Array.isArray(data) ? data[0] : data) as LinkFamilyMemberRow | null
    if (!row) throw new Error('Family member link returned no result')
    return {
      status: row.status,
      userId: row.linked_user_id ?? undefined,
      displayName: row.linked_display_name ?? undefined,
    }
  },
}
