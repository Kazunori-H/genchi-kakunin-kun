import { getCurrentUser } from '@/lib/supabase/auth'

export type Role = 'inspector' | 'approver' | 'admin'

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    return { user: null as const, error: 'Unauthorized', status: 401 }
  }
  return { user, error: null, status: 200 }
}

export async function requireAdmin() {
  const result = await requireUser()
  if (!result.user) return result
  if (result.user.role !== 'admin') {
    return { user: null as const, error: '管理者のみが実行できます', status: 403 }
  }
  return { user: result.user, error: null, status: 200 }
}

export function clampApprovalLevel(level?: number) {
  if (typeof level !== 'number' || Number.isNaN(level)) return 0
  return Math.max(0, Math.min(3, Math.floor(level)))
}
