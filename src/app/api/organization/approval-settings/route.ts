import { jsonError } from '@/lib/api/errors'
import { createClient } from '@/lib/supabase/server'
import { clampApprovalLevel, requireAdmin, requireUser } from '@/lib/api/authz'
import { NextResponse } from 'next/server'

export async function GET() {
  const { user, error, status } = await requireUser()
  if (!user) return jsonError(error ?? 'Unauthorized', status)

  const supabase = await createClient()

  const { data, error: fetchError } = await supabase
    .from('organizations')
    .select('approval_levels')
    .eq('id', user.organization_id)
    .single<{ approval_levels: number }>()

  if (fetchError || !data) {
    return jsonError(
      fetchError?.message || 'Failed to fetch organization settings',
      500
    )
  }

  return NextResponse.json({ approval_levels: data.approval_levels })
}

export async function PUT(request: Request) {
  const { user, error, status } = await requireAdmin()
  if (!user) return jsonError(error ?? 'Unauthorized', status)

  const body = (await request.json()) as {
    approval_levels?: number
  }

  if (typeof body.approval_levels !== 'number') {
    return jsonError('approval_levels must be provided', 400)
  }

  const level = clampApprovalLevel(body.approval_levels)

  const supabase = await createClient()

  const { data, error: updateError } = await supabase
    .from('organizations')
    .update({ approval_levels: level })
    .eq('id', user.organization_id)
    .select('approval_levels')
    .single<{ approval_levels: number }>()

  if (updateError || !data) {
    return jsonError(
      updateError?.message || 'Failed to update approval levels',
      500
    )
  }

  // 組織の承認レベルより高いユーザーを自動的に調整
  const { error: userUpdateError } = await supabase
    .from('users')
    .update({ approval_level: level })
    .gt('approval_level', level)
    .eq('organization_id', user.organization_id)

  if (userUpdateError) {
    console.error('Failed to normalize user approval levels', userUpdateError)
  }

  return NextResponse.json({ approval_levels: data.approval_levels })
}
