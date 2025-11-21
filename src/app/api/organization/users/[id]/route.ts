import { jsonError } from '@/lib/api/errors'
import { clampApprovalLevel, requireAdmin } from '@/lib/api/authz'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['inspector', 'approver', 'admin'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

interface UpdatePayload {
  role?: AllowedRole
  is_active?: boolean
  approval_level?: number
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAdmin()
  if (!user) return jsonError(error ?? 'Unauthorized', status)
  const { id } = await params

  const body = (await request.json()) as UpdatePayload
  const updates: Record<string, unknown> = {}
  const supabase = await createClient()

  if (body.role) {
    if (!ALLOWED_ROLES.includes(body.role)) {
      return jsonError('無効なロールです', 400)
    }
    updates.role = body.role
  }

  if (typeof body.is_active === 'boolean') {
    if (user.id === id && body.is_active === false) {
      return jsonError('自分自身を無効化することはできません', 400)
    }
    updates.is_active = body.is_active
  }

  if (body.approval_level !== undefined) {
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('approval_levels')
      .eq('id', user.organization_id)
      .single<{ approval_levels: number }>()

    if (orgError || !orgData) {
      return jsonError('組織設定の取得に失敗しました', 500)
    }

    const maxApproval = clampApprovalLevel(orgData.approval_levels)
    updates.approval_level = Math.min(
      maxApproval,
      clampApprovalLevel(body.approval_level)
    )
  }

  if (Object.keys(updates).length === 0) {
    return jsonError('更新項目が指定されていません', 400)
  }

  const { data, error: updateError } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .select('id, name, email, role, approval_level, is_active, created_at')
    .single()

  if (updateError || !data) {
    return jsonError(updateError?.message || 'ユーザー更新に失敗しました', 500)
  }

  return NextResponse.json(data)
}
