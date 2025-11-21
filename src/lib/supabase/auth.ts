import { createClient } from '@/lib/supabase/server'

export interface UserData {
  id: string
  name: string
  email: string
  organization_id: string
  role: 'inspector' | 'approver' | 'admin'
}

export async function getCurrentUser(): Promise<UserData | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: userData } = await supabase
    .from('users')
    .select('id, name, email, organization_id, role')
    .eq('id', user.id)
    .single()

  return userData
}

export async function checkPermission(
  requiredRole: 'inspector' | 'approver' | 'admin'
): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const roleHierarchy: Record<string, number> = {
    inspector: 1,
    approver: 2,
    admin: 3,
  }

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
}
