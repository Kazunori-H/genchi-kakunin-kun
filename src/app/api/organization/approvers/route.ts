import { jsonError } from '@/lib/api/errors'
import { createClient } from '@/lib/supabase/server'
import { clampApprovalLevel, requireAdmin, requireUser } from '@/lib/api/authz'
import { NextResponse } from 'next/server'

interface ApproverUpdatePayload {
  id: string
  approval_level: number
}

export async function GET() {
  const { user, error, status } = await requireUser()
  if (!user) return jsonError(error ?? 'Unauthorized', status)

  const supabase = await createClient()

  const { data, error: fetchError } = await supabase
    .from('users')
    .select('id, name, email, role, approval_level')
    .eq('organization_id', user.organization_id)
    .order('name', { ascending: true })

  if (fetchError || !data) {
    return jsonError(
      fetchError?.message || 'Failed to fetch organization members',
      500
    )
  }

  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const { user, error, status } = await requireAdmin()
  if (!user) return jsonError(error ?? 'Unauthorized', status)

  const payload = (await request.json()) as {
    users?: ApproverUpdatePayload[]
  }

  if (!Array.isArray(payload.users)) {
    return jsonError('users payload is required', 400)
  }

  const supabase = await createClient()
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('approval_levels')
    .eq('id', user.organization_id)
    .single<{ approval_levels: number }>()

  if (orgError || !orgData) {
    return jsonError(
      orgError?.message || 'Failed to load organization data',
      500
    )
  }

  const maxLevel = Math.max(0, Math.min(3, orgData.approval_levels))
  const updates = payload.users.map((entry) => ({
    id: entry.id,
    approval_level: Math.min(maxLevel, clampApprovalLevel(entry.approval_level)),
  }))

  for (const entry of updates) {
    const { error } = await supabase
      .from('users')
      .update({ approval_level: entry.approval_level })
      .eq('id', entry.id)
      .eq('organization_id', user.organization_id)

    if (error) {
      console.error('Failed to update user approval level', {
        userId: entry.id,
        error,
      })
      return jsonError('ユーザーの承認レベル更新に失敗しました', 500)
    }
  }

  return NextResponse.json({ success: true })
}
